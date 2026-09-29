import "server-only";
import type { MatchStatus, Outcome, Prisma, PredictionState } from "@prisma/client";
import { parisDayKey, parisDayRange } from "@/lib/dates";
import { prisma } from "@/server/db";
import { isLocked } from "@/server/domain/locking";
import { crowdDistribution } from "@/server/domain/scoring";
import { LIVE_WINDOW } from "@/server/football/live";
import { headToHeadSchema, lineupsSchema, matchEventsSchema, type HeadToHead } from "@/server/football/types";

export type MatchTab = "upcoming" | "live" | "finished";

const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  tla: true,
  crestUrl: true,
  primaryColor: true,
  secondaryColor: true,
} satisfies Prisma.TeamSelect;

export const cardSelect = (userId: string) =>
  ({
    id: true,
    kickoffAt: true,
    status: true,
    minute: true,
    round: true,
    roundLabel: true,
    homeScore: true,
    awayScore: true,
    competition: { select: { code: true, name: true, shortName: true, color: true } },
    homeTeam: { select: teamSelect },
    awayTeam: { select: teamSelect },
    predictions: {
      where: { userId },
      select: {
        outcome: true,
        homeScore: true,
        awayScore: true,
        isJoker: true,
        state: true,
        points: true,
        seenAt: true,
      },
      take: 1,
    },
  }) satisfies Prisma.MatchSelect;

type RawCard = Prisma.MatchGetPayload<{ select: ReturnType<typeof cardSelect> }>;

export type MatchCardData = Omit<RawCard, "predictions"> & {
  prediction: {
    outcome: Outcome;
    homeScore: number | null;
    awayScore: number | null;
    isJoker: boolean;
    state: PredictionState;
    points: number;
    seenAt: Date | null;
  } | null;
};

export const toCard = ({ predictions, ...rest }: RawCard): MatchCardData => ({
  ...rest,
  prediction: predictions[0] ?? null,
});

export const LIVE_STATUSES: MatchStatus[] = ["LIVE", "HALFTIME"];

/** Liste des matchs selon l'onglet, les compétitions et le jour (Paris). */
export async function listMatches({
  tab,
  competitions,
  day,
  userId,
  now = new Date(),
}: {
  tab: MatchTab;
  competitions: string[];
  day?: string | null;
  userId: string;
  now?: Date;
}): Promise<MatchCardData[]> {
  const where: Prisma.MatchWhereInput = competitions.length
    ? { competition: { code: { in: competitions } } }
    : {};
  const range = day ? parisDayRange(new Date(`${day}T12:00:00Z`)) : null;
  if (tab === "live") {
    Object.assign(where, { status: { in: LIVE_STATUSES } });
  } else if (tab === "upcoming") {
    Object.assign(where, {
      status: { in: ["SCHEDULED", "POSTPONED"] as MatchStatus[] },
      kickoffAt: range
        ? { gte: range.start, lt: range.end }
        : { gte: new Date(now.getTime() - 3 * 3600_000), lt: new Date(now.getTime() + 21 * 86_400_000) },
    });
  } else {
    Object.assign(where, {
      status: { in: ["FINISHED", "CANCELLED"] as MatchStatus[] },
      kickoffAt: range
        ? { gte: range.start, lt: range.end }
        : { gte: new Date(now.getTime() - 21 * 86_400_000), lte: now },
    });
  }
  const rows = await prisma.match.findMany({
    where,
    select: cardSelect(userId),
    orderBy: { kickoffAt: tab === "finished" ? "desc" : "asc" },
    take: 80,
  });
  return rows.map(toCard);
}

