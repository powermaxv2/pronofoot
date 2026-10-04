/**
 * Jeu de données réaliste : 6 compétitions, une saison complète (calendrier,
 * résultats des matchs déjà joués), 20 joueurs, 3 ligues et un historique de
 * pronostics noté par le vrai moteur de calcul.
 *
 * Usage : pnpm db:seed   (SEED_RESET=true pour vider une base existante)
 * Variables : SEED_NOW (date de référence ISO), SEED (graine, défaut 2026).
 */
import { type MatchStatus, type Outcome, type Prisma, PrismaClient } from "@prisma/client";
import { currentSeasonYear, parisMonthRange, formatMonth } from "../../src/lib/dates";
import { generateInviteCode } from "../../src/server/domain/invite";
import { jokerKey, outcomeFromScore } from "../../src/server/domain/outcome";
import {
  COMPETITIONS,
  COMPETITION_CODES,
  roundLabel,
  type CompetitionCode,
} from "../../src/server/football/competitions";
import {
  ALL_TEAMS,
  CL_PARTICIPANTS,
  LEAGUE_TEAMS,
  teamSlug,
  type TeamSeed,
} from "../../src/server/football/teams-data";
import { createRng, type Rng } from "./random";
import { SEED_LEAGUES, SEED_PLAYERS, type SeedPlayer } from "./people";
import {
  championsLeagueKickoffs,
  doubleRoundRobin,
  leagueRoundDates,
  roundKickoffs,
  singleRoundRobin,
} from "./schedule";

const prisma = new PrismaClient();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const NOW = process.env.SEED_NOW ? new Date(process.env.SEED_NOW) : new Date();
const rng = createRng(Number(process.env.SEED ?? 2026));

type TeamRow = { id: string; seed: TeamSeed };
type MatchPlan = {
  code: CompetitionCode;
  round: number;
  kickoffAt: Date;
  home: TeamRow;
  away: TeamRow;
};

/* ------------------------------------------------------------------ */
/*                               Base                                  */
/* ------------------------------------------------------------------ */

