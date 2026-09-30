import webpush from "web-push";
import { env, features } from "@/lib/env";
import { prisma } from "@/server/db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!features.push()) return false;
  webpush.setVapidDetails(env().VAPID_SUBJECT, env().NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env().VAPID_PRIVATE_KEY!);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Envoie une notification push à tous les appareils d'un utilisateur ; purge les abonnements expirés. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "normal" },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        else console.error(`[push] échec d'envoi : ${(error as Error).message}`);
      }
    }),
  );
  return sent;
}
