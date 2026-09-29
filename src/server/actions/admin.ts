"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { JOB_BY_NAME } from "@/server/jobs";
import { runJob, type JobRunSummary } from "@/server/jobs/runner";
import { assertRateLimit } from "@/server/rate-limit";
import { notifyMatchResults, recalculateAll, reopenMatch, scoreMatch } from "@/server/services/scoring";
import { recomputeStandings } from "@/server/services/standings";
import { awardPredictionBadges } from "@/server/services/badges";
import { requireAdmin } from "@/server/session";
import { safeAction, UserFacingError, type ActionResult } from "./result";

export async function runJobAction(name: string): Promise<ActionResult<JobRunSummary>> {
  return safeAction(async () => {
    const admin = await requireAdmin();
    assertRateLimit("admin", admin.id);
    const job = JOB_BY_NAME.get(name);
    if (!job) throw new UserFacingError("Tâche inconnue.");
    const summary = await runJob(job, "MANUAL");
    revalidatePath("/admin", "layout");
    return summary;
  });
}

export async function recalculateAction(
  competitionId?: string,
): Promise<ActionResult<{ matches: number; predictions: number; users: number }>> {
  return safeAction(async () => {
    const admin = await requireAdmin();
    assertRateLimit("admin", admin.id);
    const started = Date.now();
    const stats = await recalculateAll({ competitionId });
    await prisma.cronRun.create({
      data: {
        job: "recalcul",
        status: "SUCCESS",
        trigger: "MANUAL",
        finishedAt: new Date(),
        durationMs: Date.now() - started,
        message: `Recalcul complet lancé par ${admin.username}`,
        stats,
      },
    });
    revalidatePath("/", "layout");
    return stats;
  }, "Points recalculés.");
}

export async function setUserRoleAction(userId: string, role: "USER" | "ADMIN"): Promise<ActionResult> {
  return safeAction(
    async () => {
      const admin = await requireAdmin();
      if (userId === admin.id) throw new UserFacingError("Vous ne pouvez pas modifier votre propre rôle.");
      await prisma.user.update({ where: { id: userId }, data: { role } });
      revalidatePath("/admin/utilisateurs");
    },
    role === "ADMIN" ? "Promu administrateur." : "Droits d'administration retirés.",
  );
}

export async function setUserDisabledAction(userId: string, disabled: boolean): Promise<ActionResult> {
  return safeAction(
    async () => {
      const admin = await requireAdmin();
      if (userId === admin.id)
        throw new UserFacingError("Vous ne pouvez pas désactiver votre propre compte.");
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } }),
        // Déconnexion immédiate d'un compte désactivé.
        ...(disabled ? [prisma.session.deleteMany({ where: { userId } })] : []),
      ]);
      revalidatePath("/admin/utilisateurs");
    },
    disabled ? "Compte désactivé." : "Compte réactivé.",
  );
}

const manualScoreSchema = z.discriminatedUnion("status", [
  z.object({
    matchId: z.string(),
    status: z.literal("FINISHED"),
    homeScore: z.number().int().min(0).max(30),
    awayScore: z.number().int().min(0).max(30),
  }),
  z.object({ matchId: z.string(), status: z.enum(["POSTPONED", "CANCELLED", "SCHEDULED"]) }),
]);

/**
 * Saisie manuelle d'un résultat (API indisponible, correction). Le score est
 * protégé des synchronisations, les points sont recalculés immédiatement.
 */
export async function setManualResultAction(input: z.input<typeof manualScoreSchema>): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireAdmin();
    assertRateLimit("admin", admin.id);
    const data = manualScoreSchema.parse(input);
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { id: true, seasonId: true, status: true },
    });
    if (!match) throw new UserFacingError("Match introuvable.");
    if (data.status === "FINISHED") {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "FINISHED",
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          minute: null,
          manualScore: true,
        },
      });
    } else {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: data.status, homeScore: null, awayScore: null, minute: null, manualScore: true },
      });
      if (data.status === "SCHEDULED") await reopenMatch(match.id);
    }
    if (data.status !== "SCHEDULED") {
      const result = await scoreMatch(match.id, { force: true });
      if (result) {
        await awardPredictionBadges(result.userIds);
        await notifyMatchResults(match.id);
      }
    }
    await recomputeStandings(match.seasonId);
    revalidatePath("/", "layout");
  }, "Résultat enregistré et points recalculés.");
}

/** Rend la main aux synchronisations automatiques pour ce match. */
export async function releaseManualScoreAction(matchId: string): Promise<ActionResult> {
  return safeAction(async () => {
    await requireAdmin();
    await prisma.match.update({ where: { id: matchId }, data: { manualScore: false } });
    revalidatePath("/admin/matchs");
  }, "Le match suivra de nouveau l'API.");
}
