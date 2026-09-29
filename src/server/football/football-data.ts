import type { MatchStatus } from "@prisma/client";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  CL_KNOCKOUT_ROUNDS,
  COMPETITIONS,
  isCompetitionCode,
  roundLabel,
  type CompetitionCode,
} from "./competitions";
import { TTL, cached } from "./cache";
import { getJson } from "./http";
import {
  ProviderError,
  type FootballProvider,
  type HeadToHead,
  type ProviderFixture,
  type ProviderStanding,
  type ProviderTeam,
} from "./types";

const BASE = "https://api.football-data.org/v4";
const NAME = "football-data" as const;

/* --------------------------------- Schémas -------------------------------- */

const nullableInt = z
  .number()
  .int()
  .nullable()
  .optional()
  .transform((v) => v ?? null);
const pair = z.object({ home: nullableInt, away: nullableInt }).nullable().optional();
const team = z.object({
  id: z.number().int().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullable().optional(),
  tla: z.string().nullable().optional(),
  crest: z.string().nullable().optional(),
});

const matchSchema = z.object({
  id: z.number().int(),
  utcDate: z.string(),
  status: z.string(),
  minute: z.union([z.number(), z.string()]).nullable().optional(),
  matchday: z.number().int().nullable().optional(),
  stage: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  competition: z.object({ code: z.string() }),
  season: z.object({ startDate: z.string() }),
  homeTeam: team,
  awayTeam: team,
  score: z.object({
    duration: z.string().nullable().optional(),
    fullTime: pair,
    halfTime: pair,
    regularTime: pair,
  }),
  referees: z.array(z.object({ name: z.string(), type: z.string().nullable().optional() })).optional(),
});

const matchesEnvelope = z.object({ matches: z.array(matchSchema) });

const standingsEnvelope = z.object({
  standings: z.array(
    z.object({
      type: z.string(),
      table: z.array(
        z.object({
          position: z.number().int(),
          team,
          playedGames: z.number().int(),
          form: z.string().nullable().optional(),
          won: z.number().int(),
          draw: z.number().int(),
          lost: z.number().int(),
          points: z.number().int(),
          goalsFor: z.number().int(),
          goalsAgainst: z.number().int(),
        }),
      ),
    }),
  ),
});

/* -------------------------------- Mappings -------------------------------- */

const STATUS: Record<string, MatchStatus> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "LIVE",
  LIVE: "LIVE",
  PAUSED: "HALFTIME",
  EXTRA_TIME: "LIVE",
  PENALTY_SHOOTOUT: "LIVE",
  FINISHED: "FINISHED",
  AWARDED: "FINISHED",
  POSTPONED: "POSTPONED",
  SUSPENDED: "POSTPONED",
  CANCELLED: "CANCELLED",
};

export function mapFootballDataStatus(status: string): MatchStatus {
  return STATUS[status] ?? "SCHEDULED";
}

export function footballDataRound(
  code: CompetitionCode,
  matchday: number | null | undefined,
  stage: string | null | undefined,
): number {
  if (code === "CL" && stage && stage !== "LEAGUE_STAGE") {
    const ko = CL_KNOCKOUT_ROUNDS.find((r) => (r.footballData as readonly string[]).includes(stage));
    if (ko) return ko.round;
  }
  if (matchday) return matchday;
  throw new ProviderError(NAME, `journée inconnue (matchday=${matchday}, stage=${stage})`);
}

const toTeam = (t: z.infer<typeof team>): ProviderTeam => {
  if (t.id == null || !t.name) throw new ProviderError(NAME, "équipe non déterminée");
  return {
    externalId: t.id,
    name: t.name,
    shortName: t.shortName ?? null,
    tla: t.tla ?? null,
    crestUrl: t.crest ?? null,
  };
};

