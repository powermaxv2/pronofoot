"use server";

import { z } from "zod";
import { prisma } from "@/server/db";
import { assertRateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";
import { safeAction, type ActionResult } from "./result";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  userAgent: z.string().max(300).optional(),
});

export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    assertRateLimit("write", `push:${user.id}`);
    const sub = subscriptionSchema.parse(input);
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: sub.userAgent,
      },
      update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: sub.userAgent },
    });
  }, "Notifications activées sur cet appareil.");
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  }, "Notifications désactivées sur cet appareil.");
}
