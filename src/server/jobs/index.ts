import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { currentSeasonYear, formatMonth, formatTime, parisMonthRange } from "@/lib/dates";
import { prisma } from "@/server/db";
import { COMPETITION_CODES, isCompetitionCode, type CompetitionCode } from "@/server/football/competitions";
import { upsertFixture, upsertStandings } from "@/server/football/importer";
import { anyProviderConfigured, PROVIDERS, withFallback } from "@/server/football/providers";
import { headToHeadSchema, lineupsSchema } from "@/server/football/types";
import { notify } from "@/server/notifications";
import { awardMonthKing, ensureBadges } from "@/server/services/badges";
import { monthlyWinner } from "@/server/services/leaderboards";
import { reopenMatch, scorePendingMatches } from "@/server/services/scoring";
import { recomputeStandings } from "@/server/services/standings";
import type { JobDefinition, JobResult } from "./runner";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Fenêtre « live » d'un match : de H-5 min à H+150 min. */
export const LIVE_WINDOW = { before: 5 * MINUTE, after: 150 * MINUTE } as const;

const seasonYear = () => env().FOOTBALL_SEASON ?? currentSeasonYear();
const noProvider: JobResult = {
  skipped: true,
  message: "Aucune clé d'API football configurée : synchronisation désactivée.",
};

/** Post-traitement commun des matchs importés. */
async function afterImport(changes: Awaited<ReturnType<typeof upsertFixture>>[]) {
  for (const c of changes) {
    if (
      c.statusChanged &&
      c.status === "SCHEDULED" &&
      (c.previousStatus === "POSTPONED" || c.previousStatus === "CANCELLED")
    ) {
      await reopenMatch(c.matchId);
    }
  }
  const finished = changes.filter(
    (c) => c.statusChanged && ["FINISHED", "POSTPONED", "CANCELLED"].includes(c.status),
  );
  return finished.length ? scorePendingMatches() : null;
}

/* ------------------------------------------------------------------ */

export const syncFixtures: JobDefinition = {
  name: "sync:fixtures",
  label: "Calendrier",
  description: "Importe les matchs de J-3 à J+14 des 6 compétitions.",
  schedule: "10 4 * * *",
  async run({ now }) {
    if (!anyProviderConfigured()) return noProvider;
    const season = seasonYear();
    const from = new Date(now.getTime() - 3 * DAY);
    const to = new Date(now.getTime() + 14 * DAY);
    const stats: Record<string, number | string> = { created: 0, updated: 0 };
    const failures: string[] = [];
    const changes = [];
    for (const code of COMPETITION_CODES) {
      try {
        const { provider, result } = await withFallback("fixtures", (p) =>
          p.fixtures(code, season, from, to),
        );
        for (const fx of result) {
          const change = await upsertFixture(fx);
          changes.push(change);
          stats[change.created ? "created" : "updated"] =
            Number(stats[change.created ? "created" : "updated"]) + 1;
        }
        stats[code] = `${result.length} (${provider})`;
      } catch (error) {
        failures.push(`${code} : ${(error as Error).message}`);
      }
    }
    await afterImport(changes);
    if (failures.length === COMPETITION_CODES.length) throw new Error(failures.join(" | "));
    return { stats, message: failures.length ? failures.join(" | ") : undefined };
  },
};

/** Matchs dans leur fenêtre live. */
export async function matchesInLiveWindow(now: Date) {
  return prisma.match.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
      kickoffAt: {
        gte: new Date(now.getTime() - LIVE_WINDOW.after),
        lte: new Date(now.getTime() + LIVE_WINDOW.before),
      },
    },
    select: {
      id: true,
      status: true,
      kickoffAt: true,
      competition: { select: { code: true } },
      season: { select: { year: true } },
    },
  });
}

