import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { cardSelect, toCard } from "./matches";

export type PredictionTab = "upcoming" | "progress" | "history";
export const HISTORY_PAGE_SIZE = 24;

/** Matchs pronostiqués par le joueur selon leur avancement. */
export async function myPredictions(userId: string, tab: PredictionTab, { page = 1, now = new Date() } = {}) {
  const mine: Prisma.MatchWhereInput = { predictions: { some: { userId } } };
  const where: Prisma.MatchWhereInput =
    tab === "upcoming"
      ? { ...mine, status: "SCHEDULED", kickoffAt: { gt: now } }
      : tab === "progress"
        ? {
            ...mine,
            scoredAt: null,
            OR: [
              { status: { in: ["LIVE", "HALFTIME", "FINISHED"] } },
              { status: "SCHEDULED", kickoffAt: { lte: now } },
            ],
          }
        : { predictions: { some: { userId, scoredAt: { not: null } } } };
  const [rows, total] = await Promise.all([
    prisma.match.findMany({
      where,
      select: cardSelect(userId),
      orderBy: { kickoffAt: tab === "history" ? "desc" : "asc" },
      take: tab === "history" ? HISTORY_PAGE_SIZE * page : 100,
    }),
    prisma.match.count({ where }),
  ]);
  return { matches: rows.map(toCard), total };
}

/** Nombre de matchs des 7 prochains jours sans pronostic. */
export async function missingPredictions(userId: string, now = new Date()) {
  return prisma.match.count({
    where: {
      status: "SCHEDULED",
      kickoffAt: { gt: now, lt: new Date(now.getTime() + 7 * 86_400_000) },
      predictions: { none: { userId } },
    },
  });
}

/** Derniers pronostics notés (tableau de bord). */
export async function latestResults(userId: string, take = 6) {
  const rows = await prisma.match.findMany({
    where: { predictions: { some: { userId, scoredAt: { not: null } } } },
    select: cardSelect(userId),
    orderBy: { kickoffAt: "desc" },
    take,
  });
  return rows.map(toCard);
}
