import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatTile } from "@/components/features/dashboard/stat-tile";
import { TeamCrest } from "@/components/features/match/team-crest";
import { BadgeGrid } from "@/components/features/profile/badge-grid";
import { PointsChart } from "@/components/features/profile/points-chart";
import { MatchList } from "@/components/features/match/match-list";
import { PickLabelProvider } from "@/components/features/match/prediction-chip";
import { ProgressBar } from "@/components/motion/progress-bar";
import { Reveal } from "@/components/motion/stagger";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { COMPETITIONS, isCompetitionCode } from "@/server/football/competitions";
import { getProfile } from "@/server/queries/profile";
import { latestResults } from "@/server/queries/predictions";
import { avatarOf, requireUser } from "@/server/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await params;
  const profile = await getProfile(decodeURIComponent(username).toLowerCase());
  if (!profile) notFound();
  const { user, stats, rank, weekly, badges } = profile;
  const isMe = user.id === me.id;
  const history = await latestResults(user.id, 9);
  const compName = (code: string) => (isCompetitionCode(code) ? COMPETITIONS[code].name : code);

  return (
    <div className="grid gap-8 pt-4">
      <Reveal>
        <header className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 sm:grid-cols-[auto_1fr_auto]">
          <Avatar
            name={user.username!}
            src={avatarOf(user)}
            size={80}
            className="ring-volt ring-2 ring-offset-4 ring-offset-[var(--background)]"
          />
          <div className="min-w-0">
            <p className="label-caps text-grass-ink">Membre depuis le {formatDate(user.createdAt)}</p>
            <h1 className="font-display text-4xl leading-none tracking-wide break-all sm:text-6xl">
              @{user.username}
            </h1>
            {user.favoriteTeam && (
              <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <TeamCrest team={user.favoriteTeam} size={20} /> Supporter de {user.favoriteTeam.name}
              </p>
            )}
          </div>
          {isMe && (
            <ButtonLink
              href="/profil/parametres"
              variant="glass"
              size="sm"
              className="col-span-2 justify-self-start sm:col-span-1"
            >
              Modifier mon profil
            </ButtonLink>
          )}
        </header>
      </Reveal>

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Points"
          value={stats.points}
          tone="volt"
          hint={rank.rank ? `${rank.rank}e sur ${rank.total}` : "Pas encore classé"}
        />
        <StatTile
          label="Réussite"
          value={stats.successRate}
          format="percent"
          hint={`${stats.won} / ${stats.total} pronos`}
        />
        <StatTile
          label="Scores exacts"
          value={stats.exact}
          hint={`${Math.round(stats.exactRate * 100)} % des pronos`}
        />
        <StatTile label="Série en cours" value={stats.currentStreak} hint={`Record : ${stats.bestStreak}`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Points cumulés</CardTitle>
          </CardHeader>
          <CardContent>
            <PointsChart data={weekly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Par compétition</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {stats.bestCompetition && (
              <p className="text-sm">
                Meilleur championnat :{" "}
                <span className="font-semibold">{compName(stats.bestCompetition.code)}</span> (
                {stats.bestCompetition.average.toFixed(1).replace(".", ",")} pts par prono)
              </p>
            )}
            {stats.competitions.length === 0 && (
              <p className="text-muted-foreground text-sm">Aucun prono noté pour l&apos;instant.</p>
            )}
            {stats.competitions.map((c, i) => (
              <div key={c.code} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-condensed font-bold uppercase">{compName(c.code)}</span>
                  <span className="text-muted-foreground">
                    {c.points} pts · {c.count} pronos
                  </span>
                </div>
                <ProgressBar
                  label=""
                  value={c.successRate}
                  delay={i * 0.08}
                  className="grid-cols-[0_1fr_3.5rem] gap-2"
                />
              </div>
            ))}
            <p className="text-muted-foreground text-xs">Barre : taux de bons résultats.</p>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4">
        <h2 className="font-display text-4xl tracking-wide">Badges</h2>
        <BadgeGrid badges={badges} isOwner={isMe} />
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-4xl tracking-wide">Derniers pronos notés</h2>
        <PickLabelProvider label={isMe ? "Mon prono" : `Prono de ${user.username}`}>
          <MatchList
            matches={history}
            listKey="history"
            emptyTitle="Pas encore d'historique"
            emptyText="Les pronos notés s'afficheront ici."
          />
        </PickLabelProvider>
      </section>
    </div>
  );
}
