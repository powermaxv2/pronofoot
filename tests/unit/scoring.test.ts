import { describe, expect, it } from "vitest";
import {
  MAX_POINTS_PER_MATCH,
  POINTS,
  crowdDistribution,
  isScorable,
  scorePrediction,
  type ScorableMatch,
  type ScorablePrediction,
} from "@/server/domain/scoring";
import { isScoreConsistent, jokerKey, outcomeFromScore } from "@/server/domain/outcome";

const finished = (home: number, away: number): ScorableMatch => ({
  status: "FINISHED",
  homeScore: home,
  awayScore: away,
});
const pick = (p: Partial<ScorablePrediction> & Pick<ScorablePrediction, "outcome">): ScorablePrediction => ({
  homeScore: null,
  awayScore: null,
  isJoker: false,
  ...p,
});

describe("barème", () => {
  it("vaut 3 / +5 / ×2", () => {
    expect(POINTS).toEqual({ result: 3, exact: 5, jokerMultiplier: 2 });
    expect(MAX_POINTS_PER_MATCH).toBe(16);
  });

  it("donne 3 points pour un bon résultat sans score", () => {
    expect(scorePrediction(pick({ outcome: "HOME" }), finished(2, 1))).toEqual({
      state: "WON",
      points: 3,
      breakdown: { result: 3, exact: 0, multiplier: 1 },
    });
  });

  it("donne 3 points pour un bon résultat avec un score faux", () => {
    const r = scorePrediction(pick({ outcome: "HOME", homeScore: 3, awayScore: 0 }), finished(2, 1));
    expect(r.state).toBe("WON");
    expect(r.points).toBe(3);
  });

  it("donne 8 points pour un score exact", () => {
    const r = scorePrediction(pick({ outcome: "HOME", homeScore: 2, awayScore: 1 }), finished(2, 1));
    expect(r).toEqual({ state: "EXACT", points: 8, breakdown: { result: 3, exact: 5, multiplier: 1 } });
  });

  it("gère le nul exact", () => {
    const r = scorePrediction(pick({ outcome: "DRAW", homeScore: 0, awayScore: 0 }), finished(0, 0));
    expect(r.points).toBe(8);
  });

  it("donne 0 point pour un mauvais résultat", () => {
    const r = scorePrediction(pick({ outcome: "AWAY", homeScore: 0, awayScore: 1 }), finished(1, 1));
    expect(r).toEqual({ state: "LOST", points: 0, breakdown: { result: 0, exact: 0, multiplier: 1 } });
  });

  it("double les points avec le joker", () => {
    expect(scorePrediction(pick({ outcome: "AWAY", isJoker: true }), finished(0, 2)).points).toBe(6);
    expect(
      scorePrediction(pick({ outcome: "AWAY", homeScore: 0, awayScore: 2, isJoker: true }), finished(0, 2))
        .points,
    ).toBe(16);
    expect(scorePrediction(pick({ outcome: "HOME", isJoker: true }), finished(0, 2)).points).toBe(0);
  });

  it("annule le pronostic d'un match reporté ou annulé", () => {
    for (const status of ["POSTPONED", "CANCELLED"] as const) {
      const r = scorePrediction(pick({ outcome: "HOME", isJoker: true }), {
        status,
        homeScore: null,
        awayScore: null,
      });
      expect(r).toEqual({ state: "VOID", points: 0, breakdown: { result: 0, exact: 0, multiplier: 1 } });
    }
  });

  it("refuse de noter un match non terminé", () => {
    expect(() =>
      scorePrediction(pick({ outcome: "HOME" }), { status: "LIVE", homeScore: 1, awayScore: 0 }),
    ).toThrow();
    expect(() =>
      scorePrediction(pick({ outcome: "HOME" }), { status: "FINISHED", homeScore: null, awayScore: null }),
    ).toThrow();
    expect(isScorable({ status: "HALFTIME", homeScore: 1, awayScore: 0 })).toBe(false);
  });

  it("se base sur le temps réglementaire (le score stocké), pas sur les tirs au but", () => {
    // 1-1 après 90 min, qualification aux tirs au but : le nul est le bon résultat.
    expect(scorePrediction(pick({ outcome: "DRAW", homeScore: 1, awayScore: 1 }), finished(1, 1)).state).toBe(
      "EXACT",
    );
  });
});

describe("issue et cohérence", () => {
  it("déduit l'issue d'un score", () => {
    expect(outcomeFromScore(3, 1)).toBe("HOME");
    expect(outcomeFromScore(2, 2)).toBe("DRAW");
    expect(outcomeFromScore(0, 1)).toBe("AWAY");
  });

  it("vérifie la cohérence 1N2 / score", () => {
    expect(isScoreConsistent("HOME", 2, 1)).toBe(true);
    expect(isScoreConsistent("HOME", 1, 1)).toBe(false);
    expect(isScoreConsistent("DRAW", null, null)).toBe(true);
    expect(isScoreConsistent("DRAW", 1, null)).toBe(false);
  });

  it("construit une clé de joker par journée", () => {
    expect(jokerKey("u1", "c1", "s1", 7)).toBe("u1:c1:s1:7");
    expect(jokerKey("u1", "c1", "s1", 7)).not.toBe(jokerKey("u1", "c2", "s1", 7));
  });
});

describe("répartition de la communauté", () => {
  it("calcule des ratios", () => {
    expect(crowdDistribution(["HOME", "HOME", "DRAW", "AWAY"])).toEqual({
      HOME: 0.5,
      DRAW: 0.25,
      AWAY: 0.25,
    });
    expect(crowdDistribution([])).toEqual({ HOME: 0, DRAW: 0, AWAY: 0 });
  });
});
