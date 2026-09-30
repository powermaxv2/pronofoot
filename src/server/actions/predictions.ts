"use server";

import { revalidatePath } from "next/cache";
import type { PredictionInput } from "@/lib/validation";
import { prisma } from "@/server/db";
import { assertRateLimit } from "@/server/rate-limit";
import { deletePrediction, PredictionError, upsertPrediction } from "@/server/services/predictions";
import { requireUser } from "@/server/session";
import { safeAction, UserFacingError, type ActionResult } from "./result";

async function guard<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PredictionError) throw new UserFacingError(error.message);
    throw error;
  }
}

export async function savePrediction(
  input: PredictionInput,
): Promise<ActionResult<{ movedJokerFrom: string | null }>> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("prediction", user.id);
    const { movedJokerFrom } = await guard(() => upsertPrediction(user.id, input));
    revalidatePath("/", "layout");
    return { movedJokerFrom };
  }, "Pronostic enregistré.");
}

export async function removePrediction(matchId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("prediction", user.id);
    await guard(() => deletePrediction(user.id, matchId));
    revalidatePath("/", "layout");
  }, "Pronostic supprimé.");
}

/** Marque le résultat comme vu (les confettis ne se déclenchent qu'une fois). */
export async function markPredictionSeen(matchId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await prisma.prediction.updateMany({
      where: { userId: user.id, matchId, seenAt: null, scoredAt: { not: null } },
      data: { seenAt: new Date() },
    });
  });
}
