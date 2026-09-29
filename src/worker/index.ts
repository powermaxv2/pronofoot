/**
 * Worker PronoFoot : planifie les tâches récurrentes (synchros, calcul des points,
 * rappels, maintenance). Lancé comme processus séparé (service `worker` du compose).
 */
import { Cron } from "croner";
import { APP_TZ } from "@/lib/dates";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { JOBS } from "@/server/jobs";
import { runJob } from "@/server/jobs/runner";
import { ensureBadges } from "@/server/services/badges";

async function main() {
  env(); // Valide la configuration dès le démarrage.
  await ensureBadges();
  const crons = JOBS.map(
    (job) =>
      new Cron(job.schedule, { name: job.name, timezone: APP_TZ, protect: true, catch: true }, async () => {
        const summary = await runJob(job, "SCHEDULE");
        if (summary.status === "ERROR") console.error(`[worker] ${job.name} en erreur : ${summary.message}`);
        else if (summary.status === "SUCCESS")
          console.info(`[worker] ${job.name} OK en ${summary.durationMs} ms`);
      }),
  );
  console.info(
    `[worker] ${crons.length} tâches planifiées (${APP_TZ}) : ${JOBS.map((j) => `${j.name} « ${j.schedule} »`).join(", ")}`,
  );

  const shutdown = async (signal: string) => {
    console.info(`[worker] arrêt (${signal})`);
    crons.forEach((c) => c.stop());
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch(async (error) => {
  console.error("[worker] échec au démarrage", error);
  await prisma.$disconnect();
  process.exit(1);
});
