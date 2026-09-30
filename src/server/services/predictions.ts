import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { assertPredictionOpen, isPredictionOpen, PredictionLockedError } from "@/server/domain/locking";
import { jokerKey } from "@/server/domain/outcome";
import { predictionSchema, type PredictionInput } from "@/lib/validation";

export class PredictionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PredictionError";
  }
}

type LockedMatch = {
  id: string;
  kickoffAt: Date;
  status: string;
  competitionId: string;
  seasonId: string;
  round: number;
};

/** Verrouille la ligne du match pendant la transaction (sérialise écriture de prono et calcul des points). */
async function lockMatch(tx: Prisma.TransactionClient, matchId: string) {
  const rows = await tx.$queryRaw<LockedMatch[]>`
    SELECT id, "kickoffAt", status::text AS status, "competitionId", "seasonId", round
    FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
  const match = rows[0];
  if (!match) throw new PredictionError("Match introuvable.");
  return match as LockedMatch & { status: Prisma.MatchGetPayload<object>["status"] };
}

/**
 * Crée ou modifie un pronostic. Le verrouillage est vérifié côté serveur,
 * dans la transaction qui écrit (horloge serveur, jamais celle du client).
 * Un joker déjà posé sur un autre match encore ouvert de la même journée y est retiré.
 */
export async function upsertPrediction(userId: string, raw: PredictionInput, now: Date = new Date()) {
  const input = predictionSchema.parse(raw);
  try {
    return await prisma.$transaction(async (tx) => {
      const match = await lockMatch(tx, input.matchId);
      assertPredictionOpen(match, now);
      const key = input.isJoker ? jokerKey(userId, match.competitionId, match.seasonId, match.round) : null;
      let movedFrom: string | null = null;
      if (key) {
        const holder = await tx.prediction.findUnique({
          where: { jokerKey: key },
          select: { id: true, matchId: true, match: { select: { kickoffAt: true, status: true } } },
        });
        if (holder && holder.matchId !== match.id) {
          if (!isPredictionOpen(holder.match, now)) {
            throw new PredictionError("Votre joker de cette journée est déjà joué sur un match commencé.");
          }
          await tx.prediction.update({ where: { id: holder.id }, data: { isJoker: false, jokerKey: null } });
          movedFrom = holder.matchId;
        }
      }
      const data = {
        outcome: input.outcome,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        isJoker: input.isJoker,
        jokerKey: key,
      };
      const prediction = await tx.prediction.upsert({
        where: { userId_matchId: { userId, matchId: match.id } },
        create: { userId, matchId: match.id, ...data },
        update: data,
      });
      return { prediction, movedJokerFrom: movedFrom };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PredictionError("Vous avez déjà posé votre joker sur un autre match de cette journée.");
    }
    throw error;
  }
}

/** Supprime un pronostic tant que le match n'a pas commencé. */
export async function deletePrediction(userId: string, matchId: string, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const match = await lockMatch(tx, matchId);
    assertPredictionOpen(match, now);
    await tx.prediction.deleteMany({ where: { userId, matchId } });
  });
}

export { PredictionLockedError };
