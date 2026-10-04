import type { MatchStatus, Prisma, Team } from "@prisma/client";
import { prisma } from "@/server/db";
import { COMPETITIONS, type CompetitionCode } from "./competitions";
import { ALL_TEAMS, resolveTeamSlug, teamSlug } from "./teams-data";
import {
  matchEventsSchema,
  type ProviderFixture,
  type ProviderName,
  type ProviderStanding,
  type ProviderTeam,
} from "./types";

type Db = Prisma.TransactionClient | typeof prisma;

type IdField = "apiFootballId" | "footballDataId";
const idField = (provider: ProviderName): IdField =>
  provider === "api-football" ? "apiFootballId" : "footballDataId";
const byProviderId = (field: IdField, id: number) =>
  field === "apiFootballId" ? { apiFootballId: id } : { footballDataId: id };

const TEAM_SEED_BY_SLUG = new Map(ALL_TEAMS.map((t) => [teamSlug(t), t]));

function deriveTla(name: string) {
  return name
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

/** Retrouve (identifiant fournisseur, puis nom normalisé) ou crée un club. */
export function upsertTeam(provider: ProviderName, team: ProviderTeam, db: Db = prisma): Promise<Team> {
  return retryOnConflict(() => upsertTeamOnce(provider, team, db));
}

async function upsertTeamOnce(provider: ProviderName, team: ProviderTeam, db: Db): Promise<Team> {
  const field = idField(provider);
  const byId = await db.team.findUnique({ where: byProviderId(field, team.externalId) });
  if (byId) {
    if (team.crestUrl && byId.crestUrl !== team.crestUrl) {
      return db.team.update({ where: { id: byId.id }, data: { crestUrl: team.crestUrl } });
    }
    return byId;
  }
  const slug = resolveTeamSlug(team.name);
  const bySlug = await db.team.findUnique({ where: { slug } });
  if (bySlug) {
    return db.team.update({
      where: { id: bySlug.id },
      data: { [field]: team.externalId, crestUrl: team.crestUrl ?? bySlug.crestUrl },
    });
  }
  const seed = TEAM_SEED_BY_SLUG.get(slug);
  return db.team.create({
    data: {
      slug,
      name: seed?.name ?? team.name,
      shortName: seed?.shortName ?? team.shortName ?? team.name,
      tla: seed?.tla ?? team.tla ?? deriveTla(team.name),
      primaryColor: seed?.primary ?? "#22c55e",
      secondaryColor: seed?.secondary ?? "#ffffff",
      country: seed?.country ?? null,
      crestUrl: team.crestUrl,
      [field]: team.externalId,
    },
  });
}

const isUniqueViolation = (error: unknown) => (error as { code?: string }).code === "P2002";

/** Exécute une création idempotente ; en cas de course sur une contrainte d'unicité, rejoue une fois. */
async function retryOnConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isUniqueViolation(error)) return fn();
    throw error;
  }
}

/** Saison d'une compétition (créée si besoin, devient la saison courante si plus récente). */
export function ensureSeason(code: CompetitionCode, year: number, db: Db = prisma) {
  return retryOnConflict(() => ensureSeasonOnce(code, year, db));
}

async function ensureSeasonOnce(code: CompetitionCode, year: number, db: Db) {
  const config = COMPETITIONS[code];
  const competition = await db.competition.upsert({
    where: { code },
    create: {
      code,
      name: config.name,
      shortName: config.shortName,
      country: config.country,
      color: config.color,
      apiFootballId: config.apiFootballId,
      footballDataCode: config.footballDataCode,
      sortOrder: config.sortOrder,
    },
    update: {},
    include: { currentSeason: true },
  });
  const season = await db.season.upsert({
    where: { competitionId_year: { competitionId: competition.id, year } },
    create: {
      competitionId: competition.id,
      year,
      startDate: new Date(Date.UTC(year, 6, 1)),
      endDate: new Date(Date.UTC(year + 1, 5, 30)),
    },
    update: {},
  });
  if (!competition.currentSeason || competition.currentSeason.year < year) {
    await db.competition.update({ where: { id: competition.id }, data: { currentSeasonId: season.id } });
  }
  return { competition, season };
}

