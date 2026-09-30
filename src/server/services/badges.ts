import { prisma } from "@/server/db";
import { BADGES, BADGE_BY_CODE, FOUNDER_MIN_MEMBERS, badgesFromStats } from "@/server/domain/badges";
import { computeStats, type StatPrediction } from "@/server/domain/stats";
import { notify } from "@/server/notifications";

/** Synchronise la table des badges avec le référentiel. */
export async function ensureBadges() {
  await prisma.$transaction(
    BADGES.map((b) =>
      prisma.badge.upsert({
        where: { code: b.code },
        create: b,
        update: {
          name: b.name,
          description: b.description,
          icon: b.icon,
          tier: b.tier,
          sortOrder: b.sortOrder,
        },
      }),
    ),
  );
}

/** Pronostics notés d'un utilisateur au format des statistiques. */
export async function statPredictions(userId: string): Promise<StatPrediction[]> {
  const rows = await prisma.prediction.findMany({
    where: { userId, scoredAt: { not: null } },
    select: {
      state: true,
      points: true,
      isJoker: true,
      crowdShare: true,
      match: { select: { kickoffAt: true, competition: { select: { code: true } } } },
    },
  });
  return rows.map((r) => ({
    state: r.state,
    points: r.points,
    isJoker: r.isJoker,
    crowdShare: r.crowdShare,
    kickoffAt: r.match.kickoffAt,
    competitionCode: r.match.competition.code,
  }));
}

async function grant(
  userId: string,
  codes: string[],
  { notifyUser, context }: { notifyUser: boolean; context?: string },
) {
  if (codes.length === 0) return [];
  // Le référentiel peut manquer (base neuve, recalcul admin avant le premier passage du worker).
  if ((await prisma.badge.count()) < BADGES.length) await ensureBadges();
  const existing = await prisma.userBadge.findMany({
    where: { userId, badgeCode: { in: codes } },
    select: { badgeCode: true },
  });
  const owned = new Set(existing.map((e) => e.badgeCode));
  const fresh = codes.filter((c) => !owned.has(c));
  if (fresh.length === 0) return [];
  await prisma.userBadge.createMany({
    data: fresh.map((badgeCode) => ({ userId, badgeCode, context, seenAt: notifyUser ? null : new Date() })),
    skipDuplicates: true,
  });
  if (notifyUser) {
    for (const code of fresh) {
      const badge = BADGE_BY_CODE.get(code)!;
      await notify({
        userId,
        type: "BADGE",
        title: `Badge débloqué : ${badge.name}`,
        body: badge.description,
        href: "/profil",
        dedupeKey: `badge:${userId}:${code}`,
      });
    }
  }
  return fresh;
}

/** Évalue les badges liés aux pronostics pour une liste d'utilisateurs. */
export async function awardPredictionBadges(userIds: readonly string[], { notifyUser = true } = {}) {
  const awarded: Record<string, string[]> = {};
  for (const userId of new Set(userIds)) {
    const stats = computeStats(await statPredictions(userId));
    const fresh = await grant(userId, badgesFromStats(stats), { notifyUser });
    if (fresh.length) awarded[userId] = fresh;
  }
  return awarded;
}

/** Badge « Président de club » : ligue créée avec au moins 3 membres. */
export async function awardFounderBadge(leagueId: string, { notifyUser = true } = {}) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true, name: true, _count: { select: { members: true } } },
  });
  if (!league || league._count.members < FOUNDER_MIN_MEMBERS) return [];
  return grant(league.ownerId, ["FOUNDER"], { notifyUser, context: league.name });
}

/** Badge « Roi du mois » pour le vainqueur d'un mois terminé. */
export async function awardMonthKing(userId: string, monthLabel: string, { notifyUser = true } = {}) {
  return grant(userId, ["MONTH_KING"], { notifyUser, context: monthLabel });
}
