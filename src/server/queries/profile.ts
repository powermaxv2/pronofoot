import "server-only";
import { startOfWeek } from "date-fns";
import { inParis } from "@/lib/dates";
import { prisma } from "@/server/db";
import { BADGES } from "@/server/domain/badges";
import { computeStats } from "@/server/domain/stats";
import { statPredictions } from "@/server/services/badges";
import { userGeneralRank } from "@/server/services/leaderboards";

export type WeeklyPoint = { week: string; points: number; cumulative: number };

/** Profil public d'un joueur (visible par les joueurs connectés). */
export async function getProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      image: true,
      createdAt: true,
      disabledAt: true,
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
      badges: { select: { badgeCode: true, earnedAt: true, seenAt: true, context: true } },
      _count: { select: { leagueMemberships: true } },
    },
  });
  if (!user || user.disabledAt) return null;
  const predictions = await statPredictions(user.id);
  const stats = computeStats(predictions);
  const rank = await userGeneralRank(user.id);

  // Points par semaine (lundi, heure de Paris), cumulés.
  const weeks = new Map<string, number>();
  for (const p of predictions) {
    if (p.state === "PENDING" || p.state === "VOID") continue;
    const key = startOfWeek(inParis(p.kickoffAt), { weekStartsOn: 1 }).toISOString();
    weeks.set(key, (weeks.get(key) ?? 0) + p.points);
  }
  let cumulative = 0;
  const weekly: WeeklyPoint[] = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, points]) => ({ week, points, cumulative: (cumulative += points) }));

  const earned = new Map(user.badges.map((b) => [b.badgeCode, b]));
  const badges = BADGES.map((b) => ({
    ...b,
    earnedAt: earned.get(b.code)?.earnedAt ?? null,
    seen: Boolean(earned.get(b.code)?.seenAt),
    context: earned.get(b.code)?.context ?? null,
  }));
  return { user, stats, rank, weekly, badges };
}

export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
