import { describe, expect, it } from "vitest";
import { currentSeasonYear, formatKickoff, parisDateTime, parisDayKey, parisMonthRange } from "@/lib/dates";

describe("dates (Europe/Paris)", () => {
  it("convertit une heure locale en UTC selon l'heure d'été/hiver", () => {
    expect(parisDateTime(2026, 10, 3, 21, 0).toISOString()).toBe("2026-10-03T19:00:00.000Z");
    expect(parisDateTime(2026, 12, 5, 21, 0).toISOString()).toBe("2026-12-05T20:00:00.000Z");
  });

  it("formate un coup d'envoi en français", () => {
    expect(formatKickoff(new Date("2026-10-03T19:00:00Z"))).toBe("sam. 3 oct. · 21:00");
  });

  it("calcule les bornes d'un mois à Paris", () => {
    const { start, end } = parisMonthRange(new Date("2026-10-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("rattache un match de 23h30 UTC au lendemain à Paris", () => {
    expect(parisDayKey(new Date("2026-10-03T23:30:00Z"))).toBe("2026-10-04");
  });

  it("détermine la saison courante", () => {
    expect(currentSeasonYear(new Date("2026-09-29T10:00:00Z"))).toBe(2026);
    expect(currentSeasonYear(new Date("2027-03-01T10:00:00Z"))).toBe(2026);
    expect(currentSeasonYear(new Date("2027-07-02T10:00:00Z"))).toBe(2027);
  });
});
