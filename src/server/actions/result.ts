import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { PredictionLockedError } from "@/server/domain/locking";
import { RateLimitError } from "@/server/rate-limit";
import { firstError } from "@/lib/validation";

export type ActionResult<T = void> = { ok: true; data: T; message?: string } | { ok: false; error: string };

export class UserFacingError extends Error {}

/** Encapsule une action serveur : erreurs attendues → message utilisateur, le reste est journalisé. */
export async function safeAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ZodError) return { ok: false, error: firstError(error) };
    if (
      error instanceof UserFacingError ||
      error instanceof RateLimitError ||
      error instanceof PredictionLockedError
    ) {
      return { ok: false, error: error.message };
    }
    console.error("[action]", error);
    return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}
