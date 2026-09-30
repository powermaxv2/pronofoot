import type { Metadata } from "next";
import { StatTile } from "@/components/features/dashboard/stat-tile";
import { StatusChip } from "@/components/features/admin/status-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { env, features } from "@/lib/env";
import { formatKickoff } from "@/lib/dates";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { JOBS } from "@/server/jobs";
import { remainingCalls, usageToday } from "@/server/football/quota";

export const metadata: Metadata = { title: "Administration" };

function Meter({ label, used, budget, hint }: { label: string; used: number; budget: number; hint: string }) {
  const ratio = Math.min(1, used / budget);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-condensed font-bold uppercase">{label}</span>
        <span className="tabular text-sm">
          {used} / {budget}
        </span>
      </div>
      <div
        className="bg-border h-2.5 overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-label={label}
      >
        <div
          className={ratio > 0.85 ? "bg-destructive h-full origin-left" : "bg-primary h-full origin-left"}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </div>
  );
}

export default async function AdminOverview() {
  await requireAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [users, activeUsers, predictions, leagues, live, apiFootballToday, footballDataMinute, lastRuns] =
    await Promise.all([
      prisma.user.count({ where: { onboardedAt: { not: null } } }),
      prisma.user.count({ where: { predictions: { some: { updatedAt: { gte: weekAgo } } } } }),
      prisma.prediction.count(),
      prisma.league.count(),
      prisma.match.count({ where: { status: { in: ["LIVE", "HALFTIME"] } } }),
      usageToday("api-football"),
      remainingCalls("football-data"),
      Promise.all(
        JOBS.map((j) =>
          prisma.cronRun
            .findFirst({ where: { job: j.name }, orderBy: { startedAt: "desc" } })
            .then((run) => ({ job: j, run })),
        ),
      ),
    ]);
  const providers = [
    { name: "API-Football", on: features.apiFootball(), role: "Calendrier, compositions, face-à-face" },
    {
      name: "football-data.org",
      on: features.footballData(),
      role: `Repli${env().FOOTBALL_LIVE_PROVIDER === "football-data" ? " + direct" : ""}`,
    },
    { name: "E-mail (SMTP)", on: features.email(), role: "Liens magiques, notifications" },
    { name: "Google", on: features.google(), role: "Connexion" },
    { name: "Web Push", on: features.push(), role: "Notifications sur l'appareil" },
  ];
  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Joueurs" value={users} tone="volt" />
        <StatTile label="Actifs (7 j)" value={activeUsers} />
        <StatTile label="Pronostics" value={predictions} />
        <StatTile label="Ligues" value={leagues} />
        <StatTile label="En direct" value={live} />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Quotas des API</CardTitle>
              <CardDescription>
                Le cache Postgres et le worker évitent tout appel déclenché par les visiteurs.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Meter
              label="API-Football (aujourd'hui)"
              used={apiFootballToday}
              budget={env().API_FOOTBALL_DAILY_BUDGET}
              hint="Budget journalier configuré (API_FOOTBALL_DAILY_BUDGET)."
            />
            <Meter
              label="football-data.org (cette minute)"
              used={env().FOOTBALL_DATA_MINUTE_BUDGET - footballDataMinute}
              budget={env().FOOTBALL_DATA_MINUTE_BUDGET}
              hint="Budget par minute (FOOTBALL_DATA_MINUTE_BUDGET)."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {providers.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-muted-foreground block text-xs">{p.role}</span>
                  </span>
                  <Badge variant={p.on ? "success" : "outline"}>{p.on ? "Configuré" : "Désactivé"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dernières exécutions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="label-caps text-muted-foreground text-left">
              <tr>
                <th className="py-2 font-semibold">Tâche</th>
                <th className="py-2 font-semibold">Planification</th>
                <th className="py-2 font-semibold">Dernière exécution</th>
                <th className="py-2 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {lastRuns.map(({ job, run }) => (
                <tr key={job.name} className="border-border border-t">
                  <td className="py-2">
                    <span className="font-semibold">{job.label}</span>
                    <code className="text-muted-foreground block text-xs">{job.name}</code>
                  </td>
                  <td className="py-2">
                    <code className="text-xs">{job.schedule}</code>
                  </td>
                  <td className="text-muted-foreground py-2">
                    {run ? formatKickoff(run.startedAt) : "Jamais"}
                  </td>
                  <td className="py-2">{run ? <StatusChip status={run.status} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
