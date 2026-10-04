import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/features/admin/status-chip";
import { formatKickoff } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { JOBS } from "@/server/jobs";

export const metadata: Metadata = { title: "Journal · Admin" };

const PAGE = 50;
const STATUSES = ["SUCCESS", "ERROR", "SKIPPED", "RUNNING"] as const;

export default async function AdminLog({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; statut?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const job =
    params.job && [...JOBS.map((j) => j.name), "recalcul"].includes(params.job) ? params.job : undefined;
  const status = STATUSES.find((s) => s === params.statut);
  const page = Math.max(1, Number(params.page) || 1);
  const where = { ...(job ? { job } : {}), ...(status ? { status } : {}) };
  const [runs, total] = await Promise.all([
    prisma.cronRun.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.cronRun.count({ where }),
  ]);
  const link = (changes: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { job, statut: status, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/admin/journal${sp.size ? `?${sp}` : ""}`;
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {[undefined, ...JOBS.map((j) => j.name), "recalcul"].map((name) => (
          <Link
            key={name ?? "all"}
            href={link({ job: name, page: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              name === job
                ? "bg-volt text-volt-foreground border-transparent"
                : "border-border text-muted-foreground",
            )}
          >
            {name ?? "Toutes les tâches"}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={link({ statut: s, page: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              s === status
                ? "bg-volt text-volt-foreground border-transparent"
                : "border-border text-muted-foreground",
            )}
          >
            {s ?? "Tous les statuts"}
          </Link>
        ))}
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="label-caps text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Début</th>
              <th className="py-3 font-semibold">Tâche</th>
              <th className="py-3 font-semibold">Déclenchement</th>
              <th className="py-3 font-semibold">Statut</th>
              <th className="py-3 text-right font-semibold">Durée</th>
              <th className="px-4 py-3 font-semibold">Détail</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-border border-t align-top">
                <td className="text-muted-foreground px-4 py-2 whitespace-nowrap">
                  {formatKickoff(r.startedAt)}
                </td>
                <td className="py-2">
                  <code className="text-xs">{r.job}</code>
                </td>
                <td className="py-2 text-xs">{r.trigger === "MANUAL" ? "Manuel" : "Planifié"}</td>
                <td className="py-2">
                  <StatusChip status={r.status} />
                </td>
                <td className="tabular py-2 text-right">
                  {r.durationMs != null ? `${r.durationMs} ms` : "—"}
                </td>
                <td className="max-w-md px-4 py-2 text-xs break-words">
                  {r.message && <p>{r.message}</p>}
                  {r.stats && <code className="text-muted-foreground">{JSON.stringify(r.stats)}</code>}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">
                  Aucune exécution enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          {total} exécution{total > 1 ? "s" : ""}
        </span>
        <span className="flex gap-3">
          {page > 1 && <Link href={link({ page: String(page - 1) })}>← Plus récentes</Link>}
          {page * PAGE < total && <Link href={link({ page: String(page + 1) })}>Plus anciennes →</Link>}
        </span>
      </div>
    </div>
  );
}
