import type { MatchStatus } from "@prisma/client";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  CL_KNOCKOUT_ROUNDS,
  COMPETITIONS,
  competitionByApiFootballId,
  roundLabel,
  type CompetitionCode,
} from "./competitions";
import { TTL, cached } from "./cache";
import { getJson } from "./http";
import {
  ProviderError,
  type FootballProvider,
  type HeadToHead,
  type Lineups,
  type MatchEvent,
  type ProviderFixture,
  type ProviderStanding,
  type TeamLineup,
} from "./types";

const BASE = "https://v3.football.api-sports.io";
const NAME = "api-football" as const;

/* --------------------------------- Schémas -------------------------------- */

const nullableInt = z
  .number()
  .int()
  .nullable()
  .optional()
  .transform((v) => v ?? null);
const scorePair = z.object({ home: nullableInt, away: nullableInt }).optional();
const teamRef = z.object({ id: z.number().int(), name: z.string(), logo: z.string().nullable().optional() });

const fixtureSchema = z.object({
  fixture: z.object({
    id: z.number().int(),
    referee: z.string().nullable().optional(),
    date: z.string(),
    venue: z.object({ name: z.string().nullable().optional() }).optional(),
    status: z.object({ short: z.string(), elapsed: nullableInt, extra: nullableInt }),
  }),
  league: z.object({ id: z.number().int(), season: z.number().int(), round: z.string() }),
  teams: z.object({ home: teamRef, away: teamRef }),
  goals: z.object({ home: nullableInt, away: nullableInt }),
  score: z.object({ halftime: scorePair, fulltime: scorePair }),
  events: z
    .array(
      z.object({
        time: z.object({ elapsed: z.number().int().nullable(), extra: nullableInt }),
        team: z.object({ id: z.number().int() }),
        player: z.object({ name: z.string().nullable() }),
        assist: z.object({ name: z.string().nullable() }).optional(),
        type: z.string(),
        detail: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

const envelope = <T extends z.ZodType>(item: T) =>
  z.object({
    errors: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
    response: z.array(item),
  });

const standingSchema = z.object({
  league: z.object({
    standings: z.array(
      z.array(
        z.object({
          rank: z.number().int(),
          team: teamRef,
          points: z.number().int(),
          form: z.string().nullable().optional(),
          all: z.object({
            played: z.number().int(),
            win: z.number().int(),
            draw: z.number().int(),
            lose: z.number().int(),
            goals: z.object({ for: z.number().int(), against: z.number().int() }),
          }),
        }),
      ),
    ),
  }),
});

const lineupSchema = z.object({
  team: z.object({ id: z.number().int() }),
  formation: z.string().nullable().optional(),
  coach: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  startXI: z.array(
    z.object({
      player: z.object({ name: z.string(), number: nullableInt, pos: z.string().nullable().optional() }),
    }),
  ),
  substitutes: z.array(
    z.object({
      player: z.object({ name: z.string(), number: nullableInt, pos: z.string().nullable().optional() }),
    }),
  ),
});

/* -------------------------------- Mappings -------------------------------- */

const STATUS: Record<string, MatchStatus> = {
  TBD: "SCHEDULED",
  NS: "SCHEDULED",
  "1H": "LIVE",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  LIVE: "LIVE",
  INT: "LIVE",
  SUSP: "LIVE",
  HT: "HALFTIME",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  AWD: "FINISHED",
  WO: "FINISHED",
};

export function mapApiFootballStatus(short: string): MatchStatus {
  return STATUS[short] ?? "SCHEDULED";
}

/** « Regular Season - 7 » → 7 ; « League Stage - 3 » → 3 ; « Round of 16 » → 10. */
export function parseApiFootballRound(code: CompetitionCode, label: string): number {
  const numbered = /-\s*(\d+)\s*$/.exec(label);
  const lower = label.toLowerCase();
  if (code === "CL") {
    if (lower.startsWith("league stage") && numbered) return Number(numbered[1]);
    const ko = CL_KNOCKOUT_ROUNDS.find((r) => r.apiFootball.some((k) => lower.startsWith(k)));
    if (ko) return ko.round;
  }
  if (numbered) return Number(numbered[1]);
  throw new ProviderError(NAME, `journée inconnue « ${label} »`);
}

function mapEvents(raw: z.infer<typeof fixtureSchema>): MatchEvent[] | null {
  if (!raw.events) return null;
  const events: MatchEvent[] = [];
  for (const e of raw.events) {
    if (e.time.elapsed == null || !e.player.name) continue;
    const side = e.team.id === raw.teams.home.id ? "home" : "away";
    const detail = (e.detail ?? "").toLowerCase();
    let type: MatchEvent["type"] | null = null;
    if (e.type === "Goal") {
      if (detail.includes("missed")) continue;
      type = detail.includes("own") ? "OWN_GOAL" : detail.includes("penalty") ? "PENALTY" : "GOAL";
    } else if (e.type === "Card") {
      type = detail.includes("red") || detail.includes("second") ? "RED" : "YELLOW";
    }
    if (!type) continue;
    events.push({
      minute: e.time.elapsed,
      extra: e.time.extra,
      type,
      side,
      player: e.player.name,
      assist: e.assist?.name ?? null,
    });
  }
  return events;
}

export function mapApiFootballFixture(raw: z.infer<typeof fixtureSchema>): ProviderFixture | null {
  const comp = competitionByApiFootballId(raw.league.id);
  if (!comp) return null;
  const status = mapApiFootballStatus(raw.fixture.status.short);
  const round = parseApiFootballRound(comp.code, raw.league.round);
  // Temps réglementaire : score.fulltime après prolongation / tirs au but, sinon buts courants.
  const regular = ["AET", "PEN"].includes(raw.fixture.status.short) ? raw.score.fulltime : raw.goals;
  const started = status !== "SCHEDULED" && status !== "POSTPONED" && status !== "CANCELLED";
  return {
    provider: NAME,
    externalId: raw.fixture.id,
    competitionCode: comp.code,
    season: raw.league.season,
    round,
    roundLabel: roundLabel(comp.code, round),
    kickoffAt: new Date(raw.fixture.date),
    status,
    minute: status === "LIVE" ? raw.fixture.status.elapsed : null,
    home: { externalId: raw.teams.home.id, name: raw.teams.home.name, crestUrl: raw.teams.home.logo ?? null },
    away: { externalId: raw.teams.away.id, name: raw.teams.away.name, crestUrl: raw.teams.away.logo ?? null },
    homeScore: started ? (regular?.home ?? null) : null,
    awayScore: started ? (regular?.away ?? null) : null,
    htHome: raw.score.halftime?.home ?? null,
    htAway: raw.score.halftime?.away ?? null,
    venue: raw.fixture.venue?.name ?? null,
    referee: raw.fixture.referee ?? null,
    events: mapEvents(raw),
  };
}

function mapLineup(raw: z.infer<typeof lineupSchema>): TeamLineup {
  const player = (p: { player: { name: string; number: number | null; pos?: string | null } }) => ({
    name: p.player.name,
    number: p.player.number,
    position: p.player.pos ?? null,
  });
  return {
    formation: raw.formation ?? null,
    coach: raw.coach?.name ?? null,
    startXI: raw.startXI.map(player),
    substitutes: raw.substitutes.map(player),
  };
}

/* -------------------------------- Provider -------------------------------- */

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function request<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>[]> {
  const key = env().API_FOOTBALL_KEY;
  if (!key) throw new ProviderError(NAME, "clé API_FOOTBALL_KEY absente");
  const json = await getJson(NAME, `${BASE}${path}`, { "x-apisports-key": key });
  const parsed = envelope(schema).safeParse(json);
  if (!parsed.success) throw new ProviderError(NAME, `réponse inattendue pour ${path}`);
  const errors = parsed.data.errors;
  if (errors && (Array.isArray(errors) ? errors.length : Object.keys(errors).length)) {
    throw new ProviderError(NAME, `erreur API : ${JSON.stringify(errors)}`);
  }
  return parsed.data.response;
}

export const apiFootball: FootballProvider = {
  name: NAME,
  isConfigured: () => Boolean(env().API_FOOTBALL_KEY),

  async fixtures(code, season, from, to, options) {
    const league = COMPETITIONS[code].apiFootballId;
    const path = `/fixtures?league=${league}&season=${season}&from=${ymd(from)}&to=${ymd(to)}&timezone=UTC`;
    const raw = await cached(NAME, path, options?.ttlMs ?? TTL.fixtures, () => request(path, fixtureSchema));
    return raw
      .map((r) => mapApiFootballFixture(fixtureSchema.parse(r)))
      .filter((f): f is ProviderFixture => f !== null);
  },

  async live(codes) {
    const ids = codes.map((c) => COMPETITIONS[c].apiFootballId).join("-");
    const path = `/fixtures?live=${ids}&timezone=UTC`;
    const raw = await cached(NAME, path, TTL.live, () => request(path, fixtureSchema));
    return raw
      .map((r) => mapApiFootballFixture(fixtureSchema.parse(r)))
      .filter((f): f is ProviderFixture => f !== null);
  },

  async standings(code, season) {
    const path = `/standings?league=${COMPETITIONS[code].apiFootballId}&season=${season}`;
    const raw = await cached(NAME, path, TTL.standings, () => request(path, standingSchema));
    const table = raw[0]?.league.standings[0] ?? [];
    return table.map((row): ProviderStanding => ({
      team: { externalId: row.team.id, name: row.team.name, crestUrl: row.team.logo ?? null },
      position: row.rank,
      played: row.all.played,
      won: row.all.win,
      drawn: row.all.draw,
      lost: row.all.lose,
      goalsFor: row.all.goals.for,
      goalsAgainst: row.all.goals.against,
      points: row.points,
      form: row.form ? row.form.slice(-5) : null,
    }));
  },

  async lineups({ apiFootballMatch: fixtureId, apiFootballHome: homeTeamId }): Promise<Lineups | null> {
    if (!fixtureId) throw new ProviderError(NAME, "identifiant de match inconnu");
    const path = `/fixtures/lineups?fixture=${fixtureId}`;
    const raw = await cached(NAME, path, TTL.lineups, () => request(path, lineupSchema));
    if (raw.length < 2) return null;
    const home = raw.find((l) => l.team.id === homeTeamId) ?? raw[0]!;
    const away = raw.find((l) => l !== home)!;
    return { home: mapLineup(home), away: mapLineup(away) };
  },

  async headToHead({ apiFootballHome: homeId, apiFootballAway: awayId }): Promise<HeadToHead> {
    if (!homeId || !awayId) throw new ProviderError(NAME, "identifiants d'équipes inconnus");
    const path = `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5&timezone=UTC`;
    const raw = await cached(NAME, path, TTL.headToHead, () => request(path, fixtureSchema));
    return raw
      .map((r) => fixtureSchema.parse(r))
      .filter((r) => r.goals.home != null && r.goals.away != null)
      .map((r) => ({
        date: r.fixture.date,
        competition: competitionByApiFootballId(r.league.id)?.name ?? null,
        homeName: r.teams.home.name,
        awayName: r.teams.away.name,
        homeScore:
          (["AET", "PEN"].includes(r.fixture.status.short) ? r.score.fulltime?.home : r.goals.home) ?? 0,
        awayScore:
          (["AET", "PEN"].includes(r.fixture.status.short) ? r.score.fulltime?.away : r.goals.away) ?? 0,
      }));
  },
};

export { fixtureSchema as apiFootballFixtureSchema };