async function resetDatabase() {
  const users = await prisma.user.count();
  if (users > 0 && process.env.SEED_RESET !== "true") {
    throw new Error(
      "La base contient déjà des données. Relancez avec SEED_RESET=true pour tout effacer (irréversible).",
    );
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
}

/* ------------------------------------------------------------------ */
/*                          Football : référentiel                     */
/* ------------------------------------------------------------------ */

async function seedTeams(): Promise<Map<string, TeamRow>> {
  const rows = new Map<string, TeamRow>();
  for (const team of ALL_TEAMS) {
    const created = await prisma.team.create({
      data: {
        slug: teamSlug(team),
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        primaryColor: team.primary,
        secondaryColor: team.secondary,
        country: team.country,
      },
    });
    rows.set(team.name, { id: created.id, seed: team });
  }
  return rows;
}

async function seedCompetitions(season: number) {
  const result = new Map<CompetitionCode, { competitionId: string; seasonId: string }>();
  for (const code of COMPETITION_CODES) {
    const c = COMPETITIONS[code];
    const competition = await prisma.competition.create({
      data: {
        code,
        name: c.name,
        shortName: c.shortName,
        country: c.country,
        color: c.color,
        apiFootballId: c.apiFootballId,
        footballDataCode: c.footballDataCode,
        sortOrder: c.sortOrder,
      },
    });
    const s = await prisma.season.create({
      data: {
        competitionId: competition.id,
        year: season,
        startDate: new Date(Date.UTC(season, 7, 1)),
        endDate: new Date(Date.UTC(season + 1, 4, 31)),
      },
    });
    await prisma.competition.update({ where: { id: competition.id }, data: { currentSeasonId: s.id } });
    result.set(code, { competitionId: competition.id, seasonId: s.id });
  }
  return result;
}

function planSeason(season: number, teams: Map<string, TeamRow>): MatchPlan[] {
  const plans: MatchPlan[] = [];
  for (const [code, list] of Object.entries(LEAGUE_TEAMS) as [Exclude<CompetitionCode, "CL">, TeamSeed[]][]) {
    const rows = rng.shuffle(list.map((t) => teams.get(t.name)!));
    const rounds = doubleRoundRobin(rows);
    const dates = leagueRoundDates(code, season, rounds.length);
    rounds.forEach((pairings, i) => {
      const kickoffs = rng.shuffle(roundKickoffs(code, dates[i]!, pairings.length));
      pairings.forEach((pair, j) =>
        plans.push({ code, round: i + 1, kickoffAt: kickoffs[j]!, home: pair.home, away: pair.away }),
      );
    });
  }
  // Phase de ligue : 8 adversaires différents par club (8 premières rondes d'un tournoi toutes rondes).
  const cl = rng.shuffle(CL_PARTICIPANTS.map((name) => teams.get(name)!));
  singleRoundRobin(cl)
    .slice(0, COMPETITIONS.CL.rounds)
    .forEach((pairings, i) => {
      const kickoffs = rng.shuffle(championsLeagueKickoffs(season, i + 1, pairings.length));
      pairings.forEach((pair, j) =>
        plans.push({ code: "CL", round: i + 1, kickoffAt: kickoffs[j]!, home: pair.home, away: pair.away }),
      );
    });
  return plans;
}

/** Buts attendus selon l'écart de force (avantage du terrain inclus). */
function expectedGoals(home: TeamSeed, away: TeamSeed) {
  const diff = home.strength - away.strength;
  const clamp = (v: number) => Math.min(3.4, Math.max(0.25, v));
  return { home: clamp(1.42 * Math.exp(diff / 45)), away: clamp(1.12 * Math.exp(-diff / 45)) };
}

function playMatch(plan: MatchPlan) {
  const xg = expectedGoals(plan.home.seed, plan.away.seed);
  const home = Math.min(7, rng.poisson(xg.home));
  const away = Math.min(7, rng.poisson(xg.away));
  const firstHalf = (goals: number) => Array.from({ length: goals }).filter(() => rng.chance(0.44)).length;
  return { homeScore: home, awayScore: away, htHome: firstHalf(home), htAway: firstHalf(away) };
}

async function seedMatches(
  plans: MatchPlan[],
  comps: Map<CompetitionCode, { competitionId: string; seasonId: string }>,
) {
  const data: Prisma.MatchCreateManyInput[] = [];
  let shifted = 0;
  for (const plan of plans) {
    const ids = comps.get(plan.code)!;
    let kickoffAt = plan.kickoffAt;
    let status: MatchStatus = "SCHEDULED";
    let score: ReturnType<typeof playMatch> | null = null;
    const elapsed = NOW.getTime() - kickoffAt.getTime();
    if (elapsed >= 2 * HOUR) {
      status = "FINISHED";
      score = playMatch(plan);
    } else if (elapsed > -5 * 60_000) {
      // Un match « en cours » ne peut pas être inventé : il est décalé au lendemain.
      kickoffAt = new Date(kickoffAt.getTime() + DAY);
      shifted += 1;
    }
    data.push({
      competitionId: ids.competitionId,
      seasonId: ids.seasonId,
      round: plan.round,
      roundLabel: roundLabel(plan.code, plan.round),
      kickoffAt,
      status,
      homeTeamId: plan.home.id,
      awayTeamId: plan.away.id,
      homeScore: score?.homeScore ?? null,
      awayScore: score?.awayScore ?? null,
      htHome: score?.htHome ?? null,
      htAway: score?.htAway ?? null,
      venue: `Stade de ${plan.home.seed.shortName}`,
      lastSyncedAt: null,
    });
  }
  await prisma.match.createMany({ data });
  return { total: data.length, finished: data.filter((d) => d.status === "FINISHED").length, shifted };
}

/* ------------------------------------------------------------------ */
/*                        Joueurs, ligues, pronos                      */
/* ------------------------------------------------------------------ */

async function seedUsers(teams: Map<string, TeamRow>) {
  const adminEmail =
    (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase() || "admin@pronofoot.local";
  const users = new Map<string, { id: string; player: SeedPlayer }>();
  const seasonStart = new Date(Date.UTC(currentSeasonYear(NOW), 6, 1));
  for (const [i, player] of SEED_PLAYERS.entries()) {
    const createdAt = new Date(seasonStart.getTime() + i * 1.7 * DAY + rng.int(0, 20) * HOUR);
    const user = await prisma.user.create({
      data: {
        email: i === 0 ? adminEmail : `${player.username.replace(/_/g, ".")}@pronofoot.local`,
        emailVerified: createdAt,
        name: player.name,
        username: player.username,
        role: i === 0 ? "ADMIN" : "USER",
        avatarUrl: player.avatar ? `/avatars/maillot-${String(player.avatar).padStart(2, "0")}.svg` : null,
        favoriteTeamId: teams.get(player.favorite)!.id,
        onboardedAt: createdAt,
        createdAt,
        notifyEmail: false,
      },
    });
    users.set(player.username, { id: user.id, player });
  }
  return users;
}

async function seedLeagues(users: Map<string, { id: string }>) {
  const leagues = [];
  for (const [i, league] of SEED_LEAGUES.entries()) {
    const createdAt = new Date(Date.UTC(currentSeasonYear(NOW), 7, 2 + i * 3));
    const created = await prisma.league.create({
      data: {
        name: league.name,
        slug: league.name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        inviteCode: generateInviteCode(rng.next),
        description: league.description,
        emoji: league.emoji,
        color: league.color,
        ownerId: users.get(league.owner)!.id,
        createdAt,
        members: {
          create: league.members.map((username, j) => ({
            userId: users.get(username)!.id,
            role: username === league.owner ? "OWNER" : "MEMBER",
            joinedAt: new Date(createdAt.getTime() + j * 7 * HOUR),
          })),
        },
      },
    });
    leagues.push(created);
  }
  return leagues;
}

type MatchForPrediction = {
  id: string;
  kickoffAt: Date;
  round: number;
  status: MatchStatus;
  competitionId: string;
  seasonId: string;
  competition: { code: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
};

/** Pronostic d'un joueur : plus il est « fort », plus il suit la hiérarchie. */
function predictScore(player: SeedPlayer, match: MatchForPrediction, byName: Map<string, TeamSeed>, r: Rng) {
  const home = byName.get(match.homeTeam.name)!;
  const away = byName.get(match.awayTeam.name)!;
  const xg = expectedGoals(home, away);
  const noise = 1 - player.skill;
  let h = Math.round(xg.home + (r.next() - 0.5) * 2.2 * noise + (r.next() - 0.5) * 0.9);
  let a = Math.round(xg.away + (r.next() - 0.5) * 2.2 * noise + (r.next() - 0.5) * 0.9);
  if (r.chance(player.boldness * 0.35)) [h, a] = r.chance(0.5) ? [a, h] : [Math.max(h, a), Math.max(h, a)];
  h = Math.max(0, Math.min(5, h));
  a = Math.max(0, Math.min(5, a));
  const outcome: Outcome = outcomeFromScore(h, a);
  const withScore = r.chance(player.exactRate);
  return {
    outcome,
    homeScore: withScore ? h : null,
    awayScore: withScore ? a : null,
    confidence: Math.abs(xg.home - xg.away),
  };
}

async function seedPredictions(users: Map<string, { id: string; player: SeedPlayer }>) {
  const matches: MatchForPrediction[] = await prisma.match.findMany({
    where: { kickoffAt: { lte: new Date(NOW.getTime() + 7 * DAY) } },
    select: {
      id: true,
      kickoffAt: true,
      round: true,
      status: true,
      competitionId: true,
      seasonId: true,
      competition: { select: { code: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: { kickoffAt: "asc" },
  });
  const byName = new Map(ALL_TEAMS.map((t) => [t.name, t]));
  const data: Prisma.PredictionCreateManyInput[] = [];

  for (const { id: userId, player } of users.values()) {
    const favorite = player.favorite;
    const joined = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true },
    });
    const perRound = new Map<string, { index: number; confidence: number }[]>();
    for (const match of matches) {
      const upcoming = match.status === "SCHEDULED";
      const involvesFavorite = match.homeTeam.name === favorite || match.awayTeam.name === favorite;
      const preferred = player.competitions.includes(match.competition.code);
      const probability = involvesFavorite ? 0.97 : preferred ? player.activity : player.activity * 0.12;
      if (!rng.chance(upcoming ? probability * 0.55 : probability)) continue;
      const pick = predictScore(player, match, byName, rng);
      // Le prono est posé quelques heures à quelques jours avant le coup d'envoi.
      const createdAt = new Date(
        Math.max(joined.createdAt.getTime(), match.kickoffAt.getTime() - rng.int(2, 96) * HOUR),
      );
      if (createdAt >= NOW) continue;
      const key = `${match.competitionId}:${match.seasonId}:${match.round}`;
      const list = perRound.get(key) ?? [];
      list.push({ index: data.length, confidence: pick.confidence + (involvesFavorite ? 0.5 : 0) });
      perRound.set(key, list);
      data.push({
        userId,
        matchId: match.id,
        outcome: pick.outcome,
        homeScore: pick.homeScore,
        awayScore: pick.awayScore,
        createdAt,
        updatedAt: createdAt,
        seenAt: match.kickoffAt.getTime() < NOW.getTime() - 3 * DAY ? NOW : null,
      });
    }
    // Un joker par journée, posé sur le match jugé le plus sûr.
    for (const [key, list] of perRound) {
      if (!rng.chance(player.jokerRate)) continue;
      const best = list.sort((a, b) => b.confidence - a.confidence)[0]!;
      const row = data[best.index]!;
      const [competitionId, seasonId, round] = key.split(":");
      row.isJoker = true;
      row.jokerKey = jokerKey(userId, competitionId!, seasonId!, Number(round));
    }
  }
  await prisma.prediction.createMany({ data });
  return data.length;
}

/* ------------------------------------------------------------------ */
/*                        Notifications de démo                        */
/* ------------------------------------------------------------------ */

async function seedNotifications(
  users: Map<string, { id: string; player: SeedPlayer }>,
  leagues: { id: string; name: string; ownerId: string }[],
) {
  const data: Prisma.NotificationCreateManyInput[] = [];
  for (const { id: userId, player } of users.values()) {
    data.push({
      userId,
      type: "SYSTEM",
      title: `Bienvenue ${player.name} !`,
      body: "Pronostiquez avant le coup d'envoi, posez un joker par journée et grimpez au classement.",
      href: "/matchs",
      createdAt: new Date(NOW.getTime() - 40 * DAY),
      readAt: new Date(NOW.getTime() - 40 * DAY),
    });
    const recent = await prisma.prediction.findMany({
      where: { userId, scoredAt: { not: null } },
      orderBy: { match: { kickoffAt: "desc" } },
      take: 4,
      select: {
        state: true,
        points: true,
        isJoker: true,
        match: {
          select: {
            id: true,
            kickoffAt: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { shortName: true } },
            awayTeam: { select: { shortName: true } },
          },
        },
      },
    });
    for (const r of recent) {
      const at = new Date(r.match.kickoffAt.getTime() + 2 * HOUR);
      data.push({
        userId,
        type: "RESULT",
        title: `${r.match.homeTeam.shortName} ${r.match.homeScore}-${r.match.awayScore} ${r.match.awayTeam.shortName}`,
        body:
          r.state === "EXACT"
            ? `Score exact ! +${r.points} points${r.isJoker ? " (joker)" : ""}.`
            : r.state === "WON"
              ? `Bon résultat : +${r.points} points${r.isJoker ? " (joker)" : ""}.`
              : "Raté cette fois, aucun point.",
        href: `/matchs/${r.match.id}`,
        dedupeKey: `result:${userId}:${r.match.id}`,
        createdAt: at,
        readAt: at.getTime() < NOW.getTime() - 2 * DAY ? NOW : null,
      });
    }
  }
  for (const league of leagues) {
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: league.id, role: "MEMBER" },
      orderBy: { joinedAt: "desc" },
      take: 2,
      include: { user: { select: { username: true } } },
    });
    for (const m of members) {
      data.push({
        userId: league.ownerId,
        type: "LEAGUE",
        title: league.name,
        body: `${m.user.username} a rejoint votre ligue.`,
        href: `/ligues`,
        createdAt: m.joinedAt,
        readAt: m.joinedAt,
      });
    }
  }
  await prisma.notification.createMany({ data, skipDuplicates: true });
  return data.length;
}

