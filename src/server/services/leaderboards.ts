import { Prisma } from "@prisma/client";
import { parisDayRange } from "@/lib/dates";
import { prisma } from "@/server/db";
import { rankDelta, rankLeaderboard, type LeaderboardInput } from "@/server/domain/leaderboard";

export type LeaderboardPeriod =
  | { type: "season" }
  | { type: "month"; start: Date; end: Date }
  | { type: "round"; competitionId: string; seasonId: string; round: number };

export type LeaderboardQuery = {
  period: LeaderboardPeriod;
  leagueId?: string;
  /** Ne compter que les matchs commencés avant cette date (calcul de la variation). */
  kickoffBefore?: Date;
};

export type LeaderboardRow = {
  userId: string;
  rank: number;
  points: number;
  exact: number;
  won: number;
  predictions: number;
  delta: number | null;
  user: { username: string; name: string | null; avatarUrl: string | null; image: string | null };
};

async function aggregate({ period, leagueId, kickoffBefore }: LeaderboardQuery): Promise<LeaderboardInput[]> {
  const conditions: Prisma.Sql[] = [];
  if (period.type === "month")
    conditions.push(Prisma.sql`m."kickoffAt" >= ${period.start} AND m."kickoffAt" < ${period.end}`);
  if (period.type === "round") {
    conditions.push(
      Prisma.sql`m."competitionId" = ${period.competitionId} AND m."seasonId" = ${period.seasonId} AND m."round" = ${period.round}`,
    );
  }
  if (kickoffBefore) conditions.push(Prisma.sql`m."kickoffAt" < ${kickoffBefore}`);
  const extra = conditions.length ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  const leagueFilter = leagueId
    ? Prisma.sql`AND u.id IN (SELECT lm."userId" FROM "LeagueMember" lm WHERE lm."leagueId" = ${leagueId})`
    : Prisma.empty;
  // Hors ligue, seuls les joueurs ayant au moins un pronostic noté sur la période apparaissent.
  const having = leagueId ? Prisma.empty : Prisma.sql`HAVING COUNT(pm.id) > 0`;

  const rows = await prisma.$queryRaw<
    { userId: string; joinedAt: Date; points: number; exact: number; won: number; predictions: number }[]
  >`
    SELECT u.id AS "userId", u."createdAt" AS "joinedAt",
      COALESCE(SUM(pm.points), 0)::int AS points,
      (COUNT(pm.id) FILTER (WHERE pm.state = 'EXACT'))::int AS exact,
      (COUNT(pm.id) FILTER (WHERE pm.state IN ('WON', 'EXACT')))::int AS won,
      (COUNT(pm.id) FILTER (WHERE pm.state <> 'VOID'))::int AS predictions
    FROM "User" u
    LEFT JOIN (
      SELECT p.id, p."userId", p.points, p.state
      FROM "Prediction" p
      JOIN "Match" m ON m.id = p."matchId"
      WHERE p."scoredAt" IS NOT NULL ${extra}
    ) pm ON pm."userId" = u.id
    WHERE u."onboardedAt" IS NOT NULL AND u."disabledAt" IS NULL AND u.username IS NOT NULL ${leagueFilter}
    GROUP BY u.id
    ${having}`;
  return rows;
}

/** Classement avec variation de rang par rapport à la veille (matchs commencés avant aujourd'hui, Paris). */
export async function getLeaderboard(
  query: LeaderboardQuery,
  now: Date = new Date(),
): Promise<LeaderboardRow[]> {
  const current = rankLeaderboard(await aggregate(query));
  let previous = new Map<string, number>();
  if (query.period.type !== "round") {
    // Classement tel qu'il était avant les matchs du jour (heure de Paris).
    const before = rankLeaderboard(await aggregate({ ...query, kickoffBefore: parisDayRange(now).start }));
    previous = new Map(before.filter((e) => e.predictions > 0).map((e) => [e.userId, e.rank]));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: current.map((c) => c.userId) } },
    select: { id: true, username: true, name: true, avatarUrl: true, image: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return current.map((e) => {
    const u = byId.get(e.userId)!;
    return {
      userId: e.userId,
      rank: e.rank,
      points: e.points,
      exact: e.exact,
      won: e.won,
      predictions: e.predictions,
      delta: rankDelta(e.rank, previous.get(e.userId)),
      user: { username: u.username ?? "joueur", name: u.name, avatarUrl: u.avatarUrl, image: u.image },
    };
  });
}

/** Vainqueur du classement général d'un mois (au moins un point). */
export async function monthlyWinner(start: Date, end: Date) {
  const ranked = rankLeaderboard(await aggregate({ period: { type: "month", start, end } }));
  const first = ranked[0];
  return first && first.points > 0 ? first : null;
}

/** Rang d'un utilisateur dans le classement général de la saison. */
export async function userGeneralRank(userId: string) {
  const ranked = rankLeaderboard(await aggregate({ period: { type: "season" } }));
  const entry = ranked.find((r) => r.userId === userId);
  return { rank: entry?.rank ?? null, total: ranked.length, points: entry?.points ?? 0 };
}