export const syncLive: JobDefinition = {
  name: "sync:live",
  label: "Scores en direct",
  description: "Met à jour les scores toutes les minutes, uniquement pendant les matchs.",
  schedule: "* * * * *",
  async run({ now }) {
    const window = await matchesInLiveWindow(now);
    if (window.length === 0) return { skipped: true, message: "Aucun match en cours." };
    if (!anyProviderConfigured()) return noProvider;
    const codes = [...new Set(window.map((m) => m.competition.code).filter(isCompetitionCode))];
    const { provider, result } = await withFallback("live", (p) => p.live(codes));
    const changes = [];
    for (const fx of result) changes.push(await upsertFixture(fx));
    const seen = new Set(changes.map((c) => c.matchId));

    // Matchs attendus mais absents du flux live : terminés ou pas encore commencés → vérification ciblée.
    const missing = window.filter((m) => !seen.has(m.id) && m.kickoffAt.getTime() < now.getTime());
    const days = new Map<string, { code: CompetitionCode; season: number; day: Date }>();
    for (const m of missing) {
      if (!isCompetitionCode(m.competition.code)) continue;
      const day = new Date(m.kickoffAt);
      day.setUTCHours(0, 0, 0, 0);
      days.set(`${m.competition.code}:${day.toISOString()}`, {
        code: m.competition.code,
        season: m.season.year,
        day,
      });
    }
    for (const { code, season, day } of days.values()) {
      const { result: fixtures } = await withFallback("fixtures", (p) =>
        p.fixtures(code, season, day, day, { ttlMs: 2 * MINUTE }),
      );
      for (const fx of fixtures) changes.push(await upsertFixture(fx));
    }
    const scored = await afterImport(changes);
    return {
      stats: {
        provider,
        live: result.length,
        checked: days.size,
        goals: changes.filter((c) => c.goalsChanged).length,
        finished: changes.filter((c) => c.statusChanged && c.status === "FINISHED").length,
        scoredMatches: scored?.matches ?? 0,
      },
    };
  },
};

export const syncStandings: JobDefinition = {
  name: "sync:standings",
  label: "Classements officiels",
  description: "Importe les classements (ou les recalcule depuis les résultats sans clé d'API).",
  schedule: "20 */6 * * *",
  async run() {
    const season = seasonYear();
    const stats: Record<string, number | string> = {};
    const failures: string[] = [];
    for (const code of COMPETITION_CODES) {
      try {
        if (anyProviderConfigured()) {
          const { provider, result } = await withFallback("standings", (p) => p.standings(code, season));
          if (result.length) {
            stats[code] = `${await upsertStandings(provider, code, season, result)} (${provider})`;
            continue;
          }
        }
        const comp = await prisma.competition.findUnique({
          where: { code },
          select: { currentSeasonId: true },
        });
        if (comp?.currentSeasonId)
          stats[code] = `${await recomputeStandings(comp.currentSeasonId)} (calculé)`;
      } catch (error) {
        failures.push(`${code} : ${(error as Error).message}`);
        const comp = await prisma.competition.findUnique({
          where: { code },
          select: { currentSeasonId: true },
        });
        if (comp?.currentSeasonId)
          stats[code] = `${await recomputeStandings(comp.currentSeasonId)} (calculé)`;
      }
    }
    return { stats, message: failures.length ? failures.join(" | ") : undefined };
  },
};

export const syncDetails: JobDefinition = {
  name: "sync:details",
  label: "Compositions & face-à-face",
  description: "Compositions autour du coup d'envoi, face-à-face des matchs des 3 prochains jours.",
  schedule: "*/10 * * * *",
  async run({ now }) {
    if (!anyProviderConfigured()) return noProvider;
    const stats = { lineups: 0, headToHead: 0, errors: 0 };
    const lineupTargets = PROVIDERS["api-football"].isConfigured()
      ? await prisma.match.findMany({
          where: {
            lineups: { equals: Prisma.DbNull },
            apiFootballId: { not: null },
            kickoffAt: {
              gte: new Date(now.getTime() - 3 * HOUR),
              lte: new Date(now.getTime() + 75 * MINUTE),
            },
          },
          select: { id: true, apiFootballId: true, homeTeam: { select: { apiFootballId: true } } },
          take: 10,
        })
      : [];
    for (const m of lineupTargets) {
      try {
        const { result } = await withFallback("lineups", (p) =>
          p.lineups({ apiFootballMatch: m.apiFootballId, apiFootballHome: m.homeTeam.apiFootballId }),
        );
        if (result) {
          await prisma.match.update({ where: { id: m.id }, data: { lineups: lineupsSchema.parse(result) } });
          stats.lineups += 1;
        }
      } catch {
        stats.errors += 1;
      }
    }
    const h2hTargets = await prisma.match.findMany({
      where: {
        headToHead: { equals: Prisma.DbNull },
        status: "SCHEDULED",
        kickoffAt: { gte: now, lte: new Date(now.getTime() + 3 * DAY) },
        OR: [{ footballDataId: { not: null } }, { homeTeam: { apiFootballId: { not: null } } }],
      },
      select: {
        id: true,
        footballDataId: true,
        homeTeam: { select: { apiFootballId: true } },
        awayTeam: { select: { apiFootballId: true } },
      },
      orderBy: { kickoffAt: "asc" },
      take: 6,
    });
    for (const m of h2hTargets) {
      try {
        const { result } = await withFallback("headToHead", (p) =>
          p.headToHead({
            apiFootballHome: m.homeTeam.apiFootballId,
            apiFootballAway: m.awayTeam.apiFootballId,
            footballDataMatch: m.footballDataId,
          }),
        );
        await prisma.match.update({
          where: { id: m.id },
          data: { headToHead: headToHeadSchema.parse(result) },
        });
        stats.headToHead += 1;
      } catch {
        stats.errors += 1;
      }
    }
    return { stats };
  },
};

