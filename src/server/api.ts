import "server-only";
import { NextResponse } from "next/server";
import { rateLimit } from "@/server/rate-limit";
import { getCurrentUser, type CurrentUser } from "@/server/session";

/** Garde commune des routes JSON : session + rate limiting de lecture. */
export async function apiUser(): Promise<{ user: CurrentUser } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Non connecté" }, { status: 401 }) };
  const limited = rateLimit("read", `api:${user.id}`);
  if (!limited.ok) {
    return {
      response: NextResponse.json(
        { error: "Trop de requêtes" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      ),
    };
  }
  return { user };
}

export const noStore = { headers: { "Cache-Control": "private, no-store" } };
