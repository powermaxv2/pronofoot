import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { runJob, type JobDefinition } from "@/server/jobs/runner";
import { getLeaderboard, monthlyWinner } from "@/server/services/leaderboards";
import { scorePendingMatches } from "@/server/services/scoring";
import { createMatch, createUser } from "./factories";

describe("classements", () => {
  it("classe par période, par ligue et calcule la variation", async () => {
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    const sept = await createMatch({
      status: "FINISHED",
      homeScore: 1,
      awayScore: 0,
      kickoffAt: new Date("2026-09-12T19:00:00Z"),
    });
    const oct = await createMatch({
      status: "FINISHED",
      homeScore: 2,
      awayScore: 2,
      kickoffAt: new Date("2026-10-03T19:00:00Z"),
    });
    await prisma.prediction.createMany({
      data: [
        { userId: a.id, matchId: sept.id, outcome: "HOME", homeScore: 1, awayScore: 0 },
        { userId: b.id, matchId: sept.id, outcome: "HOME" },
        { userId: b.id, matchId: oct.id, outcome: "DRAW", homeScore: 2, awayScore: 2 },
        { userId: c.id, matchId: oct.id, outcome: "AWAY" },
      ],
    });
    await scorePendingMatches({ notifyUsers: false, now: new Date("2026-10-03T21:00:00Z") });

    const season = await getLeaderboard({ period: { type: "season" } }, new Date("2026-10-04T10:00:00Z"));
    expect(season.map((r) => [r.user.username, r.points, r.rank])).toEqual([
      [b.username, 11, 1],
      [a.username, 8, 2],
      [c.username, 0, 3],
    ]);

    // Variation : par rapport au classement d'avant les matchs du jour (3 octobre, Paris).
    const sameDay = await getLeaderboard({ period: { type: "season" } }, new Date("2026-10-03T21:30:00Z"));
    expect(sameDay.map((r) => [r.user.username, r.delta])).toEqual([
      [b.username, 1],
      [a.username, -1],
      [c.username, null],
    ]);

    const september = await getLeaderboard({
      period: {
        type: "month",
        start: new Date("2026-08-31T22:00:00Z"),
        end: new Date("2026-09-30T22:00:00Z"),
      },
    });
    expect(september.map((r) => r.user.username)).toEqual([a.username, b.username]);
    expect(
      (await monthlyWinner(new Date("2026-08-31T22:00:00Z"), new Date("2026-09-30T22:00:00Z")))?.userId,
    ).toBe(a.id);

    const league = await prisma.league.create({
      data: {
        name: "Test",
        slug: "test",
        inviteCode: "ABCDEFGH",
        ownerId: c.id,
        members: { create: [{ userId: c.id, role: "OWNER" }, { userId: a.id }] },
      },
    });
    const inLeague = await getLeaderboard({ period: { type: "season" }, leagueId: league.id });
    expect(inLeague.map((r) => r.user.username)).toEqual([a.username, c.username]);
  });
});

describe("exécution des jobs", () => {
  it("journalise les exécutions et empêche deux exécutions simultanées", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: JobDefinition = {
      name: "test:slow",
      label: "Test",
      description: "",
      schedule: "* * * * *",
      run: async () => {
        await gate;
        return { stats: { ok: 1 } };
      },
    };
    const first = runJob(slow, "MANUAL");
    await new Promise((r) => setTimeout(r, 300));
    const second = await runJob(slow, "SCHEDULE");
    release();
    expect(second.status).toBe("SKIPPED");
    expect((await first).status).toBe("SUCCESS");

    const failing: JobDefinition = {
      ...slow,
      name: "test:fail",
      run: async () => Promise.reject(new Error("boum")),
    };
    expect(await runJob(failing)).toMatchObject({ status: "ERROR", message: "boum" });
    const runs = await prisma.cronRun.findMany({ orderBy: { startedAt: "asc" } });
    expect(runs.map((r) => r.status)).toEqual(["SUCCESS", "SKIPPED", "ERROR"]);
    expect(runs[0]!.trigger).toBe("MANUAL");
  });
});
