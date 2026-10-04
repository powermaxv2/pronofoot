import { prisma } from "@/server/db";
import { env } from "@/lib/env";
import { QuotaExceededError, type ProviderName } from "./types";

/** Fenêtre de quota : jour UTC (API-Football) ou minute (football-data.org). */
export function quotaWindow(provider: ProviderName, now: Date = new Date()): Date {
  const d = new Date(now);
  if (provider === "api-football") d.setUTCHours(0, 0, 0, 0);
  else d.setUTCSeconds(0, 0);
  return d;
}

export function quotaBudget(provider: ProviderName): number {
  return provider === "api-football" ? env().API_FOOTBALL_DAILY_BUDGET : env().FOOTBALL_DATA_MINUTE_BUDGET;
}

/** Réserve un appel (incrément atomique). Lève QuotaExceededError si le budget est dépassé. */
export async function reserveCall(provider: ProviderName, now: Date = new Date()): Promise<number> {
  const window = quotaWindow(provider, now);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "ApiUsage" ("provider", "window", "count") VALUES (${provider}, ${window}, 1)
    ON CONFLICT ("provider", "window") DO UPDATE SET "count" = "ApiUsage"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  const budget = quotaBudget(provider);
  if (count > budget) {
    throw new QuotaExceededError(
      provider,
      `${count - 1}/${budget} ${provider === "api-football" ? "aujourd'hui" : "cette minute"}`,
    );
  }
  return count;
}

/** Appels restants dans la fenêtre courante. */
export async function remainingCalls(provider: ProviderName, now: Date = new Date()): Promise<number> {
  const usage = await prisma.apiUsage.findUnique({
    where: { provider_window: { provider, window: quotaWindow(provider, now) } },
  });
  return Math.max(0, quotaBudget(provider) - (usage?.count ?? 0));
}

/** Consommation du jour (dashboard admin). */
export async function usageToday(provider: ProviderName, now: Date = new Date()): Promise<number> {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const agg = await prisma.apiUsage.aggregate({
    where: { provider, window: { gte: start } },
    _sum: { count: true },
  });
  return agg._sum.count ?? 0;
}
