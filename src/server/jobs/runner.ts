import type { CronTrigger, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export type JobContext = { trigger: CronTrigger; now: Date };
export type JobResult = { skipped?: boolean; message?: string; stats?: Record<string, number | string> };

export type JobDefinition = {
  name: string;
  label: string;
  description: string;
  /** Expression cron (fuseau Europe/Paris). */
  schedule: string;
  run: (ctx: JobContext) => Promise<JobResult>;
};

export type JobRunSummary = {
  job: string;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  message: string | null;
  durationMs: number;
  stats: Record<string, number | string> | null;
};

/**
 * Exécute un job en le journalisant dans CronRun. Un verrou consultatif Postgres
 * (tenu par une transaction) garantit qu'un même job ne tourne jamais deux fois
 * en parallèle (worker + déclenchement manuel depuis l'admin).
 */
export async function runJob(job: JobDefinition, trigger: CronTrigger = "SCHEDULE"): Promise<JobRunSummary> {
  const started = Date.now();
  const run = await prisma.cronRun.create({ data: { job: job.name, status: "RUNNING", trigger } });

  const finish = async (
    status: JobRunSummary["status"],
    message: string | null,
    stats: JobRunSummary["stats"],
  ) => {
    const durationMs = Date.now() - started;
    await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status,
        message,
        stats: (stats ?? undefined) as Prisma.InputJsonValue | undefined,
        finishedAt: new Date(),
        durationMs,
      },
    });
    return { job: job.name, status, message, durationMs, stats };
  };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const [lock] = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(hashtext(${`pronofoot:job:${job.name}`})) AS locked`;
        if (!lock?.locked) return finish("SKIPPED", "Déjà en cours d'exécution.", null);
        const result = await job.run({ trigger, now: new Date() });
        return finish(result.skipped ? "SKIPPED" : "SUCCESS", result.message ?? null, result.stats ?? null);
      },
      { timeout: 15 * 60_000, maxWait: 10_000 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[job ${job.name}] ${message}`);
    return finish("ERROR", message.slice(0, 2000), null);
  }
}
