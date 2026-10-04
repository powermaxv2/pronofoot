import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { cached } from "@/server/football/cache";
import { upsertFixture } from "@/server/football/importer";
import { quotaWindow, remainingCalls, reserveCall } from "@/server/football/quota";
import { QuotaExceededError, type ProviderFixture } from "@/server/football/types";
import { createTeam } from "./factories";

const fixture = (overrides: Partial<ProviderFixture> = {}): ProviderFixture => ({
  provider: "api-football",
  externalId: 1001,
  competitionCode: "FL1",
  season: 2026,
  round: 7,
  roundLabel: "Journée 7",
  kickoffAt: new Date("2026-10-03T19:00:00Z"),
  status: "SCHEDULED",
  minute: null,
  home: { externalId: 85, name: "Paris Saint Germain", crestUrl: "https://media.api-sports.io/85.png" },
  away: { externalId: 81, name: "Marseille", crestUrl: null },
  homeScore: null,
  awayScore: null,
  htHome: null,
  htAway: null,
  venue: "Parc des Princes",
  referee: null,
  events: null,
  ...overrides,
});

describe("import des matchs", () => {
  it("rapproche les clubs du référentiel et apprend leurs identifiants", async () => {
    const seeded = await createTeam("Paris Saint-Germain");
    await prisma.team.update({ where: { id: seeded.id }, data: { slug: "paris-saint-germain" } });
    const change = await upsertFixture(fixture());
    expect(change.created).toBe(true);
    const psg = await prisma.team.findUniqueOrThrow({ where: { slug: "paris-saint-germain" } });
    expect(psg.id).toBe(seeded.id);
    expect(psg.apiFootballId).toBe(85);
    // Un club inconnu est créé avec les données du référentiel.
    const om = await prisma.team.findUniqueOrThrow({ where: { apiFootballId: 81 } });
    expect(om).toMatchObject({ name: "Olympique de Marseille", tla: "OM", primaryColor: "#2FAEE0" });
  });

  it("met à jour sans dupliquer et détecte buts et changement de statut", async () => {
    await upsertFixture(fixture());
    const change = await upsertFixture(fixture({ status: "LIVE", minute: 12, homeScore: 1, awayScore: 0 }));
    expect(change).toMatchObject({
      created: false,
      statusChanged: true,
      goalsChanged: true,
      previousStatus: "SCHEDULED",
    });
    expect(await prisma.match.count()).toBe(1);
  });

  it("rapproche un match importé par l'autre fournisseur", async () => {
    await upsertFixture(fixture());
    await upsertFixture(
      fixture({
        provider: "football-data",
        externalId: 5001,
        home: { externalId: 524, name: "Paris Saint-Germain FC", crestUrl: null },
        away: { externalId: 516, name: "Olympique de Marseille", crestUrl: null },
      }),
    );
    const matches = await prisma.match.findMany();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ apiFootballId: 1001, footballDataId: 5001 });
  });

  it("n'écrase jamais un score saisi par un admin", async () => {
    const { matchId } = await upsertFixture(fixture());
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "FINISHED", homeScore: 3, awayScore: 0, manualScore: true },
    });
    await upsertFixture(fixture({ status: "FINISHED", homeScore: 1, awayScore: 1, venue: "Stade renommé" }));
    expect(await prisma.match.findUniqueOrThrow({ where: { id: matchId } })).toMatchObject({
      homeScore: 3,
      awayScore: 0,
      venue: "Stade renommé",
    });
  });
});

describe("quota des API", () => {
  it("bloque au-delà du budget journalier", async () => {
    const now = new Date("2026-10-03T12:00:00Z");
    for (let i = 0; i < 90; i++) await reserveCall("api-football", now);
    await expect(reserveCall("api-football", now)).rejects.toBeInstanceOf(QuotaExceededError);
    expect(await remainingCalls("api-football", now)).toBe(0);
    // Le lendemain, le budget est renouvelé.
    expect(await remainingCalls("api-football", new Date("2026-10-04T00:00:01Z"))).toBe(90);
  });

  it("raisonne par minute pour football-data.org", () => {
    expect(quotaWindow("football-data", new Date("2026-10-03T12:34:56Z")).toISOString()).toBe(
      "2026-10-03T12:34:00.000Z",
    );
    expect(quotaWindow("api-football", new Date("2026-10-03T12:34:56Z")).toISOString()).toBe(
      "2026-10-03T00:00:00.000Z",
    );
  });
});

describe("cache des réponses", () => {
  it("met en cache, déduplique et sert une réponse expirée en cas de panne", async () => {
    let clock = new Date("2026-10-03T12:00:00Z");
    const now = () => clock;
    const fetcher = vi.fn(async () => ({ value: 1 }));
    const [a, b] = await Promise.all([
      cached("api-football", "k", 60_000, fetcher, now),
      cached("api-football", "k", 60_000, fetcher, now),
    ]);
    expect(a).toEqual({ value: 1 });
    expect(b).toEqual({ value: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await cached("api-football", "k", 60_000, fetcher, now);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clock = new Date("2026-10-03T12:05:00Z");
    const failing = vi.fn(async () => {
      throw new Error("réseau");
    });
    await expect(cached("api-football", "k", 60_000, failing, now)).resolves.toEqual({ value: 1 });
    await expect(cached("api-football", "absent", 60_000, failing, now)).rejects.toThrow("réseau");
  });
});