export const score: JobDefinition = {
  name: "score",
  label: "Calcul des points",
  description: "Distribue les points des matchs terminés, attribue les badges et notifie les joueurs.",
  schedule: "*/2 * * * *",
  async run() {
    await ensureBadges();
    const stats = await scorePendingMatches();
    if (stats.matches === 0) return { skipped: true, message: "Aucun match à noter." };
    // Sans fournisseur, les classements officiels sont recalculés depuis les résultats.
    if (!anyProviderConfigured()) {
      const seasons = await prisma.competition.findMany({ select: { currentSeasonId: true } });
      for (const s of seasons) if (s.currentSeasonId) await recomputeStandings(s.currentSeasonId);
    }
    return { stats: { ...stats } };
  },
};

export const reminders: JobDefinition = {
  name: "reminders",
  label: "Rappels H-1",
  description: "Rappelle les matchs non pronostiqués qui commencent dans l'heure.",
  schedule: "*/5 * * * *",
  async run({ now }) {
    const matches = await prisma.match.findMany({
      where: { status: "SCHEDULED", kickoffAt: { gt: now, lte: new Date(now.getTime() + HOUR) } },
      select: {
        id: true,
        kickoffAt: true,
        competitionId: true,
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { shortName: true } },
        awayTeam: { select: { shortName: true } },
        competition: { select: { name: true } },
      },
    });
    if (matches.length === 0) return { skipped: true, message: "Aucun match dans l'heure." };
    let sent = 0;
    for (const m of matches) {
      // Joueurs concernés : ont déjà pronostiqué dans cette compétition cette saison, ou supportent une des deux équipes.
      const users = await prisma.user.findMany({
        where: {
          disabledAt: null,
          onboardedAt: { not: null },
          notifyReminders: true,
          predictions: { none: { matchId: m.id } },
          OR: [
            { predictions: { some: { match: { competitionId: m.competitionId, seasonId: m.seasonId } } } },
            { favoriteTeamId: { in: [m.homeTeamId, m.awayTeamId] } },
          ],
        },
        select: { id: true },
      });
      for (const u of users) {
        const created = await notify({
          userId: u.id,
          type: "REMINDER",
          title: `${m.homeTeam.shortName} – ${m.awayTeam.shortName} à ${formatTime(m.kickoffAt)}`,
          body: `Coup d'envoi dans moins d'une heure (${m.competition.name}) et vous n'avez pas encore pronostiqué.`,
          href: `/matchs/${m.id}`,
          dedupeKey: `reminder:${u.id}:${m.id}`,
        });
        if (created) sent += 1;
      }
    }
    return { stats: { matches: matches.length, sent } };
  },
};

export const cleanup: JobDefinition = {
  name: "cleanup",
  label: "Maintenance",
  description: "Purge caches et journaux anciens, désigne le roi du mois écoulé.",
  schedule: "30 3 * * *",
  async run({ now }) {
    const [cache, runs, notifications, usage, tokens, sessions] = await prisma.$transaction([
      prisma.apiCache.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - DAY) } } }),
      prisma.cronRun.deleteMany({ where: { startedAt: { lt: new Date(now.getTime() - 30 * DAY) } } }),
      prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * DAY) } } }),
      prisma.apiUsage.deleteMany({ where: { window: { lt: new Date(now.getTime() - 7 * DAY) } } }),
      prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
      prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    ]);
    // Roi du mois : vainqueur du classement général du mois précédent.
    const previousMonth = parisMonthRange(new Date(parisMonthRange(now).start.getTime() - DAY));
    const winner = await monthlyWinner(previousMonth.start, previousMonth.end);
    let king = "—";
    if (winner) {
      const label = formatMonth(previousMonth.start);
      await awardMonthKing(winner.userId, label);
      await notify({
        userId: winner.userId,
        type: "SYSTEM",
        title: `Roi du mois de ${label} !`,
        body: `Vous terminez 1er du classement général avec ${winner.points} points.`,
        href: "/classements?periode=mois",
        dedupeKey: `month-king:${label}`,
      });
      king = winner.userId;
    }
    return {
      stats: {
        cache: cache.count,
        cronRuns: runs.count,
        notifications: notifications.count,
        usage: usage.count,
        tokens: tokens.count,
        sessions: sessions.count,
        monthKing: king,
      },
    };
  },
};

export const JOBS = [syncLive, score, reminders, syncDetails, syncFixtures, syncStandings, cleanup] as const;
export const JOB_BY_NAME = new Map<string, JobDefinition>(JOBS.map((j) => [j.name, j]));
