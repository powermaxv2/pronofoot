import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { ProviderName } from "./types";

export const TTL = {
  fixtures: 6 * 3600_000,
  live: 45_000,
  standings: 6 * 3600_000,
  lineups: 10 * 60_000,
  headToHead: 7 * 24 * 3600_000,
} as const;

const inflight = new Map<string, Promise<unknown>>();

/**
 * Lit la réponse en cache (Postgres) ou appelle `fetcher`, puis met en cache.
 * Les appels concurrents identiques sont dédupliqués. En cas d'échec réseau,
 * une réponse expirée est servie si elle existe.
 */
export async function cached<T>(
  provider: ProviderName,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  now: () => Date = () => new Date(),
): Promise<T> {
  const fullKey = `${provider}:${key}`;
  const hit = await prisma.apiCache.findUnique({ where: { key: fullKey } });
  if (hit && hit.expiresAt > now()) return hit.payload as T;

  const pending = inflight.get(fullKey);
  if (pending) return pending as Promise<T>;

  const task = (async () => {
    try {
      const payload = await fetcher();
      const json = payload as unknown as Prisma.InputJsonValue;
      const expiresAt = new Date(now().getTime() + ttlMs);
      await prisma.apiCache.upsert({
        where: { key: fullKey },
        create: { key: fullKey, provider, payload: json, expiresAt },
        update: { payload: json, fetchedAt: now(), expiresAt },
      });
      return payload;
    } catch (error) {
      if (hit) return hit.payload as T;
      throw error;
    } finally {
      inflight.delete(fullKey);
    }
  })();
  inflight.set(fullKey, task);
  return task;
}
