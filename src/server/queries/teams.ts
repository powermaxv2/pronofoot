import "server-only";
import { prisma } from "@/server/db";
import type { PickerTeam } from "@/components/features/profile/team-picker";

/** Clubs regroupés par championnat pour le sélecteur d'équipe favorite. */
export async function teamsForPicker(): Promise<PickerTeam[]> {
  const competitions = await prisma.competition.findMany({
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, currentSeasonId: true },
  });
  const seen = new Set<string>();
  const result: PickerTeam[] = [];
  for (const c of competitions) {
    if (!c.currentSeasonId) continue;
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { homeMatches: { some: { seasonId: c.currentSeasonId } } },
          { awayMatches: { some: { seasonId: c.currentSeasonId } } },
        ],
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true,
        tla: true,
        crestUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });
    for (const t of teams) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      result.push({ ...t, group: c.code === "CL" ? "Autres clubs européens" : c.name });
    }
  }
  return result;
}
