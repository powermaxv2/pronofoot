"use client";

import { m } from "motion/react";
import Link from "next/link";
import { LiveBadge } from "@/components/motion/live-badge";
import { ScoreDigit } from "@/components/motion/score-digit";
import { TiltCard } from "@/components/motion/tilt-card";
import { formatTime, relativeDay } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MatchCardData } from "@/server/queries/matches";
import { Countdown } from "./countdown";
import { useLiveMatch } from "./live-scores";
import { PredictionChip } from "./prediction-chip";
import { STATUS_LABEL, awaitingResult, hasScore, isLiveStatus } from "./status";
import { TeamCrest } from "./team-crest";

export const matchLayoutId = (id: string, part: "card" | "home" | "away" | "score") => `match-${part}-${id}`;

function TeamRow({
  team,
  score,
  showScore,
  winner,
  layoutId,
}: {
  team: MatchCardData["homeTeam"];
  score: number | null;
  showScore: boolean;
  winner: boolean;
  layoutId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <m.span layoutId={layoutId} transition={spring.layout} className="grid w-8 place-items-center">
        <TeamCrest team={team} size={30} />
      </m.span>
      <span
        className={cn(
          "font-condensed min-w-0 flex-1 truncate text-lg font-semibold tracking-wide",
          !winner && showScore && "text-muted-foreground",
        )}
      >
        {team.shortName}
      </span>
      {showScore && (
        <ScoreDigit
          value={score}
          className={cn("font-display text-3xl leading-none", winner && "text-volt-ink")}
        />
      )}
    </div>
  );
}

/** Carte de match : tilt 3D, statut en direct, pronostic du joueur, morphing vers le détail. */
export function MatchCard({ match: initial, showDay = false }: { match: MatchCardData; showDay?: boolean }) {
  const match = useLiveMatch(initial);
  const live = isLiveStatus(match.status);
  const scored = hasScore(match.status);
  const open = match.status === "SCHEDULED" && match.kickoffAt.getTime() > Date.now();
  const winner = (side: "home" | "away") =>
    scored &&
    match.homeScore != null &&
    match.awayScore != null &&
    (side === "home" ? match.homeScore > match.awayScore : match.awayScore > match.homeScore);

  return (
    <Link
      href={`/matchs/${match.id}`}
      scroll={false}
      className="block rounded-2xl focus-visible:outline-offset-4"
      aria-label={`${match.homeTeam.name} contre ${match.awayTeam.name}`}
    >
      <TiltCard
        layoutId={matchLayoutId(match.id, "card")}
        className={cn("glass rounded-2xl p-4", live && "ring-live/40 ring-1")}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="label-caps text-muted-foreground flex min-w-0 items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: match.competition.color }}
              aria-hidden
            />
            <span className="truncate">
              {match.competition.shortName} · {match.roundLabel}
            </span>
          </span>
          {live ? (
            <LiveBadge
              minute={match.status === "LIVE" ? match.minute : null}
              label={match.status === "HALFTIME" ? "Mi-temps" : "Live"}
            />
          ) : (
            <span className="label-caps text-muted-foreground shrink-0">
              {match.status === "SCHEDULED"
                ? awaitingResult(match.status, match.kickoffAt)
                  ? "Résultat en attente"
                  : `${showDay ? `${relativeDay(match.kickoffAt)} · ` : ""}${formatTime(match.kickoffAt)}`
                : STATUS_LABEL[match.status]}
            </span>
          )}
        </div>
        <m.div
          layoutId={matchLayoutId(match.id, "score")}
          transition={spring.layout}
          className="mt-3 grid gap-2"
        >
          <TeamRow
            team={match.homeTeam}
            score={match.homeScore}
            showScore={scored}
            winner={winner("home")}
            layoutId={matchLayoutId(match.id, "home")}
          />
          <TeamRow
            team={match.awayTeam}
            score={match.awayScore}
            showScore={scored}
            winner={winner("away")}
            layoutId={matchLayoutId(match.id, "away")}
          />
        </m.div>
        <div className="border-border mt-3 flex min-h-7 items-center justify-between gap-2 border-t pt-3">
          <PredictionChip prediction={match.prediction} open={open} />
          {open && <Countdown to={match.kickoffAt} className="text-muted-foreground shrink-0 text-xs" />}
        </div>
      </TiltCard>
    </Link>
  );
}
