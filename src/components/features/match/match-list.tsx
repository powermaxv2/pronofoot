"use client";

import { LottiePlayer } from "@/components/motion/lottie-player";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { formatDayLong, parisDayKey, relativeDay } from "@/lib/dates";
import type { MatchCardData } from "@/server/queries/matches";
import { MatchCard } from "./match-card";

/** Matchs groupés par jour, apparition en cascade. */
export function MatchList({
  matches,
  emptyTitle,
  emptyText,
  listKey,
}: {
  matches: MatchCardData[];
  emptyTitle: string;
  emptyText: string;
  listKey: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="glass grid justify-items-center gap-2 rounded-3xl px-6 py-10 text-center">
        <LottiePlayer src="/lottie/ball-roll.json" className="w-48" />
        <h2 className="font-display text-3xl tracking-wide">{emptyTitle}</h2>
        <p className="text-muted-foreground max-w-[44ch]">{emptyText}</p>
      </div>
    );
  }
  const groups = new Map<string, MatchCardData[]>();
  for (const m of matches)
    groups.set(parisDayKey(m.kickoffAt), [...(groups.get(parisDayKey(m.kickoffAt)) ?? []), m]);
  let index = 0;
  return (
    <StaggerList key={listKey} className="grid gap-8">
      {[...groups.entries()].map(([day, list]) => (
        <section key={day} aria-label={formatDayLong(list[0]!.kickoffAt)} className="grid gap-3">
          <StaggerItem index={index++}>
            <h2 className="font-condensed flex items-baseline gap-2 text-lg font-bold tracking-wide uppercase">
              {relativeDay(list[0]!.kickoffAt)}
              <span className="text-muted-foreground text-sm font-semibold normal-case">
                {formatDayLong(list[0]!.kickoffAt)}
              </span>
            </h2>
          </StaggerItem>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((match) => (
              <StaggerItem key={match.id} index={index++}>
                <MatchCard match={match} />
              </StaggerItem>
            ))}
          </div>
        </section>
      ))}
    </StaggerList>
  );
}
