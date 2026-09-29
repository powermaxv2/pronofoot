import type { Metadata } from "next";
import Link from "next/link";
import { CreateLeagueButton } from "@/components/features/league/leagues-actions";
import { JoinForm } from "@/components/features/league/join-form";
import { PageHeader } from "@/components/layout/page-header";
import { LottiePlayer } from "@/components/motion/lottie-player";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { TiltCard } from "@/components/motion/tilt-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/server/db";
import { getLeaderboard } from "@/server/services/leaderboards";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Ligues" };

export default async function LeaguesPage() {
  const user = await requireUser();
  const memberships = await prisma.leagueMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { league: { include: { _count: { select: { members: true } } } } },
  });
  const leagues = await Promise.all(
    memberships.map(async ({ league, role }) => {
      const board = await getLeaderboard({ period: { type: "season" }, leagueId: league.id });
      return { ...league, role, me: board.find((r) => r.userId === user.id), leader: board[0] };
    }),
  );
  return (
    <>
      <PageHeader
        title="Ligues"
        description="Vos ligues privées entre potes. Chacune a ses classements par saison, mois et journée."
        actions={<CreateLeagueButton />}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Mes ligues">
          {leagues.length === 0 ? (
            <div className="glass grid justify-items-center gap-2 rounded-3xl p-8 text-center">
              <LottiePlayer src="/lottie/ball-roll.json" className="w-44" />
              <h2 className="font-display text-3xl tracking-wide">Pas encore de ligue</h2>
              <p className="text-muted-foreground max-w-[44ch]">
                Créez la vôtre et partagez le code, ou rejoignez celle d&apos;un ami.
              </p>
            </div>
          ) : (
            <StaggerList className="grid gap-3 sm:grid-cols-2">
              {leagues.map((l, i) => (
                <StaggerItem key={l.id} index={i}>
                  <Link href={`/ligues/${l.slug}`} className="block rounded-2xl">
                    <TiltCard className="glass grid gap-4 rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <span
                          className="grid size-14 shrink-0 place-items-center rounded-2xl text-3xl"
                          style={{ background: `${l.color}33`, boxShadow: `inset 0 0 0 1px ${l.color}66` }}
                          aria-hidden
                        >
                          {l.emoji}
                        </span>
                        <div className="min-w-0">
                          <h2 className="font-display truncate text-3xl leading-none tracking-wide">
                            {l.name}
                          </h2>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {l._count.members} membre{l._count.members > 1 ? "s" : ""}
                            {l.role === "OWNER" && " · vous êtes président"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <span className="text-muted-foreground text-sm">
                          En tête :{" "}
                          <span className="text-foreground font-semibold">
                            {l.leader?.user.username ?? "—"}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="font-display block text-5xl leading-none">
                            {l.me?.rank ?? "–"}
                          </span>
                          <span className="label-caps text-muted-foreground">mon rang</span>
                        </span>
                      </div>
                    </TiltCard>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </section>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Rejoindre une ligue</CardTitle>
          </CardHeader>
          <CardContent>
            <JoinForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
