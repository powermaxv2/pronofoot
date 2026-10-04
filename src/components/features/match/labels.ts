import type { Outcome } from "@prisma/client";

export const OUTCOME_SHORT: Record<Outcome, "1" | "N" | "2"> = { HOME: "1", DRAW: "N", AWAY: "2" };
