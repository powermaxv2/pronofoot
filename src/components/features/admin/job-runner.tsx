"use client";

import type { CronStatus } from "@prisma/client";
import { AnimatePresence, m } from "motion/react";
import { Play, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { spring } from "@/lib/motion";
import { recalculateAction, runJobAction } from "@/server/actions/admin";
import { StatusChip } from "./status-chip";

type Job = {
  name: string;
  label: string;
  description: string;
  schedule: string;
  last: { status: CronStatus; message: string | null; at: string } | null;
};

function JobCard({ job }: { job: Job }) {
  const [pending, start] = useTransition();
  const [last, setLast] = useState(job.last);
  const run = () =>
    start(async () => {
      const result = await runJobAction(job.name);
      if (!result.ok) return void toast.error(result.error);
      const s = result.data;
      setLast({ status: s.status, message: s.message, at: new Date().toISOString() });
      const detail =
        s.message ??
        (s.stats
          ? Object.entries(s.stats)
              .map(([k, v]) => `${k} : ${v}`)
              .join(" · ")
          : undefined);
      if (s.status === "ERROR") toast.error(`${job.label} : échec`, { description: detail });
      else if (s.status === "SKIPPED") toast.info(`${job.label} : ignoré`, { description: detail });
      else toast.success(`${job.label} : terminé en ${s.durationMs} ms`, { description: detail });
    });
  return (
    <li className="glass grid gap-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-condensed text-lg font-bold tracking-wide uppercase">{job.label}</h3>
          <p className="text-muted-foreground text-sm">{job.description}</p>
        </div>
        <Button variant="volt" size="sm" onClick={run} loading={pending}>
          <Play /> Lancer
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <code className="bg-surface-strong rounded px-1.5 py-0.5">{job.schedule}</code>
        <code className="text-muted-foreground">{job.name}</code>
        <AnimatePresence mode="wait">
          {last && (
            <m.span
              key={last.at}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.bouncy}
              className="ml-auto flex items-center gap-2"
            >
              <StatusChip status={last.status} />
              {last.message && (
                <span className="text-muted-foreground max-w-[28ch] truncate">{last.message}</span>
              )}
            </m.span>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

export function JobRunner({ jobs }: { jobs: Job[] }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-5">
      <ul className="grid gap-3 md:grid-cols-2">
        {jobs.map((j) => (
          <JobCard key={j.name} job={j} />
        ))}
      </ul>
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <h3 className="font-condensed text-lg font-bold tracking-wide uppercase">
            Recalcul complet des points
          </h3>
          <p className="text-muted-foreground text-sm">
            Renote tous les matchs terminés (après une correction de résultat, par exemple).
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <RotateCcw /> Recalculer
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          title="Recalculer tous les points ?"
          description="L'opération est idempotente : le résultat est identique si aucun score n'a changé. Elle peut prendre quelques secondes."
        >
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button
              variant="volt"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await recalculateAction();
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(r.message ?? "Recalculé", {
                    description: `${r.data.matches} matchs, ${r.data.predictions} pronostics, ${r.data.users} joueurs.`,
                  });
                  setConfirm(false);
                })
              }
            >
              Recalculer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
