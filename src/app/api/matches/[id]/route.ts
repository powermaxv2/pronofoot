import { NextResponse } from "next/server";
import { apiUser, noStore } from "@/server/api";
import { prisma } from "@/server/db";
import { communityStats } from "@/server/queries/matches";
import { matchEventsSchema } from "@/server/football/types";

export const dynamic = "force-dynamic";

/** État courant d'un match (score, minute, événements) et communauté si verrouillé. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      minute: true,
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      htHome: true,
      htAway: true,
      events: true,
      predictions: {
        where: { userId: guard.user.id },
        select: { state: true, points: true, isJoker: true, seenAt: true },
        take: 1,
      },
    },
  });
  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  const events = matchEventsSchema.safeParse(match.events);
  return NextResponse.json(
    {
      id: match.id,
      status: match.status,
      minute: match.minute,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      htHome: match.htHome,
      htAway: match.htAway,
      events: events.success ? events.data : null,
      prediction: match.predictions[0] ?? null,
      community: await communityStats(match.id, match),
    },
    noStore,
  );
}
