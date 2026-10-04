import { NextResponse } from "next/server";
import { apiUser, noStore } from "@/server/api";
import { liveWindowMatches } from "@/server/queries/matches";

export const dynamic = "force-dynamic";

/** État des matchs en direct (ou sur le point de commencer) — interrogé toutes les 60 s. */
export async function GET() {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const matches = await liveWindowMatches(guard.user.id);
  return NextResponse.json(
    {
      matches: matches.map((m) => ({
        id: m.id,
        status: m.status,
        minute: m.minute,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
      serverTime: new Date().toISOString(),
    },
    noStore,
  );
}
