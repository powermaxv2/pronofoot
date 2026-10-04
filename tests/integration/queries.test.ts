import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { communityStats, getMatchDetail, listMatches } from "@/server/queries/matches";
import { createMatch, createUser } from "./factories";

describe("requêtes des matchs", () => {
  it("masque la répartition de la communauté avant le coup d'envoi", async () => {
    const users = await Promise.all([createUser(), createUser(), createUser()]);
    const kickoff = new Date("2026-10-03T19:00:00Z");
    const match = await createMatch({ kickoffAt: kickoff });
    await prisma.prediction.createMany({
      data: [
        { userId: users[0]!.id, matchId: match.id, outcome: "HOME", homeScore: 2, awayScore: 1 },
        { userId: users[1]!.id, matchId: match.id, outcome: "HOME", homeScore: 2, awayScore: 1 },
        { userId: users[2]!.id, matchId: match.id, outcome: "AWAY" },
      ],
    });
    expect(await communityStats(match.id, match, new Date("2026-10-03T18:59:00Z"))).toBeNull();
    const after = await communityStats(match.id, match, kickoff);
    expect(after?.total).toBe(3);
    expect(after?.distribution.HOME).toBeCloseTo(2 / 3);
    expect(after?.topScores).toEqual([{ score: "2-1", share: 1 }]);
  });

  it("filtre par onglet et par compétition, avec le pronostic du joueur", async () => {
    const user = await createUser();
    const now = new Date("2026-10-03T12:00:00Z");
    const upcoming = await createMatch({ code: "FL1", kickoffAt: new Date("2026-10-04T15:00:00Z") });
    await createMatch({ code: "PL", kickoffAt: new Date("2026-10-04T15:00:00Z") });
    await createMatch({
      code: "FL1",
      status: "FINISHED",
      homeScore: 1,
      awayScore: 0,
      kickoffAt: new Date("2026-10-01T19:00:00Z"),
    });
    await createMatch({
      code: "FL1",
      status: "LIVE",
      homeScore: 0,
      awayScore: 0,
      kickoffAt: new Date("2026-10-03T11:30:00Z"),
    });
    await prisma.prediction.create({
      data: { userId: user.id, matchId: upcoming.id, outcome: "DRAW", isJoker: true },
    });

    const fl1 = await listMatches({ tab: "upcoming", competitions: ["FL1"], userId: user.id, now });
    expect(fl1.map((m) => m.id)).toEqual([upcoming.id]);
    expect(fl1[0]!.prediction).toMatchObject({ outcome: "DRAW", isJoker: true });
    expect(await listMatches({ tab: "upcoming", competitions: [], userId: user.id, now })).toHaveLength(2);
    expect(await listMatches({ tab: "finished", competitions: [], userId: user.id, now })).toHaveLength(1);
    expect(await listMatches({ tab: "live", competitions: [], userId: user.id, now })).toHaveLength(1);
    const day = await listMatches({
      tab: "upcoming",
      competitions: [],
      day: "2026-10-05",
      userId: user.id,
      now,
    });
    expect(day).toHaveLength(0);
  });

  it("signale un joker déjà posé sur la même journée", async () => {
    const user = await createUser();
    const a = await createMatch({ round: 3, kickoffAt: new Date("2026-10-04T15:00:00Z") });
    const b = await createMatch({ round: 3, kickoffAt: new Date("2026-10-04T17:00:00Z") });
    await prisma.prediction.create({
      data: { userId: user.id, matchId: a.id, outcome: "HOME", isJoker: true, jokerKey: "x" },
    });
    const detail = await getMatchDetail(b.id, user.id, new Date("2026-10-03T12:00:00Z"));
    expect(detail?.otherJoker?.id).toBe(a.id);
    expect(detail?.locked).toBe(false);
    expect(detail?.community).toBeNull();
  });
});
