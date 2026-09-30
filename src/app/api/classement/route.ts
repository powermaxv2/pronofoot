import { NextResponse, type NextRequest } from "next/server";
import { apiUser, noStore } from "@/server/api";
import { prisma } from "@/server/db";
import { resolveLeaderboard } from "@/server/queries/leaderboard";

export const dynamic = "force-dynamic";

/** Classement (général ou ligue) pour le rafraîchissement automatique. */
export async function GET(request: NextRequest) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const sp = request.nextUrl.searchParams;
  let leagueId: string | undefined;
  const slug = sp.get("ligue");
  if (slug) {
    const league = await prisma.league.findUnique({
      where: { slug },
      select: { id: true, members: { where: { userId: guard.user.id }, select: { userId: true } } },
    });
    if (!league || league.members.length === 0)
      return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
    leagueId = league.id;
  }
  const view = await resolveLeaderboard(
    { periode: sp.get("periode"), mois: sp.get("mois"), comp: sp.get("comp"), journee: sp.get("journee") },
    { leagueId },
  );
  return NextResponse.json(view, noStore);
}
