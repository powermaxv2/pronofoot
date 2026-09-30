import type { MatchStatus } from "@prisma/client";

export type LockableMatch = { kickoffAt: Date; status: MatchStatus };

export class PredictionLockedError extends Error {
  constructor(message = "Les pronostics sont fermés : le match a commencé.") {
    super(message);
    this.name = "PredictionLockedError";
  }
}

/**
 * Un pronostic est modifiable tant que le match est programmé
 * et que l'heure du coup d'envoi n'est pas atteinte (strictement avant).
 */
export function isPredictionOpen(match: LockableMatch, now: Date = new Date()): boolean {
  return match.status === "SCHEDULED" && now.getTime() < match.kickoffAt.getTime();
}

/** Lève `PredictionLockedError` si le pronostic n'est plus modifiable. */
export function assertPredictionOpen(match: LockableMatch, now: Date = new Date()): void {
  if (match.status === "POSTPONED" || match.status === "CANCELLED") {
    throw new PredictionLockedError("Ce match est reporté ou annulé : les pronostics sont fermés.");
  }
  if (!isPredictionOpen(match, now)) throw new PredictionLockedError();
}

/** Le verrouillage est-il effectif (les pronostics de la communauté deviennent visibles) ? */
export function isLocked(match: LockableMatch, now: Date = new Date()): boolean {
  return !isPredictionOpen(match, now);
}

/** Millisecondes restantes avant verrouillage (0 si verrouillé). */
export function msUntilLock(match: LockableMatch, now: Date = new Date()): number {
  return isPredictionOpen(match, now) ? match.kickoffAt.getTime() - now.getTime() : 0;
}
