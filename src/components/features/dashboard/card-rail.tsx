"use client";

import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { MatchCard } from "@/components/features/match/match-card";
import type { MatchCardData } from "@/server/queries/matches";

/** Rangée de cartes défilante (mobile) / grille (desktop). */
export function CardRail({ matches, showDay = true }: { matches: MatchCardData[]; showDay?: boolean }) {
  return (
    <StaggerList className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
      {matches.map((m, i) => (
        <StaggerItem key={m.id} index={i} className="w-[85%] shrink-0 snap-start md:w-auto">
          <MatchCard match={m} showDay={showDay} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
