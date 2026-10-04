import type { MatchStatus, Outcome, PredictionState } from "@prisma/client";
import { outcomeFromScore } from "./outcome";

/** Barème officiel. */
export const POINTS = {
  /** Bon résultat (1N2). */
  result: 3,
  /** Bonus score exact (s'ajoute au bon résultat). */
  exact: 5,
  /** Multiplicateur du joker. */
  jokerMultiplier: 2,
} as const;

export const MAX_POINTS_PER_MATCH = (POINTS.result + POINTS.exact) * POINTS.jokerMultiplier;

export type ScorablePrediction = {
  outcome: Outcome;
  homeScore: number | null;
  awayScore: number | null;
  isJoker: boolean;
};

export type ScorableMatch = {
  status: MatchStatus;
  /** Score au temps réglementaire. */
  homeScore: number | null;
  awayScore: number | null;
};

export type Breakdown = { result: number; exact: number; multiplier: number };

export type ScoreResult = {
  state: Exclude<PredictionState, "PENDING">;
  points: number;
  breakdown: Breakdown;
};

/** Le match permet-il de distribuer des points ? */
export function isScorable(match: ScorableMatch): boolean {
  return match.status === "FINISHED" && match.homeScore != null && match.awayScore != null;
}

/** Le match est-il définitivement annulé pour les pronostics (points nuls, joker rendu) ? */
export function isVoided(match: Pick<ScorableMatch, "status">): boolean {
  return match.status === "CANCELLED" || match.status === "POSTPONED";
}

/**
 * Calcule les points d'un pronostic. Fonction pure : aucune I/O.
 * - bon 1N2 : 3 pts ; score exact : +5 ; joker : ×2 ;
 * - match reporté/annulé : VOID, 0 pt.
 */
export function scorePrediction(prediction: ScorablePrediction, match: ScorableMatch): ScoreResult {
  if (isVoided(match)) {
    return { state: "VOID", points: 0, breakdown: { result: 0, exact: 0, multiplier: 1 } };
  }
  if (!isScorable(match)) {
    throw new Error("Le match n'est pas terminé : impossible de calculer les points.");
  }
  const home = match.homeScore!;
  const away = match.awayScore!;
  const multiplier = prediction.isJoker ? POINTS.jokerMultiplier : 1;
  const goodResult = prediction.outcome === outcomeFromScore(home, away);
  const exact = goodResult && prediction.homeScore === home && prediction.awayScore === away;

  const breakdown: Breakdown = {
    result: goodResult ? POINTS.result : 0,
    exact: exact ? POINTS.exact : 0,
    multiplier,
  };
  const points = (breakdown.result + breakdown.exact) * multiplier;
  return { state: exact ? "EXACT" : goodResult ? "WON" : "LOST", points, breakdown };
}

/** Répartition 1/N/2 d'un ensemble de pronostics (ratios, somme = 1). */
export function crowdDistribution(outcomes: readonly Outcome[]): Record<Outcome, number> {
  const total = outcomes.length;
  const count = { HOME: 0, DRAW: 0, AWAY: 0 } satisfies Record<Outcome, number>;
  for (const o of outcomes) count[o] += 1;
  if (total === 0) return count;
  return { HOME: count.HOME / total, DRAW: count.DRAW / total, AWAY: count.AWAY / total };
}
