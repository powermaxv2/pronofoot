import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchView } from "@/components/features/match/match-view";
import { prisma } from "@/server/db";
import { getMatchDetail } from "@/server/queries/matches";
import { requireUser } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    select: { homeTeam: { select: { shortName: true } }, awayTeam: { select: { shortName: true } } },
  });
  return { title: match ? `${match.homeTeam.shortName} – ${match.awayTeam.shortName}` : "Match" };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getMatchDetail(id, user.id);
  if (!detail) notFound();
  return (
    <div className="glass mx-auto mt-4 max-w-3xl rounded-3xl p-5 sm:p-8">
      <MatchView detail={detail} />
    </div>
  );
}
