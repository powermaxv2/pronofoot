import type { BadgeTier } from "@prisma/client";
import type { UserStats } from "./stats";

export type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  /** Nom d'icône lucide-react. */
  icon: string;
  tier: BadgeTier;
  sortOrder: number;
};

export const ALL_COMPETITION_CODES = ["FL1", "PL", "PD", "SA", "BL1", "CL"] as const;

export const BADGES: readonly BadgeDefinition[] = [
  {
    code: "FIRST_PICK",
    name: "Coup d'envoi",
    description: "Premier pronostic noté.",
    icon: "Flag",
    tier: "BRONZE",
    sortOrder: 1,
  },
  {
    code: "STREAK_5",
    name: "En feu",
    description: "Série de 5 bons résultats d'affilée.",
    icon: "Flame",
    tier: "SILVER",
    sortOrder: 2,
  },
  {
    code: "STREAK_10",
    name: "Inarrêtable",
    description: "Série de 10 bons résultats d'affilée.",
    icon: "Rocket",
    tier: "GOLD",
    sortOrder: 3,
  },
  {
    code: "EXACT_1",
    name: "Dans le mille",
    description: "Premier score exact.",
    icon: "Target",
    tier: "BRONZE",
    sortOrder: 4,
  },
  {
    code: "EXACT_10",
    name: "Sniper",
    description: "10 scores exacts.",
    icon: "Crosshair",
    tier: "SILVER",
    sortOrder: 5,
  },
  {
    code: "EXACT_25",
    name: "Tireur d'élite",
    description: "25 scores exacts.",
    icon: "Award",
    tier: "GOLD",
    sortOrder: 6,
  },
  {
    code: "JOKER_EXACT",
    name: "Coup de maître",
    description: "Joker posé sur un score exact.",
    icon: "Sparkles",
    tier: "GOLD",
    sortOrder: 7,
  },
  {
    code: "UNDERDOG",
    name: "Contre-pied",
    description: "Bon résultat choisi par moins de 20 % de la communauté.",
    icon: "Shuffle",
    tier: "SILVER",
    sortOrder: 8,
  },
  {
    code: "GLOBETROTTER",
    name: "Globe-trotter",
    description: "Au moins un pronostic noté dans chacune des 6 compétitions.",
    icon: "Globe",
    tier: "SILVER",
    sortOrder: 9,
  },
  {
    code: "CENTURION",
    name: "Centurion",
    description: "100 pronostics notés.",
    icon: "Shield",
    tier: "GOLD",
    sortOrder: 10,
  },
  {
    code: "MONTH_KING",
    name: "Roi du mois",
    description: "1er du classement général d'un mois terminé.",
    icon: "Crown",
    tier: "GOLD",
    sortOrder: 11,
  },
  {
    code: "FOUNDER",
    name: "Président de club",
    description: "A créé une ligue d'au moins 3 membres.",
    icon: "Users",
    tier: "BRONZE",
    sortOrder: 12,
  },
];

export type BadgeCode = (typeof BADGES)[number]["code"];

export const BADGE_BY_CODE = new Map(BADGES.map((b) => [b.code, b]));

/** Badges mérités d'après les statistiques de pronostics. Fonction pure. */
export function badgesFromStats(stats: UserStats): string[] {
  const earned: string[] = [];
  if (stats.total >= 1) earned.push("FIRST_PICK");
  if (stats.bestStreak >= 5) earned.push("STREAK_5");
  if (stats.bestStreak >= 10) earned.push("STREAK_10");
  if (stats.exact >= 1) earned.push("EXACT_1");
  if (stats.exact >= 10) earned.push("EXACT_10");
  if (stats.exact >= 25) earned.push("EXACT_25");
  if (stats.jokerExact >= 1) earned.push("JOKER_EXACT");
  if (stats.underdogWins >= 1) earned.push("UNDERDOG");
  const played = new Set(stats.competitions.map((c) => c.code));
  if (ALL_COMPETITION_CODES.every((c) => played.has(c))) earned.push("GLOBETROTTER");
  if (stats.total >= 100) earned.push("CENTURION");
  return earned;
}

/** Nombre minimal de membres d'une ligue pour le badge Président de club. */
export const FOUNDER_MIN_MEMBERS = 3;
