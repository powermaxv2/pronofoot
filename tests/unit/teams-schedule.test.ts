import { describe, expect, it } from "vitest";
import {
  championsLeagueKickoffs,
  doubleRoundRobin,
  leagueRoundDates,
  roundKickoffs,
  singleRoundRobin,
} from "../../prisma/seed/schedule";
import { COMPETITIONS } from "@/server/football/competitions";
import {
  ALL_TEAMS,
  CL_PARTICIPANTS,
  LEAGUE_TEAMS,
  resolveTeamSlug,
  teamSlug,
} from "@/server/football/teams-data";
import { generateInviteCode, isInviteCode, normalizeInviteCode } from "@/server/domain/invite";

describe("référentiel des clubs", () => {
  it("a des slugs canoniques uniques", () => {
    const slugs = ALL_TEAMS.map(teamSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("a le bon nombre de clubs par championnat et 36 participants en C1", () => {
    for (const [code, teams] of Object.entries(LEAGUE_TEAMS)) {
      expect(teams).toHaveLength(COMPETITIONS[code as keyof typeof LEAGUE_TEAMS].teams);
    }
    expect(new Set(CL_PARTICIPANTS).size).toBe(36);
    const names = new Set(ALL_TEAMS.map((t) => t.name));
    for (const p of CL_PARTICIPANTS) expect(names.has(p), p).toBe(true);
  });

  it("rapproche les noms des deux fournisseurs", () => {
    const psg = teamSlug({ name: "Paris Saint-Germain" });
    expect(resolveTeamSlug("Paris Saint Germain")).toBe(psg);
    expect(resolveTeamSlug("Paris Saint-Germain FC")).toBe(psg);
    expect(resolveTeamSlug("Olympique Lyonnais")).toBe(resolveTeamSlug("Lyon"));
    expect(resolveTeamSlug("Bayern München")).toBe(resolveTeamSlug("FC Bayern München"));
    expect(resolveTeamSlug("Borussia Monchengladbach")).toBe(resolveTeamSlug("Borussia Mönchengladbach"));
    expect(resolveTeamSlug("Brighton & Hove Albion FC")).toBe(resolveTeamSlug("Brighton"));
    expect(resolveTeamSlug("Paris FC")).not.toBe(psg);
    expect(resolveTeamSlug("Club Inconnu United")).toBe("inconnu-united");
  });
});

describe("calendrier", () => {
  const teams = Array.from({ length: 20 }, (_, i) => `T${i}`);

  it("génère un aller-retour complet et équilibré", () => {
    const rounds = doubleRoundRobin(teams);
    expect(rounds).toHaveLength(38);
    const pairs = new Set<string>();
    for (const round of rounds) {
      const playing = round.flatMap((m) => [m.home, m.away]);
      expect(new Set(playing).size).toBe(20);
      for (const m of round) pairs.add(`${m.home}>${m.away}`);
    }
    expect(pairs.size).toBe(20 * 19);
    for (const t of teams) {
      const home = rounds.flat().filter((m) => m.home === t).length;
      expect(home).toBe(19);
    }
  });

  it("donne 8 adversaires distincts en phase de ligue", () => {
    const clubs = Array.from({ length: 36 }, (_, i) => i);
    const rounds = singleRoundRobin(clubs).slice(0, 8);
    for (const c of clubs) {
      const opponents = rounds
        .flat()
        .filter((m) => m.home === c || m.away === c)
        .map((m) => (m.home === c ? m.away : m.home));
      expect(new Set(opponents).size).toBe(8);
    }
  });

  it("place les journées sur des samedis hors trêves internationales", () => {
    const dates = leagueRoundDates("FL1", 2026, 34);
    expect(dates).toHaveLength(34);
    const keys = dates.map((d) => d.date.toISOString().slice(0, 10));
    expect(keys).not.toContain("2026-09-05");
    expect(keys).not.toContain("2026-12-26");
    expect(dates.filter((d) => !d.midweek).every((d) => d.date.getUTCDay() === 6)).toBe(true);
    expect(leagueRoundDates("PL", 2026, 38)).toHaveLength(38);
  });

  it("programme les coups d'envoi aux heures de Paris", () => {
    const [friday] = roundKickoffs("FL1", { date: new Date(Date.UTC(2026, 9, 3)), midweek: false }, 9);
    expect(friday!.toISOString()).toBe("2026-10-02T18:45:00.000Z");
    const cl = championsLeagueKickoffs(2026, 2, 18);
    expect(cl.filter((d) => d.toISOString().endsWith("16:45:00.000Z"))).toHaveLength(4);
    expect(cl[17]!.toISOString()).toBe("2026-09-30T19:00:00.000Z");
  });
});

describe("codes d'invitation", () => {
  it("génère des codes valides de 8 caractères sans ambiguïté", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(isInviteCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
    expect(normalizeInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
  });
});
