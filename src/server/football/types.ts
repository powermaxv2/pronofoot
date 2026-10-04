import type { MatchStatus } from "@prisma/client";
import { z } from "zod";
import type { CompetitionCode } from "./competitions";

export type ProviderName = "api-football" | "football-data";

export type ProviderTeam = {
  externalId: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crestUrl: string | null;
};

/* ------------------------- Données stockées en JSON ------------------------ */

export const matchEventSchema = z.object({
  minute: z.number().int().min(0),
  extra: z.number().int().nullable(),
  type: z.enum(["GOAL", "OWN_GOAL", "PENALTY", "YELLOW", "RED"]),
  side: z.enum(["home", "away"]),
  player: z.string(),
  assist: z.string().nullable(),
});
export type MatchEvent = z.infer<typeof matchEventSchema>;
export const matchEventsSchema = z.array(matchEventSchema);

const lineupPlayerSchema = z.object({
  name: z.string(),
  number: z.number().int().nullable(),
  /** G / D / M / F */
  position: z.string().nullable(),
});
export type LineupPlayer = z.infer<typeof lineupPlayerSchema>;

const teamLineupSchema = z.object({
  formation: z.string().nullable(),
  coach: z.string().nullable(),
  startXI: z.array(lineupPlayerSchema),
  substitutes: z.array(lineupPlayerSchema),
});
export type TeamLineup = z.infer<typeof teamLineupSchema>;

export const lineupsSchema = z.object({ home: teamLineupSchema, away: teamLineupSchema });
export type Lineups = z.infer<typeof lineupsSchema>;

export const headToHeadSchema = z.array(
  z.object({
    date: z.string(),
    competition: z.string().nullable(),
    homeName: z.string(),
    awayName: z.string(),
    homeScore: z.number().int(),
    awayScore: z.number().int(),
  }),
);
export type HeadToHead = z.infer<typeof headToHeadSchema>;

/* --------------------------- Données normalisées --------------------------- */

export type ProviderFixture = {
  provider: ProviderName;
  externalId: number;
  competitionCode: CompetitionCode;
  season: number;
  round: number;
  roundLabel: string;
  kickoffAt: Date;
  status: MatchStatus;
  minute: number | null;
  home: ProviderTeam;
  away: ProviderTeam;
  /** Score au temps réglementaire (ou score courant pendant le match). */
  homeScore: number | null;
  awayScore: number | null;
  htHome: number | null;
  htAway: number | null;
  venue: string | null;
  referee: string | null;
  events: MatchEvent[] | null;
};

export type ProviderStanding = {
  team: ProviderTeam;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
};

export interface FootballProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  fixtures(
    code: CompetitionCode,
    season: number,
    from: Date,
    to: Date,
    options?: { ttlMs?: number },
  ): Promise<ProviderFixture[]>;
  live(codes: readonly CompetitionCode[]): Promise<ProviderFixture[]>;
  standings(code: CompetitionCode, season: number): Promise<ProviderStanding[]>;
  lineups(ids: {
    apiFootballMatch?: number | null;
    apiFootballHome?: number | null;
  }): Promise<Lineups | null>;
  headToHead(ids: {
    apiFootballHome?: number | null;
    apiFootballAway?: number | null;
    footballDataMatch?: number | null;
  }): Promise<HeadToHead>;
}

export class ProviderError extends Error {
  constructor(
    readonly provider: ProviderName,
    message: string,
    readonly retryable = false,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

export class QuotaExceededError extends ProviderError {
  constructor(provider: ProviderName, detail: string) {
    super(provider, `quota atteint (${detail})`, false);
    this.name = "QuotaExceededError";
  }
}
