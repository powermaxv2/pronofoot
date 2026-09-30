import { describe, expect, it } from "vitest";
import type { PredictionState } from "@prisma/client";
import { badgesFromStats, BADGES } from "@/server/domain/badges";
import { rankDelta, rankLeaderboard } from "@/server/domain/leaderboard";
import { computeStats, type StatPrediction } from "@/server/domain/stats";

let day = 0;
function p(state: PredictionState, extra: Partial<StatPrediction> = {}): StatPrediction {
  day += 1;
  const points = state === "EXACT" ? 8 : state === "WON" ? 3 : 0;
  return {
    state,
    points: extra.isJoker ? points * 2 : points,
    isJoker: false,
    competitionCode: "FL1",
    kickoffAt: new Date(Date.UTC(2026, 7, 1) + day * 86_400_000),
    crowdShare: null,
    ...extra,
  };
}

describe("statistiques personnelles", () => {
  it("calcule taux de réussite, séries et points", () => {
    const s = computeStats([p("WON"), p("EXACT"), p("LOST"), p("WON"), p("WON"), p("PENDING"), p("VOID")]);
    expect(s.total).toBe(5);
    expect(s.won).toBe(4);
    expect(s.exact).toBe(1);
    expect(s.points).toBe(3 + 8 + 3 + 3);
    expect(s.successRate).toBeCloseTo(0.8);
    expect(s.bestStreak).toBe(2);
    expect(s.currentStreak).toBe(2);
  });

  it("ordonne les séries par date de coup d'envoi", () => {
    const late = p("LOST", { kickoffAt: new Date("2027-01-01") });
    const s = computeStats([late, p("WON"), p("WON")]);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
  });

  it("désigne le meilleur championnat (5 pronostics minimum)", () => {
    const preds = [
      ...Array.from({ length: 5 }, () => p("WON", { competitionCode: "PL" })),
      ...Array.from({ length: 5 }, () => p("EXACT", { competitionCode: "SA" })),
      p("EXACT", { competitionCode: "CL" }),
    ];
    const s = computeStats(preds);
    expect(s.bestCompetition?.code).toBe("SA");
    expect(s.competitions.find((c) => c.code === "CL")?.count).toBe(1);
  });

  it("n'a pas de meilleur championnat sans assez de pronostics", () => {
    expect(computeStats([p("WON")]).bestCompetition).toBeNull();
  });
});

describe("badges", () => {
  it("définit 12 badges uniques", () => {
    expect(BADGES).toHaveLength(12);
    expect(new Set(BADGES.map((b) => b.code)).size).toBe(12);
  });

  it("attribue les badges de série, de score exact et de joker", () => {
    const preds = [
      ...Array.from({ length: 10 }, () => p("EXACT")),
      p("EXACT", { isJoker: true }),
      p("WON", { crowdShare: 0.12 }),
    ];
    const codes = badgesFromStats(computeStats(preds));
    expect(codes).toEqual(
      expect.arrayContaining([
        "FIRST_PICK",
        "STREAK_5",
        "STREAK_10",
        "EXACT_1",
        "EXACT_10",
        "JOKER_EXACT",
        "UNDERDOG",
      ]),
    );
    expect(codes).not.toContain("EXACT_25");
    expect(codes).not.toContain("GLOBETROTTER");
  });

  it("attribue Globe-trotter avec les 6 compétitions", () => {
    const preds = ["FL1", "PL", "PD", "SA", "BL1", "CL"].map((c) => p("LOST", { competitionCode: c }));
    expect(badgesFromStats(computeStats(preds))).toContain("GLOBETROTTER");
  });

  it("n'attribue rien sans pronostic noté", () => {
    expect(badgesFromStats(computeStats([p("PENDING")]))).toEqual([]);
  });
});

describe("classement", () => {
  const joined = (d: string) => new Date(d);
  it("départage points → exacts → bons résultats → ancienneté", () => {
    const ranked = rankLeaderboard([
      { userId: "a", points: 30, exact: 2, won: 6, predictions: 10, joinedAt: joined("2026-08-02") },
      { userId: "b", points: 30, exact: 3, won: 5, predictions: 10, joinedAt: joined("2026-08-03") },
      { userId: "c", points: 42, exact: 1, won: 9, predictions: 10, joinedAt: joined("2026-08-04") },
      { userId: "d", points: 30, exact: 2, won: 6, predictions: 10, joinedAt: joined("2026-08-01") },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["c", "b", "d", "a"]);
    // d et a sont à égalité parfaite (hors ancienneté) : même rang.
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 3]);
  });

  it("calcule la variation de rang", () => {
    expect(rankDelta(2, 5)).toBe(3);
    expect(rankDelta(4, 1)).toBe(-3);
    expect(rankDelta(1, undefined)).toBeNull();
  });
});
