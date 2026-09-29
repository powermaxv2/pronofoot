export type LeaderboardInput = {
  userId: string;
  points: number;
  exact: number;
  won: number;
  predictions: number;
  joinedAt: Date;
};

export type LeaderboardEntry = LeaderboardInput & { rank: number };

/**
 * Trie et classe les joueurs.
 * Départage : points → scores exacts → bons résultats → ancienneté d'inscription.
 * Deux joueurs parfaitement à égalité (hors ancienneté) partagent le même rang.
 */
export function rankLeaderboard(entries: readonly LeaderboardInput[]): LeaderboardEntry[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.won - a.won ||
      a.joinedAt.getTime() - b.joinedAt.getTime() ||
      a.userId.localeCompare(b.userId),
  );
  let rank = 0;
  let previous: LeaderboardInput | undefined;
  return sorted.map((e, i) => {
    const tie =
      previous && previous.points === e.points && previous.exact === e.exact && previous.won === e.won;
    rank = tie ? rank : i + 1;
    previous = e;
    return { ...e, rank };
  });
}

/** Variation de rang : positive = montée. `null` si pas de rang précédent. */
export function rankDelta(current: number, previous: number | undefined): number | null {
  return previous == null ? null : previous - current;
}
