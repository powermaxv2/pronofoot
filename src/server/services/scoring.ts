import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { crowdDistribution, isScorable, isVoided, scorePrediction } from "@/server/domain/scoring";
import { OUTCOME_LABEL } from "@/server/domain/outcome";
import { notify } from "@/server/notifications";
import { awardPredictionBadges } from "./badges";

/** En dessous de ce nombre de pronostics, la part de la communauté n'est pas figée (badge Contre-pied). */
export const CROWD_MIN_PREDICTIONS = 5;
/** Les notifications « résultat » ne concernent que les matchs terminés récemment. */
const RESULT_NOTIFICATION_WINDOW_MS = 48 * 3600_000;

export type ScoreMatchResult = { matchId: string; predictions: number; voided: boolean; userIds: string[] };

/**
 * Distribue les points d'un match terminé (ou annule les pronostics d'un match
 * reporté/annulé). Idempotent : un match déjà noté (`scoredAt`) est ignoré,
 * sauf avec `force` (recalcul admin).
 */
export async function scoreMatch(
  matchId: string,
  { force = false, now = new Date() } = {},
): Promise<ScoreMatchResult | null> {
  return prisma.$transaction(async (tx) => {
    // Verrou de ligne : deux calculs simultanés du même match sont sérialisés.
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, homeScore: true, awayScore: true, scoredAt: true },
    });
    if (!match || (match.scoredAt && !force)) return null;
    const voided = isVoided(match);
    if (!voided && !isScorable(match)) return null;

    const predictions = await tx.prediction.findMany({ where: { matchId } });
    const distribution = crowdDistribution(predictions.map((p) => p.outcome));
    const withCrowd = predictions.length >= CROWD_MIN_PREDICTIONS;

    for (const p of predictions) {
      const result = scorePrediction(p, match);
      const data: Prisma.PredictionUpdateInput = {
        state: result.state,
        points: result.points,
        breakdown: result.breakdown,
        crowdShare: withCrowd ? distribution[p.outcome] : null,
        scoredAt: now,
      };
      // Match annulé : le joker est rendu (la clé d'unicité est libérée).
      if (voided) Object.assign(data, { isJoker: false, jokerKey: null });
      await tx.prediction.update({ where: { id: p.id }, data });
    }
    await tx.match.update({ where: { id: matchId }, data: { scoredAt: now } });
    return { matchId, predictions: predictions.length, voided, userIds: predictions.map((p) => p.userId) };
  });
}

/** Notifications « résultat » d'un match noté. */
export async function notifyMatchResults(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
      predictions: {
        select: {
          userId: true,
          state: true,
          points: true,
          isJoker: true,
          outcome: true,
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });
  if (!match) return 0;
  if (Date.now() - match.kickoffAt.getTime() > RESULT_NOTIFICATION_WINDOW_MS + 3 * 3600_000) return 0;
  const title = `${match.homeTeam.shortName} ${match.homeScore ?? "–"}-${match.awayScore ?? "–"} ${match.awayTeam.shortName}`;
  let sent = 0;
  for (const p of match.predictions) {
    const pick = p.homeScore != null ? `${p.homeScore}-${p.awayScore}` : OUTCOME_LABEL[p.outcome];
    const body =
      p.state === "VOID"
        ? "Match reporté ou annulé : votre pronostic est annulé et votre joker rendu."
        : p.state === "EXACT"
          ? `Score exact ! Votre prono ${pick} rapporte ${p.points} points${p.isJoker ? " (joker)" : ""}.`
          : p.state === "WON"
            ? `Bon résultat : votre prono ${pick} rapporte ${p.points} points${p.isJoker ? " (joker)" : ""}.`
            : `Raté : votre prono ${pick} ne rapporte pas de point.`;
    const created = await notify({
      userId: p.userId,
      type: "RESULT",
      title,
      body,
      href: `/matchs/${match.id}`,
      dedupeKey: `result:${p.userId}:${match.id}`,
    });
    if (created) sent += 1;
  }
  return sent;
}

/** Réouvre un match reprogrammé : les pronostics annulés redeviennent modifiables. */
export async function reopenMatch(matchId: string) {
  await prisma.$transaction([
    prisma.prediction.updateMany({
      where: { matchId, state: "VOID" },
      data: { state: "PENDING", points: 0, breakdown: Prisma.DbNull, scoredAt: null, crowdShare: null },
    }),
    prisma.match.update({ where: { id: matchId }, data: { scoredAt: null } }),
  ]);
}

export type ScoreRunStats = {
  matches: number;
  predictions: number;
  voided: number;
  notifications: number;
  badges: number;
};

/** Note tous les matchs terminés (ou annulés) qui ne l'ont pas encore été. */
export async function scorePendingMatches({
  notifyUsers = true,
  now = new Date(),
} = {}): Promise<ScoreRunStats> {
  const pending = await prisma.match.findMany({
    where: { scoredAt: null, status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] } },
    select: { id: true },
    orderBy: { kickoffAt: "asc" },
  });
  const stats: ScoreRunStats = { matches: 0, predictions: 0, voided: 0, notifications: 0, badges: 0 };
  const users = new Set<string>();
  for (const { id } of pending) {
    const result = await scoreMatch(id, { now });
    if (!result) continue;
    stats.matches += 1;
    stats.predictions += result.predictions;
    if (result.voided) stats.voided += 1;
    result.userIds.forEach((u) => users.add(u));
    if (notifyUsers) stats.notifications += await notifyMatchResults(id);
  }
  const awarded = await awardPredictionBadges([...users], { notifyUser: notifyUsers });
  stats.badges = Object.values(awarded).reduce((n, codes) => n + codes.length, 0);
  return stats;
}

/** Recalcul complet (admin) : remet à zéro puis renote tous les matchs terminés. */
export async function recalculateAll({ competitionId }: { competitionId?: string } = {}) {
  const where: Prisma.MatchWhereInput = {
    status: { in: ["FINISHED", "POSTPONED", "CANCELLED"] },
    ...(competitionId ? { competitionId } : {}),
  };
  const matches = await prisma.match.findMany({ where, select: { id: true }, orderBy: { kickoffAt: "asc" } });
  const users = new Set<string>();
  let predictions = 0;
  for (const { id } of matches) {
    const result = await scoreMatch(id, { force: true });
    if (!result) continue;
    predictions += result.predictions;
    result.userIds.forEach((u) => users.add(u));
  }
  await awardPredictionBadges([...users], { notifyUser: false });
  return { matches: matches.length, predictions, users: users.size };
}
