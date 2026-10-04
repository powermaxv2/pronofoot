import type { Metadata } from "next";
import Link from "next/link";
import { TeamCrest } from "@/components/features/match/team-crest";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { TiltCard } from "@/components/motion/tilt-card";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Championnats" };

export default async function CompetitionsPage() {
  await requireUser();
  const competitions = await prisma.competition.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      currentSeason: {
        include: {
          standings: {
            orderBy: { position: "asc" },
            take: 3,
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
          },
        },
      },
    },
  });
  return (
    <>
      <PageHeader title="Championnats" description="Classements officiels des six compétitions suivies." />
      <StaggerList className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {competitions.map((c, i) => (
          <StaggerItem key={c.code} index={i}>
            <Link href={`/championnats/${c.code}`} className="block rounded-2xl">
              <TiltCard className="glass grid gap-4 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-3xl tracking-wide">{c.name}</h2>
                  <span className="size-3 rounded-full" style={{ background: c.color }} aria-hidden />
                </div>
                <ol className="grid gap-2">
                  {c.currentSeason?.standings.map((s) => (
                    <li key={s.team.id} className="flex items-center gap-3">
                      <span className="font-display text-muted-foreground w-5 text-xl">{s.position}</span>
                      <TeamCrest team={s.team} size={22} />
                      <span className="font-condensed flex-1 truncate font-semibold">{s.team.shortName}</span>
                      <span className="font-display text-xl">{s.points}</span>
                    </li>
                  ))}
                </ol>
              </TiltCard>
            </Link>
          </StaggerItem>
        ))}
      </StaggerList>
    </>
  );
}
