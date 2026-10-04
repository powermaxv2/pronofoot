import type { Metadata } from "next";
import { StatTile } from "@/components/features/dashboard/stat-tile";
import { MatchList } from "@/components/features/match/match-list";
import { PredictionsTabs } from "@/components/features/prediction/predictions-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { computeStats } from "@/server/domain/stats";
import {
  HISTORY_PAGE_SIZE,
  missingPredictions,
  myPredictions,
  type PredictionTab,
} from "@/server/queries/predictions";
import { statPredictions } from "@/server/services/badges";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Mes pronos" };

const TABS: Record<string, PredictionTab> = { "en-cours": "progress", historique: "history" };
const EMPTY: Record<PredictionTab, { title: string; text: string }> = {
  upcoming: {
    title: "Aucun prono en attente",
    text: "Choisissez vos matchs dans l'onglet Matchs : vous pourrez modifier vos pronos jusqu'au coup d'envoi.",
  },
  progress: {
    title: "Rien en cours",
    text: "Vos pronos apparaissent ici entre le coup d'envoi et le calcul des points.",
  },
  history: {
    title: "Pas encore d'historique",
    text: "Vos pronos notés s'afficheront ici avec les points gagnés.",
  },
};

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = TABS[params.onglet ?? ""] ?? "upcoming";
  const page = Math.max(1, Math.min(50, Number(params.page) || 1));
  const [current, upcoming, progress, history, missing, stats] = await Promise.all([
    myPredictions(user.id, tab, { page }),
    myPredictions(user.id, "upcoming"),
    myPredictions(user.id, "progress"),
    myPredictions(user.id, "history", { page: 1 }),
    missingPredictions(user.id),
    statPredictions(user.id).then(computeStats),
  ]);
  const counts = { upcoming: upcoming.total, progress: progress.total, history: history.total };
  return (
    <>
      <PageHeader
        title="Mes pronos"
        description="Modifiables jusqu'au coup d'envoi. Les points tombent automatiquement après chaque match."
        actions={
          missing > 0 ? (
            <ButtonLink href="/matchs" variant="volt" size="sm">
              {missing} match{missing > 1 ? "s" : ""} à pronostiquer
            </ButtonLink>
          ) : undefined
        }
      />
      <section aria-label="Bilan" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Points" value={stats.points} tone="volt" />
        <StatTile
          label="Scores exacts"
          value={stats.exact}
          hint={`${Math.round(stats.exactRate * 100)} % des pronos`}
        />
        <StatTile
          label="Réussite"
          value={stats.successRate}
          format="percent"
          hint={`${stats.won} / ${stats.total}`}
        />
        <StatTile label="Jokers gagnants" value={stats.jokerWins} />
      </section>
      <PredictionsTabs tab={tab} counts={counts}>
        <MatchList
          matches={current.matches}
          listKey={tab}
          emptyTitle={EMPTY[tab].title}
          emptyText={EMPTY[tab].text}
        />
        {tab === "history" && current.matches.length < current.total && (
          <div className="mt-6 flex justify-center">
            <ButtonLink
              href={`/pronostics?onglet=historique&page=${page + 1}`}
              variant="glass"
              scroll={false}
            >
              Voir {Math.min(HISTORY_PAGE_SIZE, current.total - current.matches.length)} de plus
            </ButtonLink>
          </div>
        )}
      </PredictionsTabs>
    </>
  );
}
