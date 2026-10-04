import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InvitePanel } from "@/components/features/league/invite-panel";
import { JoinedBurst } from "@/components/features/league/joined-burst";
import { LeagueAdmin } from "@/components/features/league/league-admin";
import { LeaderboardBoard } from "@/components/features/leaderboard/leaderboard-board";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/server/db";
import { resolveLeaderboard, type PeriodParam } from "@/server/queries/leaderboard";
import { avatarOf, requireUser } from "@/server/session";

async function loadLeague(slug: string, userId: string) {
  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
      },
    },
  });
  if (!league || !league.members.some((m) => m.userId === userId)) return null;
  return league;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const league = await prisma.league.findUnique({ where: { slug }, select: { name: true } });
  return { title: league?.name ?? "Ligue" };
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const league = await loadLeague(slug, user.id);
  if (!league) notFound();
  const [view, competitions] = await Promise.all([
    resolveLeaderboard(await searchParams, { leagueId: league.id }),
    prisma.competition.findMany({
      orderBy: { sortOrder: "asc" },
      select: { code: true, shortName: true, color: true },
    }),
  ]);
  const isOwner = league.ownerId === user.id;
  return (
    <>
      <Suspense>
        <JoinedBurst slug={league.slug} />
      </Suspense>
      <PageHeader
        eyebrow={`${league.members.length} membre${league.members.length > 1 ? "s" : ""}`}
        title={
          <span className="flex items-center gap-3">
            <span
              className="grid size-14 place-items-center rounded-2xl text-3xl"
              style={{ background: `${league.color}33` }}
              aria-hidden
            >
              {league.emoji}
            </span>
            {league.name}
          </span>
        }
        description={league.description ?? undefined}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Classement de la ligue">
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
            leagueSlug={league.slug}
          />
        </section>
        <div className="grid gap-5 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Inviter des potes</CardTitle>
            </CardHeader>
            <CardContent>
              <InvitePanel
                leagueId={league.id}
                name={league.name}
                code={league.inviteCode}
                isOwner={isOwner}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Membres</CardTitle>
            </CardHeader>
            <CardContent>
              <LeagueAdmin
                league={{
                  id: league.id,
                  name: league.name,
                  description: league.description,
                  emoji: league.emoji,
                  color: league.color,
                }}
                meId={user.id}
                isOwner={isOwner}
                members={league.members.map((m) => ({
                  userId: m.userId,
                  username: m.user.username ?? "joueur",
                  avatar: avatarOf(m.user),
                  role: m.role,
                  joinedAt: m.joinedAt,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
