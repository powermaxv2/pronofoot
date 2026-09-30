import type { Outcome } from "@prisma/client";

/** Issue 1N2 déduite d'un score. */
export function outcomeFromScore(home: number, away: number): Outcome {
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

export const OUTCOME_LABEL: Record<Outcome, "1" | "N" | "2"> = { HOME: "1", DRAW: "N", AWAY: "2" };

/** Vrai si le score (optionnel) est cohérent avec l'issue choisie. */
export function isScoreConsistent(outcome: Outcome, home?: number | null, away?: number | null): boolean {
  if (home == null && away == null) return true;
  if (home == null || away == null) return false;
  return outcomeFromScore(home, away) === outcome;
}

/** Clé d'unicité du joker : un par (utilisateur, compétition, saison, journée). */
export function jokerKey(userId: string, competitionId: string, seasonId: string, round: number): string {
  return `${userId}:${competitionId}:${seasonId}:${round}`;
}
