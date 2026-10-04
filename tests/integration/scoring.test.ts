import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { jokerKey } from "@/server/domain/outcome";
import { recalculateAll, reopenMatch, scoreMatch, scorePendingMatches } from "@/server/services/scoring";
import { createMatch, createUser } from "./factories";

async function predict(
  userId: string,
  matchId: string,
  data: { outcome: "HOME" | "DRAW" | "AWAY"; home?: number; away?: number; joker?: boolean },
) {
  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  return prisma.prediction.create({
    data: {
      userId,
      matchId,
      outcome: data.outcome,
      homeScore: data.home ?? null,
      awayScore: data.away ?? null,
      isJoker: data.joker ?? false,
      jokerKey: data.joker ? jokerKey(userId, match.competitionId, match.seasonId, match.round) : null,
    },
  });
}

describe("calcul des points (service)", () => {
  it("note un match terminé selon le barème", async () => {
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    const match = await createMatch({ status: "FINISHED", homeScore: 2, awayScore: 1 });
    await predict(a.id, match.id, { outcome: "HOME", home: 2, away: 1, joker: true });
    await predict(b.id, match.id, { outcome: "HOME" });
    await predict(c.id, match.id, { outcome: "DRAW", home: 1, away: 1 });

    const stats = await scorePendingMatches({ notifyUsers: false });
    expect(stats.matches).toBe(1);

    const rows = await prisma.prediction.findMany({ where: { matchId: match.id } });
    const byUser = new Map(rows.map((r) => [r.userId, r]));
    expect(byUser.get(a.id)).toMatchObject({ state: "EXACT", points: 16 });
    expect(byUser.get(b.id)).toMatchObject({ state: "WON", points: 3 });
    expect(byUser.get(c.id)).toMatchObject({ state: "LOST", points: 0 });
    expect((await prisma.match.findUniqueOrThrow({ where: { id: match.id } })).scoredAt).not.toBeNull();
  });

  it("est idempotent : relancer ne double jamais les points", async () => {
    const user = await createUser();
    const match = await createMatch({ status: "FINISHED", homeScore: 0, awayScore: 0 });
    await predict(user.id, match.id, { outcome: "DRAW", home: 0, away: 0 });

    await scorePendingMatches({ notifyUsers: false });
    await scorePendingMatches({ notifyUsers: false });
    expect(await scoreMatch(match.id)).toBeNull();

    const agg = await prisma.prediction.aggregate({ where: { userId: user.id }, _sum: { points: true } });
    expect(agg._sum.points).toBe(8);
  });

  it("sérialise deux calculs concurrents du même match", async () => {
    const user = await createUser();
    const match = await createMatch({ status: "FINISHED", homeScore: 1, awayScore: 0 });
    await predict(user.id, match.id, { outcome: "HOME" });
    const results = await Promise.all([scoreMatch(match.id), scoreMatch(match.id), scoreMatch(match.id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("ne note pas un match non terminé", async () => {
    const user = await createUser();
    const match = await createMatch({ status: "LIVE", homeScore: 1, awayScore: 0 });
    await predict(user.id, match.id, { outcome: "HOME" });
    expect((await scorePendingMatches({ notifyUsers: false })).matches).toBe(0);
    expect(await scoreMatch(match.id)).toBeNull();
  });

  it("annule les pronostics d'un match reporté et rend le joker", async () => {
    const user = await createUser();
    const match = await createMatch({ status: "SCHEDULED", round: 9 });
    await predict(user.id, match.id, { outcome: "HOME", joker: true });
    await prisma.match.update({ where: { id: match.id }, data: { status: "POSTPONED" } });

    await scorePendingMatches({ notifyUsers: false });
    const voided = await prisma.prediction.findFirstOrThrow({ where: { matchId: match.id } });
    expect(voided).toMatchObject({ state: "VOID", points: 0, isJoker: false, jokerKey: null });

    // Le joker est de nouveau disponible pour un autre match de la même journée.
    const other = await createMatch({ status: "SCHEDULED", round: 9 });
    await expect(predict(user.id, other.id, { outcome: "AWAY", joker: true })).resolves.toBeTruthy();

    // Match reprogrammé : les pronostics redeviennent en attente.
    await prisma.match.update({ where: { id: match.id }, data: { status: "SCHEDULED" } });
    await reopenMatch(match.id);
    expect(await prisma.prediction.findFirstOrThrow({ where: { matchId: match.id } })).toMatchObject({
      state: "PENDING",
    });
  });

  it("recalcule tout après correction d'un score", async () => {
    const user = await createUser();
    const match = await createMatch({ status: "FINISHED", homeScore: 1, awayScore: 0 });
    await predict(user.id, match.id, { outcome: "HOME", home: 2, away: 0 });
    await scorePendingMatches({ notifyUsers: false });
    expect((await prisma.prediction.findFirstOrThrow({ where: { userId: user.id } })).points).toBe(3);

    await prisma.match.update({ where: { id: match.id }, data: { homeScore: 2, manualScore: true } });
    await recalculateAll();
    expect((await prisma.prediction.findFirstOrThrow({ where: { userId: user.id } })).points).toBe(8);
  });

  it("fige la part de la communauté à partir de 5 pronostics et attribue les badges", async () => {
    const users = await Promise.all(Array.from({ length: 6 }, () => createUser()));
    const match = await createMatch({ status: "FINISHED", homeScore: 0, awayScore: 1 });
    await predict(users[0]!.id, match.id, { outcome: "AWAY", home: 0, away: 1 });
    for (const u of users.slice(1)) await predict(u.id, match.id, { outcome: "HOME" });
    await scorePendingMatches({ notifyUsers: false });

    const underdog = await prisma.prediction.findFirstOrThrow({ where: { userId: users[0]!.id } });
    expect(underdog.crowdShare).toBeCloseTo(1 / 6);
    const badges = await prisma.userBadge.findMany({ where: { userId: users[0]!.id } });
    expect(badges.map((b) => b.badgeCode).sort()).toEqual(["EXACT_1", "FIRST_PICK", "UNDERDOG"]);
  });
});

describe("joker : un par journée (contrainte en base)", () => {
  it("refuse un second joker sur la même journée, même en concurrence", async () => {
    const user = await createUser();
    const [m1, m2, m3] = await Promise.all([
      createMatch({ round: 5 }),
      createMatch({ round: 5 }),
      createMatch({ round: 5 }),
    ]);
    const attempts = await Promise.allSettled([
      predict(user.id, m1.id, { outcome: "HOME", joker: true }),
      predict(user.id, m2.id, { outcome: "HOME", joker: true }),
      predict(user.id, m3.id, { outcome: "HOME", joker: true }),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.prediction.count({ where: { userId: user.id, isJoker: true } })).toBe(1);
  });

  it("autorise un joker par compétition sur la même journée", async () => {
    const user = await createUser();
    const l1 = await createMatch({ code: "FL1", round: 5 });
    const pl = await createMatch({ code: "PL", round: 5 });
    await predict(user.id, l1.id, { outcome: "HOME", joker: true });
    await expect(predict(user.id, pl.id, { outcome: "HOME", joker: true })).resolves.toBeTruthy();
  });
});
