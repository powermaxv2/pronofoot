"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { env } from "@/lib/env";
import { notificationPrefsSchema, profileSchema, usernameSchema, type ProfileInput } from "@/lib/validation";
import { prisma } from "@/server/db";
import { signOut } from "@/server/auth";
import { assertRateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";
import { safeAction, UserFacingError, type ActionResult } from "./result";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

/** Disponibilité d'un pseudo (onboarding, paramètres). */
export async function checkUsername(raw: string): Promise<ActionResult<{ available: boolean }>> {
  return safeAction(async () => {
    const user = await requireUser({ allowIncomplete: true });
    assertRateLimit("read", `username:${user.id}`);
    const username = usernameSchema.parse(raw);
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: user.id } },
      select: { id: true },
    });
    return { available: !taken };
  });
}

async function saveProfile(userId: string, input: ProfileInput) {
  const data = profileSchema.parse(input);
  if (data.favoriteTeamId) {
    const team = await prisma.team.findUnique({ where: { id: data.favoriteTeamId }, select: { id: true } });
    if (!team) throw new UserFacingError("Équipe inconnue.");
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { username: data.username, avatarUrl: data.avatarUrl, favoriteTeamId: data.favoriteTeamId },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new UserFacingError("Ce pseudo est déjà pris.");
    throw error;
  }
}

/** Fin de l'onboarding. */
export async function completeOnboarding(input: ProfileInput): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const user = await requireUser({ allowIncomplete: true });
    assertRateLimit("write", `profile:${user.id}`);
    await saveProfile(user.id, input);
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardedAt: user.onboardedAt ?? new Date() },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Bienvenue sur PronoFoot !",
        body: "Pronostiquez avant le coup d'envoi, posez un joker par journée et invitez vos potes dans une ligue.",
        href: "/matchs",
      },
    });
  });
  if (result.ok) redirect("/accueil?bienvenue=1");
  return result;
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `profile:${user.id}`);
    await saveProfile(user.id, input);
    revalidatePath("/", "layout");
  }, "Profil mis à jour.");
}

export async function updateNotificationPrefs(input: {
  notifyReminders: boolean;
  notifyResults: boolean;
  notifyEmail: boolean;
}): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `prefs:${user.id}`);
    await prisma.user.update({ where: { id: user.id }, data: notificationPrefsSchema.parse(input) });
  }, "Préférences enregistrées.");
}

/** Envoi d'un avatar : redimensionné en WebP 256 px, métadonnées supprimées. */
export async function uploadAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return safeAction(async () => {
    const user = await requireUser({ allowIncomplete: true });
    assertRateLimit("write", `avatar:${user.id}`);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Aucun fichier reçu.");
    if (file.size > MAX_AVATAR_BYTES) throw new UserFacingError("Image trop lourde (4 Mo maximum).");
    if (!/^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/.test(file.type))
      throw new UserFacingError("Format non pris en charge (PNG, JPEG, WebP, GIF, AVIF).");

    let output: Buffer;
    try {
      output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(256, 256, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new UserFacingError("Image illisible.");
    }
    const dir = env().UPLOAD_DIR;
    await mkdir(dir, { recursive: true });
    const name = `${user.id.toLowerCase()}-${Date.now().toString(36)}.webp`;
    await writeFile(join(dir, name), output);
    // Suppression de l'ancien fichier envoyé.
    const previous = user.avatarUrl?.match(/^\/api\/avatars\/([a-z0-9-]+\.webp)$/)?.[1];
    if (previous) await unlink(join(dir, previous)).catch(() => undefined);
    const url = `/api/avatars/${name}`;
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    return { url };
  }, "Avatar enregistré.");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Suppression définitive du compte (pronostics, ligues possédées, notifications). */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const user = await requireUser();
    if (confirmation.trim().toLowerCase() !== (user.username ?? "").toLowerCase()) {
      throw new UserFacingError("Saisissez votre pseudo exact pour confirmer.");
    }
    await prisma.user.delete({ where: { id: user.id } });
  });
  if (result.ok) await signOut({ redirectTo: "/" });
  return result;
}

/** Marque les badges comme vus (l'animation de déblocage ne se joue qu'une fois). */
export async function markBadgesSeen(): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await prisma.userBadge.updateMany({
      where: { userId: user.id, seenAt: null },
      data: { seenAt: new Date() },
    });
  });
}
