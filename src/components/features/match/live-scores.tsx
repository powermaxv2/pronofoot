"use client";

import type { MatchStatus } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type LiveState = {
  id: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

const LiveContext = createContext<Map<string, LiveState>>(new Map());

/**
 * Interroge /api/matches/live : toutes les 60 s quand un match est dans sa
 * fenêtre de direct, toutes les 5 min sinon. Aucun appel à l'API foot : la
 * route lit la base, alimentée par le worker.
 */
export function LiveScoresProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["matches", "live"],
    queryFn: async () => {
      const res = await fetch("/api/matches/live", { cache: "no-store" });
      if (!res.ok) throw new Error("Scores indisponibles");
      return (await res.json()) as { matches: LiveState[] };
    },
    refetchInterval: (query) => ((query.state.data?.matches.length ?? 0) > 0 ? 60_000 : 5 * 60_000),
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
  const map = useMemo(() => new Map((data?.matches ?? []).map((m) => [m.id, m])), [data]);
  return <LiveContext.Provider value={map}>{children}</LiveContext.Provider>;
}

/** Fusionne l'état serveur initial d'un match avec la dernière valeur en direct. */
export function useLiveMatch<T extends LiveState>(match: T): T {
  const live = useContext(LiveContext).get(match.id);
  return live ? { ...match, ...live } : match;
}