export function mapFootballDataMatch(raw: z.infer<typeof matchSchema>): ProviderFixture | null {
  if (!isCompetitionCode(raw.competition.code)) return null;
  // Phases finales dont les équipes ne sont pas encore connues : ignorées.
  if (raw.homeTeam.id == null || raw.awayTeam.id == null) return null;
  const code = raw.competition.code;
  const status = mapFootballDataStatus(raw.status);
  const round = footballDataRound(code, raw.matchday, raw.stage);
  // Temps réglementaire : regularTime si prolongations, sinon fullTime.
  const regular =
    raw.score.duration && raw.score.duration !== "REGULAR" && raw.score.regularTime
      ? raw.score.regularTime
      : raw.score.fullTime;
  const minute =
    typeof raw.minute === "number" ? raw.minute : raw.minute ? Number.parseInt(raw.minute, 10) || null : null;
  return {
    provider: NAME,
    externalId: raw.id,
    competitionCode: code,
    season: Number(raw.season.startDate.slice(0, 4)),
    round,
    roundLabel: roundLabel(code, round),
    kickoffAt: new Date(raw.utcDate),
    status,
    minute: status === "LIVE" ? minute : null,
    home: toTeam(raw.homeTeam),
    away: toTeam(raw.awayTeam),
    homeScore: regular?.home ?? null,
    awayScore: regular?.away ?? null,
    htHome: raw.score.halfTime?.home ?? null,
    htAway: raw.score.halfTime?.away ?? null,
    venue: raw.venue ?? null,
    referee: raw.referees?.find((r) => r.type === "REFEREE")?.name ?? raw.referees?.[0]?.name ?? null,
    events: null,
  };
}

/* -------------------------------- Provider -------------------------------- */

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function request<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const key = env().FOOTBALL_DATA_KEY;
  if (!key) throw new ProviderError(NAME, "clé FOOTBALL_DATA_KEY absente");
  const json = await getJson(NAME, `${BASE}${path}`, { "X-Auth-Token": key });
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ProviderError(NAME, `réponse inattendue pour ${path}`);
  return parsed.data;
}

const mapMatches = (data: z.infer<typeof matchesEnvelope>) =>
  data.matches
    .map((m) => mapFootballDataMatch(matchSchema.parse(m)))
    .filter((f): f is ProviderFixture => f !== null);

export const footballData: FootballProvider = {
  name: NAME,
  isConfigured: () => Boolean(env().FOOTBALL_DATA_KEY),

  async fixtures(code, season, from, to, options) {
    const path = `/competitions/${COMPETITIONS[code].footballDataCode}/matches?season=${season}&dateFrom=${ymd(from)}&dateTo=${ymd(to)}`;
    return mapMatches(
      await cached(NAME, path, options?.ttlMs ?? TTL.fixtures, () => request(path, matchesEnvelope)),
    );
  },

  async live(codes) {
    const comps = codes.map((c) => COMPETITIONS[c].footballDataCode).join(",");
    const path = `/matches?status=LIVE&competitions=${comps}`;
    return mapMatches(await cached(NAME, path, TTL.live, () => request(path, matchesEnvelope)));
  },

  async standings(code, season) {
    const path = `/competitions/${COMPETITIONS[code].footballDataCode}/standings?season=${season}`;
    const data = await cached(NAME, path, TTL.standings, () => request(path, standingsEnvelope));
    const table = data.standings.find((s) => s.type === "TOTAL")?.table ?? [];
    return table.map((row): ProviderStanding => ({
      team: toTeam(row.team),
      position: row.position,
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      points: row.points,
      form: row.form ? row.form.replace(/,/g, "").slice(-5) : null,
    }));
  },

  // Compositions non disponibles sur l'offre gratuite de football-data.org.
  async lineups() {
    return null;
  },

  async headToHead({ footballDataMatch: matchId }): Promise<HeadToHead> {
    if (!matchId) throw new ProviderError(NAME, "identifiant de match inconnu");
    const path = `/matches/${matchId}/head2head?limit=5`;
    const data = await cached(NAME, path, TTL.headToHead, () => request(path, matchesEnvelope));
    return data.matches
      .map((m) => matchSchema.parse(m))
      .filter((m) => m.status === "FINISHED" && m.homeTeam.name && m.awayTeam.name)
      .map((m) => {
        const regular =
          m.score.duration && m.score.duration !== "REGULAR" && m.score.regularTime
            ? m.score.regularTime
            : m.score.fullTime;
        return {
          date: m.utcDate,
          competition: isCompetitionCode(m.competition.code) ? COMPETITIONS[m.competition.code].name : null,
          homeName: m.homeTeam.shortName ?? m.homeTeam.name!,
          awayName: m.awayTeam.shortName ?? m.awayTeam.name!,
          homeScore: regular?.home ?? 0,
          awayScore: regular?.away ?? 0,
        };
      });
  },
};

export { matchSchema as footballDataMatchSchema };
