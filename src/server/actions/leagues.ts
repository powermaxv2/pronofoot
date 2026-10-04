"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRateLimit } from "@/server/rate-limit";
import * as leagues from "@/server/services/leagues";
import { requireUser } from "@/server/session";
import { safeAction, UserFacingError, type ActionResult } from "./result";

async function run<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof leagues.LeagueError) throw new UserFacingError(error.message);
    throw error;
  }
}

export async function createLeagueAction(input: {
  name: string;
  description?: string;
  emoji: string;
  color: string;
}): Promise<ActionResult<{ slug: string }>> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `league:${user.id}`);
    const league = await run(() => leagues.createLeague(user.id, input));
    revalidatePath("/ligues");
    return { slug: league.slug };
  }, "Ligue créée !");
}

export async function updateLeagueAction(
  leagueId: string,
  input: { name: string; description?: string; emoji: string; color: string },
): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `league:${user.id}`);
    const league = await run(() => leagues.updateLeague(user.id, leagueId, input));
    revalidatePath(`/ligues/${league.slug}`);
  }, "Ligue mise à jour.");
}

export async function joinLeagueAction(
  code: string,
): Promise<ActionResult<{ slug: string; joined: boolean }>> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `join:${user.id}`);
    const { league, joined } = await run(() => leagues.joinLeague(user.id, code));
    revalidatePath("/ligues");
    return { slug: league.slug, joined };
  });
}

export async function leaveLeagueAction(leagueId: string): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const user = await requireUser();
    await run(() => leagues.leaveLeague(user.id, leagueId));
  });
  if (result.ok) {
    revalidatePath("/ligues");
    redirect("/ligues");
  }
  return result;
}

export async function removeMemberAction(leagueId: string, memberId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await run(() => leagues.removeMember(user.id, leagueId, memberId));
    revalidatePath("/ligues", "layout");
  }, "Membre retiré.");
}

export async function transferLeagueAction(leagueId: string, memberId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await run(() => leagues.transferLeague(user.id, leagueId, memberId));
    revalidatePath("/ligues", "layout");
  }, "La ligue a un nouveau président.");
}

export async function regenerateCodeAction(leagueId: string): Promise<ActionResult<{ code: string }>> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `league:${user.id}`);
    const league = await run(() => leagues.regenerateInviteCode(user.id, leagueId));
    revalidatePath("/ligues", "layout");
    return { code: league.inviteCode };
  }, "Nouveau code généré : l'ancien ne fonctionne plus.");
}

export async function deleteLeagueAction(leagueId: string): Promise<ActionResult> {
  const result = await safeAction(async () => {
    const user = await requireUser();
    await run(() => leagues.deleteLeague(user.id, leagueId));
  });
  if (result.ok) {
    revalidatePath("/ligues");
    redirect("/ligues");
  }
  return result;
}
