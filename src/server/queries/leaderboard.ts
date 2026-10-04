import "server-only";
import { formatMonth, parisMonthKey, parisMonthRange } from "@/lib/dates";
import { prisma } from "@/server/db";
import { COMPETITIONS, isCompetitionCode, type CompetitionCode } from "@/server/football/competitions";
import { getLeaderboard, type LeaderboardQuery, type LeaderboardRow } from "@/server/services/leaderboards";

export type PeriodParam = "saison" | "mois" | "journee";

export type LeaderboardParams = {
  periode?: string | null;
  mois?: string | null;
  comp?: string | null;
  journee?: string | null;
};

export type LeaderboardView = {
  period: PeriodParam;
  month: { key: string; label: string; prev: string | null; next: string | null } | null;
  round: {
    competition: CompetitionCode;
    competitionName: string;
    round: number;
    label: string;
    min: number;
    max: number;
  } | null;
  rows: LeaderboardRow[];
};

const monthDate = (key: string) => new Date(`${key}-15T12:00:00Z`);
const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Résout les paramètres d'URL d'un classement et calcule les lignes. */
export async function resolveLeaderboard(
  params: LeaderboardParams,
  { leagueId, favoriteCode, now = new Date() }: { leagueId?: string; favoriteCode?: string; now?: Date } = {},
): Promise<LeaderboardView> {
  const period: PeriodParam =
    params.periode === "mois" || params.periode === "journee" ? params.periode : "saison";
  let query: LeaderboardQuery = { period: { type: "season" }, leagueId };
  let month: LeaderboardView["month"] = null;
  let round: LeaderboardView["round"] = null;

  if (period === "mois") {
    const current = parisMonthKey(now);
    const key =
      params.mois && /^\d{4}-\d{2}$/.test(params.mois) && params.mois <= current ? params.mois : current;
    const range = parisMonthRange(monthDate(key));
    query = { period: { type: "month", start: range.start, end: range.end }, leagueId };
    const first = await prisma.match.findFirst({
      where: { scoredAt: { not: null } },
      orderBy: { kickoffAt: "asc" },
      select: { kickoffAt: true },
    });
    const firstKey = first ? parisMonthKey(first.kickoffAt) : key;
    month = {
      key,
      label: formatMonth(range.start),
      prev: key > firstKey ? shiftMonth(key, -1) : null,
      next: key < current ? shiftMonth(key, 1) : null,
    };
  }

  if (period === "journee") {
    const code: CompetitionCode =
      params.comp && isCompetitionCode(params.comp)
        ? params.comp
        : favoriteCode && isCompetitionCode(favoriteCode)
          ? favoriteCode
          : "FL1";
    const competition = await prisma.competition.findUnique({
      where: { code },
      select: { id: true, name: true, currentSeasonId: true },
    });
    if (competition?.currentSeasonId) {
      const [lastScored, bounds] = await Promise.all([
        prisma.match.findFirst({
          where: { seasonId: competition.currentSeasonId, scoredAt: { not: null } },
          orderBy: { round: "desc" },
          select: { round: true },
        }),
        prisma.match.aggregate({
          where: { seasonId: competition.currentSeasonId },
          _min: { round: true },
          _max: { round: true },
        }),
      ]);
      const min = bounds._min.round ?? 1;
      const max = bounds._max.round ?? COMPETITIONS[code].rounds;
      const requested = Number(params.journee);
      const value =
        Number.isInteger(requested) && requested >= min && requested <= max
          ? requested
          : (lastScored?.round ?? min);
      const sample = await prisma.match.findFirst({
        where: { seasonId: competition.currentSeasonId, round: value },
        select: { roundLabel: true },
      });
      round = {
        competition: code,
        competitionName: competition.name,
        round: value,
        label: sample?.roundLabel ?? `Journée ${value}`,
        min,
        max,
      };
      query = {
        period: {
          type: "round",
          competitionId: competition.id,
          seasonId: competition.currentSeasonId,
          round: value,
        },
        leagueId,
      };
    }
  }

  return { period, month, round, rows: await getLeaderboard(query, now) };
}
