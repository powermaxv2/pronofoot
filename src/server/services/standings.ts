import { prisma } from "@/server/db";

type Row = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  results: { at: number; r: "W" | "D" | "L" }[];
};

/**
 * Recalcule le classement d'une saison à partir des matchs terminés en base.
 * Utilisé quand aucun fournisseur n'est configuré, après une saisie manuelle
 * de score, et par le seed.
 */
export async function recomputeStandings(seasonId: string) {
  const matches = await prisma.match.findMany({
    where: { seasonId, round: { lte: 38 } },
    select: {
      status: true,
      round: true,
      kickoffAt: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      competition: { select: { code: true } },
    },
  });
  const rows = new Map<string, Row>();
  const row = (teamId: string) => {
    let r = rows.get(teamId);
    if (!r) {
      r = {
        teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        results: [],
      };
      rows.set(teamId, r);
    }
    return r;
  };
  for (const m of matches) {
    // Phase de ligue C1 uniquement (journées 1 à 8).
    if (m.competition.code === "CL" && m.round > 8) continue;
    const home = row(m.homeTeamId);
    const away = row(m.awayTeamId);
    if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) continue;
    const at = m.kickoffAt.getTime();
    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
      home.results.push({ at, r: "W" });
      away.results.push({ at, r: "L" });
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
      home.results.push({ at, r: "L" });
      away.results.push({ at, r: "W" });
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.results.push({ at, r: "D" });
      away.results.push({ at, r: "D" });
    }
  }
  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.teamId.localeCompare(b.teamId),
  );
  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { seasonId } }),
    prisma.standing.createMany({
      data: sorted.map((r, i) => ({
        seasonId,
        teamId: r.teamId,
        position: i + 1,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        points: r.points,
        form:
          r.results
            .sort((a, b) => a.at - b.at)
            .slice(-5)
            .map((x) => x.r)
            .join("") || null,
      })),
    }),
  ]);
  return sorted.length;
}
