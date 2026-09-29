import type { Metadata } from "next";
import { JobRunner } from "@/components/features/admin/job-runner";
import { prisma } from "@/server/db";
import { JOBS } from "@/server/jobs";

export const metadata: Metadata = { title: "Synchronisation · Admin" };

export default async function AdminSync() {
  const jobs = await Promise.all(
    JOBS.map(async (j) => {
      const run = await prisma.cronRun.findFirst({ where: { job: j.name }, orderBy: { startedAt: "desc" } });
      return {
        name: j.name,
        label: j.label,
        description: j.description,
        schedule: j.schedule,
        last: run ? { status: run.status, message: run.message, at: run.startedAt.toISOString() } : null,
      };
    }),
  );
  return <JobRunner jobs={jobs} />;
}
