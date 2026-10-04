import { describe, expect, it } from "vitest";
import apiFootballJson from "../fixtures/api-football-fixtures.json";
import footballDataJson from "../fixtures/football-data-matches.json";
import {
  apiFootballFixtureSchema,
  mapApiFootballFixture,
  mapApiFootballStatus,
  parseApiFootballRound,
} from "@/server/football/api-football";
import {
  footballDataMatchSchema,
  footballDataRound,
  mapFootballDataMatch,
  mapFootballDataStatus,
} from "@/server/football/football-data";

const apiFixtures = apiFootballJson.response.map((r) =>
  mapApiFootballFixture(apiFootballFixtureSchema.parse(r)),
);
const fdMatches = footballDataJson.matches.map((m) => mapFootballDataMatch(footballDataMatchSchema.parse(m)));

describe("API-Football", () => {
  it("normalise un match en direct avec ses événements", () => {
    const fx = apiFixtures[0]!;
    expect(fx).toMatchObject({
      provider: "api-football",
      externalId: 1380001,
      competitionCode: "FL1",
      season: 2026,
      round: 7,
      roundLabel: "Journée 7",
      status: "LIVE",
      minute: 63,
      homeScore: 2,
      awayScore: 1,
      htHome: 1,
      htAway: 1,
      venue: "Parc des Princes",
      referee: "Clément Turpin",
    });
    expect(fx.kickoffAt.toISOString()).toBe("2026-10-03T19:00:00.000Z");
    expect(fx.home).toEqual({
      externalId: 85,
      name: "Paris Saint Germain",
      crestUrl: "https://media.api-sports.io/football/teams/85.png",
    });
    // Penalty manqué et remplacement ignorés ; carton et but contre son camp conservés.
    expect(fx.events?.map((e) => `${e.minute}:${e.type}:${e.side}`)).toEqual([
      "12:GOAL:home",
      "30:PENALTY:away",
      "41:YELLOW:away",
      "55:OWN_GOAL:away",
    ]);
    expect(fx.events?.[0]?.assist).toBe("V. Vitinha");
  });

  it("retient le score du temps réglementaire après tirs au but", () => {
    const fx = apiFixtures[1]!;
    expect(fx).toMatchObject({
      competitionCode: "CL",
      round: 10,
      roundLabel: "Huitièmes de finale",
      status: "FINISHED",
      homeScore: 1,
      awayScore: 1,
    });
  });

  it("ignore les compétitions non suivies", () => {
    expect(apiFixtures[2]).toBeNull();
  });

  it("mappe les statuts et les journées", () => {
    expect(mapApiFootballStatus("HT")).toBe("HALFTIME");
    expect(mapApiFootballStatus("PST")).toBe("POSTPONED");
    expect(mapApiFootballStatus("ABD")).toBe("CANCELLED");
    expect(mapApiFootballStatus("AET")).toBe("FINISHED");
    expect(parseApiFootballRound("CL", "League Stage - 3")).toBe(3);
    expect(parseApiFootballRound("CL", "Final")).toBe(13);
    expect(() => parseApiFootballRound("FL1", "Relegation Round")).toThrow();
  });
});

describe("football-data.org", () => {
  it("normalise un match terminé", () => {
    expect(fdMatches[0]).toMatchObject({
      provider: "football-data",
      externalId: 540001,
      competitionCode: "PL",
      season: 2026,
      round: 7,
      status: "FINISHED",
      homeScore: 3,
      awayScore: 1,
      referee: "Michael Oliver",
      home: { externalId: 64, name: "Liverpool FC", shortName: "Liverpool", tla: "LIV" },
    });
  });

  it("retient le temps réglementaire après prolongation", () => {
    expect(fdMatches[1]).toMatchObject({
      round: 11,
      roundLabel: "Quarts de finale",
      homeScore: 2,
      awayScore: 2,
    });
  });

  it("gère la mi-temps et ignore les affiches sans équipes", () => {
    expect(fdMatches[2]).toMatchObject({ status: "HALFTIME", minute: null, homeScore: 0 });
    expect(fdMatches[3]).toBeNull();
  });

  it("mappe les statuts et les phases", () => {
    expect(mapFootballDataStatus("TIMED")).toBe("SCHEDULED");
    expect(mapFootballDataStatus("IN_PLAY")).toBe("LIVE");
    expect(mapFootballDataStatus("SUSPENDED")).toBe("POSTPONED");
    expect(footballDataRound("CL", 4, "LEAGUE_STAGE")).toBe(4);
    expect(footballDataRound("CL", null, "LAST_16")).toBe(10);
    expect(() => footballDataRound("PL", null, "REGULAR_SEASON")).toThrow();
  });
});
