import { notFound } from "next/navigation";
import { MatchView } from "@/components/features/match/match-view";
import { MatchModal } from "@/components/features/match/match-modal";
import { getMatchDetail } from "@/server/queries/matches";
import { requireUser } from "@/server/session";

/** Détail intercepté : ouvert en surimpression depuis une liste de matchs. */
export default async function MatchModalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getMatchDetail(id, user.id);
  if (!detail) notFound();
  return (
    <MatchModal matchId={detail.id} title={`${detail.homeTeam.name} – ${detail.awayTeam.name}`}>
      <MatchView detail={detail} />
    </MatchModal>
  );
}
