import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { PredictionLockedError } from "@/server/domain/locking";
import { deletePrediction, PredictionError, upsertPrediction } from "@/server/services/predictions";
import { scoreMatch } from "@/server/services/scoring";
import { createMatch, createUser } from "./factories";

const KICKOFF = new Date("2026-10-03T19:00:00Z");
const BEFORE = new Date("2026-10-03T18:00:00Z");

describe("verrouillage des pronostics (serveur)", () => {
  it("accepte puis modifie un prono avant le coup d'envoi", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF });
    await upsertPrediction(
      user.id,
      { matchId: match.id, outcome: "HOME", homeScore: 2, awayScore: 0, isJoker: false },
      BEFORE,
    );
    await upsertPrediction(
      user.id,
      { matchId: match.id, outcome: "DRAW", homeScore: 1, awayScore: 1, isJoker: false },
      BEFORE,
    );
    const rows = await prisma.prediction.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ outcome: "DRAW", homeScore: 1, awayScore: 1 });
  });

  it("refuse toute écriture à partir du coup d'envoi", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF });
    const input = {
      matchId: match.id,
      outcome: "HOME" as const,
      homeScore: null,
      awayScore: null,
      isJoker: false,
    };
    await expect(upsertPrediction(user.id, input, KICKOFF)).rejects.toBeInstanceOf(PredictionLockedError);
    await expect(upsertPrediction(user.id, input, new Date("2026-10-03T19:45:00Z"))).rejects.toBeInstanceOf(
      PredictionLockedError,
    );
    expect(await prisma.prediction.count()).toBe(0);
  });

  it("refuse la modification et la suppression une fois verrouillé", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF });
    await upsertPrediction(
      user.id,
      { matchId: match.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: false },
      BEFORE,
    );
    await expect(
      upsertPrediction(
        user.id,
        { matchId: match.id, outcome: "AWAY", homeScore: null, awayScore: null, isJoker: false },
        KICKOFF,
      ),
    ).rejects.toThrow(/commencé/);
    await expect(deletePrediction(user.id, match.id, KICKOFF)).rejects.toBeInstanceOf(PredictionLockedError);
    expect((await prisma.prediction.findFirstOrThrow({ where: { userId: user.id } })).outcome).toBe("HOME");
  });

  it("refuse dès que le match n'est plus programmé, même si l'horloge est en avance", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF, status: "LIVE" });
    await expect(
      upsertPrediction(
        user.id,
        { matchId: match.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: false },
        BEFORE,
      ),
    ).rejects.toBeInstanceOf(PredictionLockedError);
  });

  it("rejette un score incohérent avec le 1N2", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF });
    await expect(
      upsertPrediction(
        user.id,
        { matchId: match.id, outcome: "AWAY", homeScore: 2, awayScore: 0, isJoker: false },
        BEFORE,
      ),
    ).rejects.toThrow();
  });

  it("n'accepte pas d'écriture pendant le calcul des points (verrou de ligne)", async () => {
    const user = await createUser();
    const match = await createMatch({ kickoffAt: KICKOFF, status: "FINISHED", homeScore: 1, awayScore: 0 });
    const [write, score] = await Promise.allSettled([
      upsertPrediction(
        user.id,
        { matchId: match.id, outcome: "HOME", homeScore: 1, awayScore: 0, isJoker: false },
        BEFORE,
      ),
      scoreMatch(match.id),
    ]);
    expect(write.status).toBe("rejected");
    expect(score.status).toBe("fulfilled");
  });
});

describe("joker", () => {
  it("déplace le joker vers un autre match encore ouvert de la journée", async () => {
    const user = await createUser();
    const a = await createMatch({ round: 4, kickoffAt: KICKOFF });
    const b = await createMatch({ round: 4, kickoffAt: new Date("2026-10-04T15:00:00Z") });
    await upsertPrediction(
      user.id,
      { matchId: a.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: true },
      BEFORE,
    );
    const result = await upsertPrediction(
      user.id,
      { matchId: b.id, outcome: "AWAY", homeScore: null, awayScore: null, isJoker: true },
      BEFORE,
    );
    expect(result.movedJokerFrom).toBe(a.id);
    const jokers = await prisma.prediction.findMany({ where: { userId: user.id, isJoker: true } });
    expect(jokers.map((j) => j.matchId)).toEqual([b.id]);
  });

  it("refuse de déplacer un joker déjà joué", async () => {
    const user = await createUser();
    const early = await createMatch({ round: 4, kickoffAt: new Date("2026-10-03T13:00:00Z") });
    const late = await createMatch({ round: 4, kickoffAt: KICKOFF });
    await upsertPrediction(
      user.id,
      { matchId: early.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: true },
      new Date("2026-10-03T12:00:00Z"),
    );
    await expect(
      upsertPrediction(
        user.id,
        { matchId: late.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: true },
        BEFORE,
      ),
    ).rejects.toBeInstanceOf(PredictionError);
    // Sans joker, le prono reste possible.
    await expect(
      upsertPrediction(
        user.id,
        { matchId: late.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: false },
        BEFORE,
      ),
    ).resolves.toBeTruthy();
  });

  it("garde un seul joker par journée sous requêtes concurrentes", async () => {
    const user = await createUser();
    const matches = await Promise.all(
      [1, 2, 3, 4].map((h) => createMatch({ round: 6, kickoffAt: new Date(`2026-10-04T1${h}:00:00Z`) })),
    );
    await Promise.allSettled(
      matches.map((m) =>
        upsertPrediction(
          user.id,
          { matchId: m.id, outcome: "HOME", homeScore: null, awayScore: null, isJoker: true },
          BEFORE,
        ),
      ),
    );
    expect(await prisma.prediction.count({ where: { userId: user.id, isJoker: true } })).toBe(1);
  });
});
