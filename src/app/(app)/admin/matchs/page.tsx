import type { Metadata } from "next";
import Link from "next/link";
import { ManualResults } from "@/components/features/admin/manual-result";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Résultats · Admin" };

const team = {
  select: {
    name: true,
    shortName: true,
    tla: true,
    crestUrl: true,
    primaryColor: true,
    secondaryColor: true,
  },
} as const;

export default async function AdminMatches({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  await requireAdmin();
  const { vue } = await searchParams;
  const now = new Date();
  const view = vue === "manuels" ? "manual" : vue === "recents" ? "recent" : "pending";
  const where =
    view === "manual"
      ? { manualScore: true }
      : view === "recent"
        ? {
            status: "FINISHED" as const,
            kickoffAt: { gte: new Date(now.getTime() - 3 * 86_400_000), lte: now },
          }
        : // Matchs dont le résultat devrait être connu : coup d'envoi passé depuis plus de 2 h, non terminés.
          {
            status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] as ("SCHEDULED" | "LIVE" | "HALFTIME")[] },
            kickoffAt: { lte: new Date(now.getTime() - 2 * 3600_000) },
          };
  const matches = await prisma.match.findMany({
    where,
    orderBy: { kickoffAt: view === "pending" ? "asc" : "desc" },
    take: 60,
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      manualScore: true,
      competition: { select: { shortName: true } },
      homeTeam: team,
      awayTeam: team,
    },
  });
  const tabs = [
    { key: "pending", href: "/admin/matchs", label: "En attente de résultat" },
    { key: "recent", href: "/admin/matchs?vue=recents", label: "Terminés (3 j)" },
    { key: "manual", href: "/admin/matchs?vue=manuels", label: "Saisies manuelles" },
  ];
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground max-w-[70ch] text-sm">
        Saisie manuelle d&apos;un résultat quand l&apos;API est indisponible ou pour corriger une erreur. Le
        score saisi est protégé des synchronisations, les points et le classement officiel sont recalculés
        immédiatement et les joueurs notifiés.
      </p>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "font-condensed rounded-full border px-3.5 py-1.5 text-sm font-bold uppercase",
              t.key === view
                ? "bg-volt text-volt-foreground border-transparent"
                : "border-border text-muted-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <ManualResults matches={matches.map((m) => ({ ...m, competition: m.competition.shortName }))} />
    </div>
  );
}
