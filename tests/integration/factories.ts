import type { MatchStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { ensureSeason } from "@/server/football/importer";
import type { CompetitionCode } from "@/server/football/competitions";

let counter = 0;
const next = () => ++counter;

export async function createUser(
  overrides: { username?: string; createdAt?: Date; role?: "USER" | "ADMIN" } = {},
) {
  const n = next();
  return prisma.user.create({
    data: {
      email: `joueur${n}@test.local`,
      username: overrides.username ?? `joueur${n}`,
      name: `Joueur ${n}`,
      onboardedAt: new Date("2026-08-01T10:00:00Z"),
      createdAt: overrides.createdAt ?? new Date(Date.UTC(2026, 6, 1, 0, n)),
      role: overrides.role ?? "USER",
    },
  });
}

export async function createTeam(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return prisma.team.upsert({
    where: { slug },
    create: {
      slug,
      name,
      shortName: name,
      tla: name.slice(0, 3).toUpperCase(),
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
    },
    update: {},
  });
}

export async function createMatch(
  opts: {
    code?: CompetitionCode;
    round?: number;
    kickoffAt?: Date;
    status?: MatchStatus;
    homeScore?: number | null;
    awayScore?: number | null;
    home?: string;
    away?: string;
  } = {},
) {
  const { competition, season } = await ensureSeason(opts.code ?? "FL1", 2026);
  const n = next();
  const home = await createTeam(opts.home ?? `Domicile ${n}`);
  const away = await createTeam(opts.away ?? `Extérieur ${n}`);
  return prisma.match.create({
    data: {
      competitionId: competition.id,
      seasonId: season.id,
      round: opts.round ?? 7,
      roundLabel: `Journée ${opts.round ?? 7}`,
      kickoffAt: opts.kickoffAt ?? new Date("2026-10-03T19:00:00Z"),
      status: opts.status ?? "SCHEDULED",
      homeScore: opts.homeScore ?? null,
      awayScore: opts.awayScore ?? null,
      homeTeamId: home.id,
      awayTeamId: away.id,
    },
  });
}
