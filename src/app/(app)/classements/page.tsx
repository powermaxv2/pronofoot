import type { Metadata } from "next";
import { LeaderboardBoard } from "@/components/features/leaderboard/leaderboard-board";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/server/db";
import { resolveLeaderboard, type PeriodParam } from "@/server/queries/leaderboard";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Classements" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const favorite = user.favoriteTeamId
    ? await prisma.match.findFirst({
        where: {
          OR: [{ homeTeamId: user.favoriteTeamId }, { awayTeamId: user.favoriteTeamId }],
          competition: { code: { not: "CL" } },
        },
        select: { competition: { select: { code: true } } },
      })
    : null;
  const [view, competitions] = await Promise.all([
    resolveLeaderboard(params, { favoriteCode: favorite?.competition.code }),
    prisma.competition.findMany({
      orderBy: { sortOrder: "asc" },
      select: { code: true, shortName: true, color: true },
    }),
  ]);
  return (
    <>
      <PageHeader
        title="Classements"
        description="Tous les joueurs de PronoFoot. Départage : points, puis scores exacts, puis bons résultats."
      />
      <LeaderboardBoard
        initial={view}
        initialParams={{
          periode: view.period as PeriodParam,
          mois: view.month?.key,
          comp: view.round?.competition,
          journee: view.round ? String(view.round.round) : undefined,
        }}
        meId={user.id}
        competitions={competitions}
      />
    </>
  );
}