/** Nombre de matchs par jour (bandeau de dates). */
export async function matchDays({
  tab,
  competitions,
  now = new Date(),
}: {
  tab: MatchTab;
  competitions: string[];
  now?: Date;
}) {
  if (tab === "live") return [];
  const from =
    tab === "upcoming" ? new Date(now.getTime() - 3 * 3600_000) : new Date(now.getTime() - 21 * 86_400_000);
  const to = tab === "upcoming" ? new Date(now.getTime() + 21 * 86_400_000) : now;
  const rows = await prisma.match.findMany({
    where: {
      kickoffAt: { gte: from, lte: to },
      status: tab === "upcoming" ? { in: ["SCHEDULED", "POSTPONED"] } : { in: ["FINISHED", "CANCELLED"] },
      ...(competitions.length ? { competition: { code: { in: competitions } } } : {}),
    },
    select: { kickoffAt: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(parisDayKey(r.kickoffAt), (counts.get(parisDayKey(r.kickoffAt)) ?? 0) + 1);
  const days = [...counts.entries()].map(([dayKey, count]) => ({ day: dayKey, count }));
  return days.sort((a, b) => (tab === "upcoming" ? a.day.localeCompare(b.day) : b.day.localeCompare(a.day)));
}

/** Nombre de matchs en direct (badge de l'onglet). */
export async function liveCount() {
  return prisma.match.count({ where: { status: { in: LIVE_STATUSES } } });
}

/** Matchs à pronostiquer pour le tableau de bord (48 h). */
export async function upcomingForUser(userId: string, now = new Date(), hours = 48) {
  const rows = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoffAt: { gt: now, lt: new Date(now.getTime() + hours * 3600_000) } },
    select: cardSelect(userId),
    orderBy: { kickoffAt: "asc" },
    take: 40,
  });
  return rows.map(toCard);
}

/** Matchs dans leur fenêtre de direct (pour le polling). */
export async function liveWindowMatches(userId: string, now = new Date()) {
  const rows = await prisma.match.findMany({
    where: {
      OR: [
        { status: { in: LIVE_STATUSES } },
        {
          status: "SCHEDULED",
          kickoffAt: {
            gte: new Date(now.getTime() - LIVE_WINDOW.after),
            lte: new Date(now.getTime() + LIVE_WINDOW.before),
          },
        },
      ],
    },
    select: cardSelect(userId),
    orderBy: { kickoffAt: "asc" },
    take: 60,
  });
  return rows.map(toCard);
}

/* ------------------------------------------------------------------------ */
/*                                   Détail                                  */
/* ------------------------------------------------------------------------ */

export type FormResult = {
  matchId: string;
  result: "W" | "D" | "L";
  opponent: string;
  score: string;
  home: boolean;
  kickoffAt: Date;
};

async function recentForm(teamId: string, before: Date): Promise<FormResult[]> {
  const rows = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      kickoffAt: { lt: before },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { kickoffAt: "desc" },
    take: 5,
    select: {
      id: true,
      kickoffAt: true,
      homeTeamId: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
    },
  });
  return rows
    .map((m) => {
      const home = m.homeTeamId === teamId;
      const gf = (home ? m.homeScore : m.awayScore) ?? 0;
      const ga = (home ? m.awayScore : m.homeScore) ?? 0;
      return {
        matchId: m.id,
        result: gf > ga ? ("W" as const) : gf < ga ? ("L" as const) : ("D" as const),
        opponent: home ? m.awayTeam.shortName : m.homeTeam.shortName,
        score: `${m.homeScore}-${m.awayScore}`,
        home,
        kickoffAt: m.kickoffAt,
      };
    })
    .reverse();
}