export type FixtureChange = {
  matchId: string;
  created: boolean;
  statusChanged: boolean;
  goalsChanged: boolean;
  previousStatus: MatchStatus | null;
  status: MatchStatus;
};

/** Importe un match normalisé (création ou mise à jour idempotente). */
export async function upsertFixture(fx: ProviderFixture, db: Db = prisma): Promise<FixtureChange> {
  const field = idField(fx.provider);
  const { competition, season } = await ensureSeason(fx.competitionCode, fx.season, db);
  const [home, away] = [
    await upsertTeam(fx.provider, fx.home, db),
    await upsertTeam(fx.provider, fx.away, db),
  ];

  let existing = await db.match.findUnique({ where: byProviderId(field, fx.externalId) });
  if (!existing) {
    // Rapprochement avec un match importé par l'autre fournisseur ou issu du seed.
    existing = await db.match.findFirst({
      where: {
        seasonId: season.id,
        homeTeamId: home.id,
        awayTeamId: away.id,
        kickoffAt: {
          gte: new Date(fx.kickoffAt.getTime() - 10 * 86_400_000),
          lte: new Date(fx.kickoffAt.getTime() + 10 * 86_400_000),
        },
      },
      orderBy: { kickoffAt: "asc" },
    });
  }

  const events = fx.events ? matchEventsSchema.parse(fx.events) : undefined;
  const base = {
    round: fx.round,
    roundLabel: fx.roundLabel,
    kickoffAt: fx.kickoffAt,
    venue: fx.venue,
    referee: fx.referee,
    lastSyncedAt: new Date(),
    [field]: fx.externalId,
  };
  const live = {
    status: fx.status,
    minute: fx.minute,
    homeScore: fx.homeScore,
    awayScore: fx.awayScore,
    htHome: fx.htHome,
    htAway: fx.htAway,
    ...(events ? { events } : {}),
  };

  if (!existing) {
    const created = await db.match.create({
      data: {
        ...base,
        ...live,
        seasonId: season.id,
        competitionId: competition.id,
        homeTeamId: home.id,
        awayTeamId: away.id,
      },
    });
    return {
      matchId: created.id,
      created: true,
      statusChanged: false,
      goalsChanged: false,
      previousStatus: null,
      status: created.status,
    };
  }

  // Un score saisi manuellement par un admin n'est jamais écrasé.
  const data = existing.manualScore ? base : { ...base, ...live };
  const updated = await db.match.update({ where: { id: existing.id }, data });
  return {
    matchId: updated.id,
    created: false,
    statusChanged: existing.status !== updated.status,
    goalsChanged: existing.homeScore !== updated.homeScore || existing.awayScore !== updated.awayScore,
    previousStatus: existing.status,
    status: updated.status,
  };
}

/** Remplace le classement d'une saison. */
export async function upsertStandings(
  provider: ProviderName,
  code: CompetitionCode,
  year: number,
  rows: ProviderStanding[],
) {
  const { season } = await ensureSeason(code, year);
  const teams = await Promise.all(rows.map((r) => upsertTeam(provider, r.team)));
  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { seasonId: season.id, teamId: { notIn: teams.map((t) => t.id) } } }),
    ...rows.map((r, i) =>
      prisma.standing.upsert({
        where: { seasonId_teamId: { seasonId: season.id, teamId: teams[i]!.id } },
        create: { seasonId: season.id, teamId: teams[i]!.id, ...standingData(r) },
        update: standingData(r),
      }),
    ),
  ]);
  return rows.length;
}

const standingData = (r: ProviderStanding) => ({
  position: r.position,
  played: r.played,
  won: r.won,
  drawn: r.drawn,
  lost: r.lost,
  goalsFor: r.goalsFor,
  goalsAgainst: r.goalsAgainst,
  points: r.points,
  form: r.form,
});
