"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/session";
import { safeAction, type ActionResult } from "./result";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ count: number }>> {
  return safeAction(async () => {
    const user = await requireUser();
    const { count } = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { count };
  });
}
