import type { Metadata } from "next";
import { Suspense } from "react";
import { StatTile } from "@/components/features/dashboard/stat-tile";
import { WelcomeBurst } from "@/components/features/dashboard/welcome-burst";
import { PageHeader } from "@/components/layout/page-header";
import { computeStats } from "@/server/domain/stats";
import { statPredictions } from "@/server/services/badges";
import { userGeneralRank } from "@/server/services/leaderboards";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, rank] = await Promise.all([
    statPredictions(user.id).then(computeStats),
    userGeneralRank(user.id),
  ]);
  return (
    <>
      <Suspense>
        <WelcomeBurst />
      </Suspense>
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Salut ${user.username} !`}
        description="Vos points, votre rang et les matchs à ne pas manquer."
      />
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
        <StatTile label="Série en cours" value={stats.currentStreak} hint={`Record : ${stats.bestStreak}`} />
      </section>
    </>
  );
}
