import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/features/competition/standings-table";
import { MatchCard } from "@/components/features/match/match-card";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { COMPETITIONS, isCompetitionCode } from "@/server/football/competitions";
import { prisma } from "@/server/db";
import { listMatches } from "@/server/queries/matches";
import { requireUser } from "@/server/session";

const ZONES = {
  FL1: { top: 3, europe: 6, relegation: 3 },
  PL: { top: 4, europe: 6, relegation: 3 },
  PD: { top: 4, europe: 6, relegation: 3 },
  SA: { top: 4, europe: 6, relegation: 3 },
  BL1: { top: 4, europe: 6, relegation: 3 },
  CL: { top: 8, europe: 24, relegation: 12 },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: isCompetitionCode(code) ? COMPETITIONS[code].name : "Championnat" };
}

export default async function CompetitionPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  if (!isCompetitionCode(code)) notFound();
  const competition = await prisma.competition.findUnique({
    where: { code },
    include: { currentSeason: true },
  });
  if (!competition?.currentSeason) notFound();
  const [standings, upcoming] = await Promise.all([
    prisma.standing.findMany({
      where: { seasonId: competition.currentSeason.id },
      orderBy: { position: "asc" },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            tla: true,
            crestUrl: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
      },
    }),
    listMatches({ tab: "upcoming", competitions: [code], userId: user.id }),
  ]);
  const year = competition.currentSeason.year;
  const nextRound = upcoming[0]?.round;
  const roundMatches = upcoming.filter((m) => m.round === nextRound);
  return (
    <>
      <PageHeader
        eyebrow={`${competition.country} · saison ${year}-${String(year + 1).slice(2)}`}
        title={competition.name}
      />
      <div className="grid gap-8">
        {standings.length ? (
          <section aria-label="Classement" className="grid gap-2">
            <StandingsTable rows={standings} highlightTeamId={user.favoriteTeamId} zones={ZONES[code]} />
            <p className="text-muted-foreground text-xs">
              {code === "CL"
                ? "Vert : qualifiés pour les huitièmes · bleu : barrages · rouge : éliminés."
                : "Vert : Ligue des Champions · bleu : autres coupes d'Europe · rouge : relégation."}
            </p>
          </section>
        ) : (
          <p className="text-muted-foreground">Le classement sera disponible après la première journée.</p>
        )}
        {roundMatches.length > 0 && (
          <section className="grid gap-3">
            <h2 className="font-display text-4xl tracking-wide">{roundMatches[0]!.roundLabel}</h2>
            <StaggerList className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {roundMatches.map((m, i) => (
                <StaggerItem key={m.id} index={i}>
                  <MatchCard match={m} showDay />
                </StaggerItem>
              ))}
            </StaggerList>
          </section>
        )}
      </div>
    </>
  );
}