/* ------------------------------------------------------------------ */

async function main() {
  const season = Number(process.env.FOOTBALL_SEASON ?? currentSeasonYear(NOW));
  console.info(
    `Seed PronoFoot — saison ${season}-${String(season + 1).slice(2)}, référence ${NOW.toISOString()}`,
  );
  await resetDatabase();

  // Les services partagés (calcul des points, badges, classements) utilisent le client de l'application.
  const [
    { ensureBadges, awardFounderBadge, awardMonthKing },
    { scorePendingMatches },
    { recomputeStandings },
    { monthlyWinner },
  ] = await Promise.all([
    import("../../src/server/services/badges"),
    import("../../src/server/services/scoring"),
    import("../../src/server/services/standings"),
    import("../../src/server/services/leaderboards"),
  ]);
  await ensureBadges();

  const teams = await seedTeams();
  const comps = await seedCompetitions(season);
  const matchStats = await seedMatches(planSeason(season, teams), comps);
  console.info(
    `  ${teams.size} clubs, ${matchStats.total} matchs (${matchStats.finished} joués, ${matchStats.shifted} décalés)`,
  );

  const users = await seedUsers(teams);
  const leagues = await seedLeagues(users);
  const predictions = await seedPredictions(users);
  console.info(`  ${users.size} joueurs, ${leagues.length} ligues, ${predictions} pronostics`);

  // Calcul des points par le moteur officiel (sans notifications temps réel).
  const scored = await scorePendingMatches({ notifyUsers: false, now: NOW });
  console.info(`  ${scored.matches} matchs notés, ${scored.badges} badges attribués`);
  for (const { seasonId } of comps.values()) await recomputeStandings(seasonId);
  for (const league of leagues) await awardFounderBadge(league.id, { notifyUser: false });

  // Rois des mois terminés de la saison.
  let cursor = parisMonthRange(new Date(Date.UTC(season, 7, 15)));
  while (cursor.end <= NOW) {
    const winner = await monthlyWinner(cursor.start, cursor.end);
    if (winner) await awardMonthKing(winner.userId, formatMonth(cursor.start), { notifyUser: false });
    cursor = parisMonthRange(new Date(cursor.end.getTime() + DAY));
  }

  const notifications = await seedNotifications(users, leagues);
  console.info(`  ${notifications} notifications`);
  console.info(
    `Terminé. Compte admin : ${[...users.values()][0] ? (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.email : "?"}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma: appPrisma } = await import("../../src/server/db");
    await Promise.all([prisma.$disconnect(), appPrisma.$disconnect()]);
  });
