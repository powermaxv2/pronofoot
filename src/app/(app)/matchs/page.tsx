import type { Metadata } from "next";
import { MatchFilters } from "@/components/features/match/match-filters";
import { MatchList } from "@/components/features/match/match-list";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { isCompetitionCode } from "@/server/football/competitions";
import { prisma } from "@/server/db";
import { liveCount, listMatches, matchDays, type MatchTab } from "@/server/queries/matches";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Matchs" };

const TABS: Record<string, MatchTab> = { direct: "live", termines: "finished" };
const EMPTY: Record<MatchTab, { title: string; text: string }> = {
  upcoming: {
    title: "Rien à l'horizon",
    text: "Aucun match programmé pour ces filtres. Essayez une autre compétition ou un autre jour.",
  },
  live: {
    title: "Pas de match en cours",
    text: "Revenez au coup d'envoi : les scores se mettent à jour toutes les minutes.",
  },
  finished: { title: "Aucun résultat", text: "Aucun match terminé ne correspond à ces filtres." },
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; comp?: string; jour?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = TABS[params.onglet ?? ""] ?? "upcoming";
  const selected = (params.comp ?? "").split(",").filter(isCompetitionCode);
  const day = params.jour && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) ? params.jour : null;

  const [competitions, matches, days, live] = await Promise.all([
    prisma.competition.findMany({
      orderBy: { sortOrder: "asc" },
      select: { code: true, shortName: true, color: true },
    }),
    listMatches({ tab, competitions: selected, day, userId: user.id }),
    matchDays({ tab, competitions: selected }),
    liveCount(),
  ]);

  return (
    <>
      <PageHeader
        title="Matchs"
        description="Pronostiquez jusqu'au coup d'envoi. Touchez un match pour le détail."
        actions={
          <ButtonLink href="/championnats" variant="glass" size="sm">
            Classements officiels
          </ButtonLink>
        }
      />
      <MatchFilters
        tab={tab}
        competitions={competitions}
        selected={selected}
        days={days}
        day={day}
        liveCount={live}
      >
        <MatchList
          matches={matches}
          listKey={`${tab}:${selected.join()}:${day}`}
          emptyTitle={EMPTY[tab].title}
          emptyText={EMPTY[tab].text}
        />
      </MatchFilters>
    </>
  );
}
