import type { NotificationType } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { emailLayout, escapeHtml, sendEmail } from "./email";
import { sendPush } from "./push";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  /** Empêche les doublons. */
  dedupeKey?: string;
  /** Envoyer aussi push/e-mail selon les préférences (défaut : oui). */
  deliver?: boolean;
};

/**
 * Crée une notification in-app puis la relaie en push et par e-mail
 * selon les préférences de l'utilisateur. Idempotente avec `dedupeKey`.
 * Retourne `false` si la notification existait déjà.
 */
export async function notify(input: NotifyInput): Promise<boolean> {
  const { deliver = true, ...data } = input;
  if (data.dedupeKey) {
    const exists = await prisma.notification.findUnique({
      where: { dedupeKey: data.dedupeKey },
      select: { id: true },
    });
    if (exists) return false;
  }
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        dedupeKey: data.dedupeKey,
      },
    });
  } catch (error) {
    // Course sur la clé de déduplication : déjà créée par un autre processus.
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
  if (!deliver) return true;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { email: true, notifyEmail: true, notifyReminders: true, notifyResults: true, disabledAt: true },
  });
  if (!user || user.disabledAt) return true;
  const wanted =
    (data.type === "REMINDER" && user.notifyReminders) ||
    (data.type === "RESULT" && user.notifyResults) ||
    data.type === "BADGE" ||
    data.type === "LEAGUE";
  if (!wanted) return true;

  const url = data.href ? new URL(data.href, env().APP_URL).toString() : env().APP_URL;
  await Promise.allSettled([
    sendPush(data.userId, { title: data.title, body: data.body, url: data.href ?? "/", tag: data.dedupeKey }),
    user.notifyEmail
      ? sendEmail({
          to: user.email,
          subject: data.title,
          text: `${data.body}\n\n${url}`,
          html: emailLayout({
            title: data.title,
            body: `<p>${escapeHtml(data.body)}</p>`,
            cta: { label: "Ouvrir PronoFoot", url },
          }),
        })
      : Promise.resolve(false),
  ]);
  return true;
}
