import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

/** Utilisateur connecté (lecture fraîche en base, mise en cache pour la requête). */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      favoriteTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          tla: true,
          crestUrl: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
    },
  });
  if (!user || user.disabledAt) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Exige une session ; redirige vers la connexion ou l'onboarding sinon. */
export async function requireUser(
  options: { allowIncomplete?: boolean; callbackUrl?: string } = {},
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user)
    redirect(
      `/connexion${options.callbackUrl ? `?callbackUrl=${encodeURIComponent(options.callbackUrl)}` : ""}`,
    );
  if (!options.allowIncomplete && (!user.onboardedAt || !user.username)) redirect("/bienvenue");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/accueil");
  return user;
}

/** Nom affiché d'un joueur. */
export const displayName = (u: { username: string | null; name: string | null }) =>
  u.username ?? u.name ?? "Joueur";
/** Avatar affiché (choix du joueur, sinon photo Google). */
export const avatarOf = (u: { avatarUrl: string | null; image: string | null }) => u.avatarUrl ?? u.image;
