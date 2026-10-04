import type { MatchStatus, PredictionState } from "@prisma/client";

export const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "À venir",
  LIVE: "En direct",
  HALFTIME: "Mi-temps",
  FINISHED: "Terminé",
  POSTPONED: "Reporté",
  CANCELLED: "Annulé",
};

export const isLiveStatus = (s: MatchStatus) => s === "LIVE" || s === "HALFTIME";
export const hasScore = (s: MatchStatus) => s === "LIVE" || s === "HALFTIME" || s === "FINISHED";

/** Match programmé dont l'heure est passée mais dont le résultat n'est pas encore connu. */
export const awaitingResult = (s: MatchStatus, kickoffAt: Date, now = Date.now()) =>
  s === "SCHEDULED" && kickoffAt.getTime() <= now;

export const PREDICTION_LABEL: Record<PredictionState, string> = {
  PENDING: "En attente",
  WON: "Bon résultat",
  EXACT: "Score exact",
  LOST: "Raté",
  VOID: "Annulé",
};
