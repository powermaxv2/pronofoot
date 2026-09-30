import type { PredictionState } from "@prisma/client";

export type StatPrediction = {
  state: PredictionState;
  points: number;
  isJoker: boolean;
  competitionCode: string;
  kickoffAt: Date;
  /** Part de la communauté ayant choisi la même issue (null si trop peu de pronostics). */
  crowdShare: number | null;
};

export type CompetitionStat = {
  code: string;
  count: number;
  points: number;
  average: number;
  successRate: number;
};

export type UserStats = {
  /** Pronostics notés (hors annulés). */
  total: number;
  won: number;
  exact: number;
  lost: number;
  points: number;
  successRate: number;
  exactRate: number;
  currentStreak: number;
  bestStreak: number;
  jokerWins: number;
  jokerExact: number;
  underdogWins: number;
  competitions: CompetitionStat[];
  bestCompetition: CompetitionStat | null;
};

/** Seuil de rareté pour le badge Contre-pied. */
export const UNDERDOG_THRESHOLD = 0.2;
/** Nombre minimum de pronostics pour « meilleur championnat ». */
export const BEST_COMPETITION_MIN = 5;

const isWin = (s: PredictionState) => s === "WON" || s === "EXACT";

/** Statistiques personnelles à partir des pronostics notés. Fonction pure. */
export function computeStats(predictions: readonly StatPrediction[]): UserStats {
  const scored = predictions
    .filter((p) => p.state !== "PENDING" && p.state !== "VOID")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  let won = 0;
  let exact = 0;
  let points = 0;
  let run = 0;
  let bestStreak = 0;
  let jokerWins = 0;
  let jokerExact = 0;
  let underdogWins = 0;
  const byComp = new Map<string, { count: number; points: number; won: number }>();

  for (const p of scored) {
    const win = isWin(p.state);
    if (win) won += 1;
    if (p.state === "EXACT") exact += 1;
    points += p.points;
    run = win ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
    if (p.isJoker && win) jokerWins += 1;
    if (p.isJoker && p.state === "EXACT") jokerExact += 1;
    if (win && p.crowdShare != null && p.crowdShare < UNDERDOG_THRESHOLD) underdogWins += 1;
    const c = byComp.get(p.competitionCode) ?? { count: 0, points: 0, won: 0 };
    c.count += 1;
    c.points += p.points;
    if (win) c.won += 1;
    byComp.set(p.competitionCode, c);
  }

  const competitions: CompetitionStat[] = [...byComp.entries()]
    .map(([code, c]) => ({
      code,
      count: c.count,
      points: c.points,
      average: c.points / c.count,
      successRate: c.won / c.count,
    }))
    .sort((a, b) => b.points - a.points);

  const bestCompetition =
    competitions
      .filter((c) => c.count >= BEST_COMPETITION_MIN)
      .sort((a, b) => b.average - a.average || b.count - a.count)[0] ?? null;

  const total = scored.length;
  return {
    total,
    won,
    exact,
    lost: total - won,
    points,
    successRate: total ? won / total : 0,
    exactRate: total ? exact / total : 0,
    currentStreak: run,
    bestStreak,
    jokerWins,
    jokerExact,
    underdogWins,
    competitions,
    bestCompetition,
  };
}