/** Face-à-face : données du fournisseur si disponibles, sinon confrontations présentes en base. */
async function headToHead(match: {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: Date;
  headToHead: Prisma.JsonValue;
}): Promise<{
  source: "api" | "base";
  meetings: HeadToHead;
}> {
  const parsed = headToHeadSchema.safeParse(match.headToHead);
  if (parsed.success && parsed.data.length) return { source: "api", meetings: parsed.data };
  const rows = await prisma.match.findMany({
    where: {
      id: { not: match.id },
      status: "FINISHED",
      kickoffAt: { lt: match.kickoffAt },
      OR: [
        { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
        { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
      ],
    },
    orderBy: { kickoffAt: "desc" },
    take: 5,
    select: {
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      competition: { select: { name: true } },
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
    },
  });
  return {
    source: "base",
    meetings: rows.map((r) => ({
      date: r.kickoffAt.toISOString(),
      competition: r.competition.name,
      homeName: r.homeTeam.shortName,
      awayName: r.awayTeam.shortName,
      homeScore: r.homeScore ?? 0,
      awayScore: r.awayScore ?? 0,
    })),
  };
}

export async function getMatchDetail(id: string, userId: string, now = new Date()) {
  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      ...cardSelect(userId),
      competitionId: true,
      seasonId: true,
      homeTeamId: true,
      awayTeamId: true,
      htHome: true,
      htAway: true,
      venue: true,
      referee: true,
      lineups: true,
      events: true,
      headToHead: true,
      scoredAt: true,
      lastSyncedAt: true,
      competition: { select: { code: true, name: true, shortName: true, color: true } },
    },
  });
  if (!match) return null;
  const card = toCard(match);

  const [homeForm, awayForm, h2h, standings, jokerUsed, community] = await Promise.all([
    recentForm(match.homeTeamId, match.kickoffAt),
    recentForm(match.awayTeamId, match.kickoffAt),
    headToHead(match),
    prisma.standing.findMany({
      where: { seasonId: match.seasonId },
      orderBy: { position: "asc" },
      select: {
        position: true,
        played: true,
        won: true,
        drawn: true,
        lost: true,
        goalsFor: true,
        goalsAgainst: true,
        points: true,
        form: true,
        team: { select: teamSelect },
      },
    }),
    // Joker déjà posé sur un autre match de la même journée ?
    prisma.prediction.findFirst({
      where: {
        userId,
        isJoker: true,
        matchId: { not: match.id },
        match: { competitionId: match.competitionId, seasonId: match.seasonId, round: match.round },
      },
      select: {
        match: {
          select: {
            id: true,
            homeTeam: { select: { shortName: true } },
            awayTeam: { select: { shortName: true } },
            kickoffAt: true,
            status: true,
          },
        },
      },
    }),
    communityStats(match.id, { kickoffAt: match.kickoffAt, status: match.status }, now),
  ]);

  const lineups = lineupsSchema.safeParse(match.lineups);
  const events = matchEventsSchema.safeParse(match.events);
  return {
    ...card,
    competitionId: match.competitionId,
    seasonId: match.seasonId,
    htHome: match.htHome,
    htAway: match.htAway,
    venue: match.venue,
    referee: match.referee,
    lineups: lineups.success ? lineups.data : null,
    events: events.success ? events.data : null,
    homeForm,
    awayForm,
    headToHead: h2h,
    standings,
    otherJoker: jokerUsed?.match ?? null,
    community,
    locked: isLocked({ kickoffAt: match.kickoffAt, status: match.status }, now),
  };
}

export type MatchDetail = NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>;

/**
 * Répartition de la communauté : visible uniquement après le verrouillage
 * (sinon elle influencerait les pronostics).
 */
export async function communityStats(
  matchId: string,
  match: { kickoffAt: Date; status: MatchStatus },
  now = new Date(),
) {
  if (!isLocked(match, now)) return null;
  const predictions = await prisma.prediction.findMany({
    where: { matchId, state: { not: "VOID" } },
    select: { outcome: true, homeScore: true, awayScore: true },
  });
  const scores = new Map<string, number>();
  for (const p of predictions) {
    if (p.homeScore == null || p.awayScore == null) continue;
    const key = `${p.homeScore}-${p.awayScore}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
  }
  const withScore = [...scores.values()].reduce((a, b) => a + b, 0);
  return {
    total: predictions.length,
    distribution: crowdDistribution(predictions.map((p) => p.outcome)),
    topScores: [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([score, count]) => ({ score, share: withScore ? count / withScore : 0 })),
  };
}
