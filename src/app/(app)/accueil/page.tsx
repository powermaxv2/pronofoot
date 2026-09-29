import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CardRail } from "@/components/features/dashboard/card-rail";
import { ResultsCelebration } from "@/components/features/dashboard/results-celebration";
import { StatTile } from "@/components/features/dashboard/stat-tile";
import { WelcomeBurst } from "@/components/features/dashboard/welcome-burst";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/stagger";
import { computeStats } from "@/server/domain/stats";
import { prisma } from "@/server/db";
import { liveWindowMatches, upcomingForUser } from "@/server/queries/matches";
import { latestResults } from "@/server/queries/predictions";
import { statPredictions } from "@/server/services/badges";
import { getLeaderboard, userGeneralRank } from "@/server/services/leaderboards";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Accueil" };

function SectionTitle({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-4xl leading-none tracking-wide">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-grass-ink flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {cta} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, rank, upcoming, live, results, memberships] = await Promise.all([
    statPredictions(user.id).then(computeStats),
    userGeneralRank(user.id),
    upcomingForUser(user.id),
    liveWindowMatches(user.id),
    latestResults(user.id),
    prisma.leagueMember.findMany({
      where: { userId: user.id },
      include: { league: { select: { id: true, name: true, slug: true, emoji: true, color: true } } },
    }),
  ]);
  const toPredict = upcoming.filter((m) => !m.prediction);
  const liveNow = live.filter((m) => m.status === "LIVE" || m.status === "HALFTIME");
  const leagues = await Promise.all(
    memberships.map(async (m) => {
      const board = await getLeaderboard({ period: { type: "season" }, leagueId: m.league.id });
      const me = board.find((r) => r.userId === user.id);
      return { ...m.league, rank: me?.rank ?? null, delta: me?.delta ?? null, size: board.length };
    }),
  );

  return (
    <>
      <Suspense>
        <WelcomeBurst />
      </Suspense>
      <ResultsCelebration matches={results} />
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Salut ${user.username} !`}
        description="Vos points, votre rang et les matchs à ne pas manquer."
      />
      <div className="grid gap-10">
        <section aria-label="Mes chiffres" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Points" value={stats.points} tone="volt" hint="Saison en cours" />
          <StatTile
            label="Rang général"
            value={rank.rank}
            hint={rank.rank ? `sur ${rank.total} joueurs` : "Pas encore classé"}
          />
          <StatTile
            label="Réussite"
            value={stats.successRate}
            format="percent"
            hint={`${stats.won} bons résultats`}
          />
          <StatTile
            label="Série en cours"
            value={stats.currentStreak}
            hint={`Record : ${stats.bestStreak}`}
          />
        </section>

        {liveNow.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle title="En direct" href="/matchs?onglet=direct" cta="Tous les directs" />
            <CardRail matches={liveNow} showDay={false} />
          </section>
        )}

        <section className="grid gap-4">
          <SectionTitle title="À pronostiquer" href="/matchs" cta="Tous les matchs" />
          {toPredict.length ? (
            <CardRail matches={toPredict.slice(0, 9)} />
          ) : (
            <Reveal>
              <p className="glass text-muted-foreground flex items-center gap-3 rounded-2xl p-4">
                <CheckCircle2 className="text-grass-ink size-5 shrink-0" aria-hidden />
                Tout est pronostiqué pour les 48 prochaines heures.
              </p>
            </Reveal>
          )}
        </section>

        {leagues.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle title="Mes ligues" href="/ligues" cta="Gérer" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {leagues.map((l, i) => (
                <Reveal key={l.id} delay={i * 0.06}>
                  <Link
                    href={`/ligues/${l.slug}`}
                    className="glass hover:bg-accent flex items-center gap-4 rounded-2xl p-4 transition-colors"
                  >
                    <span
                      className="grid size-12 place-items-center rounded-xl text-2xl"
                      style={{ background: `${l.color}33` }}
                      aria-hidden
                    >
                      {l.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-condensed block truncate text-lg font-bold tracking-wide uppercase">
                        {l.name}
                      </span>
                      <span className="text-muted-foreground text-sm">{l.size} joueurs</span>
                    </span>
                    <span className="text-right">
                      <span className="font-display block text-4xl leading-none">{l.rank ?? "–"}</span>
                      <span className="label-caps text-muted-foreground">rang</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle title="Derniers résultats" href="/pronostics?onglet=historique" cta="Historique" />
            <CardRail matches={results} />
          </section>
        )}
      </div>
    </>
  );
}
