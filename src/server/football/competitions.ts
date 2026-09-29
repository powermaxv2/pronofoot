/** Référentiel des 6 compétitions suivies. */
export const COMPETITION_CODES = ["FL1", "PL", "PD", "SA", "BL1", "CL"] as const;
export type CompetitionCode = (typeof COMPETITION_CODES)[number];

export type CompetitionConfig = {
  code: CompetitionCode;
  name: string;
  shortName: string;
  country: string;
  color: string;
  apiFootballId: number;
  footballDataCode: string;
  sortOrder: number;
  /** Nombre de clubs (championnat) ou de participants (phase de ligue). */
  teams: number;
  /** Nombre de journées de la phase régulière. */
  rounds: number;
};

export const COMPETITIONS: Record<CompetitionCode, CompetitionConfig> = {
  FL1: {
    code: "FL1",
    name: "Ligue 1",
    shortName: "L1",
    country: "France",
    color: "#3b82f6",
    apiFootballId: 61,
    footballDataCode: "FL1",
    sortOrder: 1,
    teams: 18,
    rounds: 34,
  },
  PL: {
    code: "PL",
    name: "Premier League",
    shortName: "PL",
    country: "Angleterre",
    color: "#a855f7",
    apiFootballId: 39,
    footballDataCode: "PL",
    sortOrder: 2,
    teams: 20,
    rounds: 38,
  },
  PD: {
    code: "PD",
    name: "Liga",
    shortName: "Liga",
    country: "Espagne",
    color: "#f97316",
    apiFootballId: 140,
    footballDataCode: "PD",
    sortOrder: 3,
    teams: 20,
    rounds: 38,
  },
  SA: {
    code: "SA",
    name: "Serie A",
    shortName: "Serie A",
    country: "Italie",
    color: "#0ea5e9",
    apiFootballId: 135,
    footballDataCode: "SA",
    sortOrder: 4,
    teams: 20,
    rounds: 38,
  },
  BL1: {
    code: "BL1",
    name: "Bundesliga",
    shortName: "BuLi",
    country: "Allemagne",
    color: "#ef4444",
    apiFootballId: 78,
    footballDataCode: "BL1",
    sortOrder: 5,
    teams: 18,
    rounds: 34,
  },
  CL: {
    code: "CL",
    name: "Ligue des Champions",
    shortName: "C1",
    country: "Europe",
    color: "#eab308",
    apiFootballId: 2,
    footballDataCode: "CL",
    sortOrder: 6,
    teams: 36,
    rounds: 8,
  },
};

export const isCompetitionCode = (v: string): v is CompetitionCode =>
  (COMPETITION_CODES as readonly string[]).includes(v);

export const competitionByApiFootballId = (id: number) =>
  Object.values(COMPETITIONS).find((c) => c.apiFootballId === id);

/** Phases finales de C1 : numéros de « journée » après la phase de ligue. */
export const CL_KNOCKOUT_ROUNDS = [
  {
    round: 9,
    label: "Barrages",
    apiFootball: ["knockout round play-offs", "play-offs"],
    footballData: ["PLAYOFFS"],
  },
  { round: 10, label: "Huitièmes de finale", apiFootball: ["round of 16"], footballData: ["LAST_16"] },
  { round: 11, label: "Quarts de finale", apiFootball: ["quarter-finals"], footballData: ["QUARTER_FINALS"] },
  { round: 12, label: "Demi-finales", apiFootball: ["semi-finals"], footballData: ["SEMI_FINALS"] },
  { round: 13, label: "Finale", apiFootball: ["final"], footballData: ["FINAL"] },
] as const;

/** Libellé d'une journée. */
export function roundLabel(code: CompetitionCode, round: number): string {
  if (code === "CL") {
    if (round <= 8) return `Phase de ligue · J${round}`;
    return CL_KNOCKOUT_ROUNDS.find((r) => r.round === round)?.label ?? `Tour ${round}`;
  }
  return `Journée ${round}`;
}
