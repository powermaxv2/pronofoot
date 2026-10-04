"use client";

import { useEffect, useRef } from "react";
import { fireConfetti } from "@/components/motion/confetti";
import { toast } from "@/components/ui/toaster";
import { markPredictionSeen } from "@/server/actions/predictions";
import type { MatchCardData } from "@/server/queries/matches";

/** Célèbre (une seule fois) les scores exacts pas encore vus. */
export function ResultsCelebration({ matches }: { matches: MatchCardData[] }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const unseen = matches.filter(
      (m) => m.prediction && m.prediction.state !== "PENDING" && !m.prediction.seenAt,
    );
    if (unseen.length === 0) return;
    const exact = unseen.filter((m) => m.prediction!.state === "EXACT");
    if (exact.length) {
      void fireConfetti();
      const m = exact[0]!;
      toast.badge(exact.length > 1 ? `${exact.length} scores exacts !` : "Score exact !", {
        description: `${m.homeTeam.shortName} ${m.homeScore}-${m.awayScore} ${m.awayTeam.shortName} : +${m.prediction!.points} points.`,
      });
    }
    for (const m of unseen) void markPredictionSeen(m.id);
  }, [matches]);
  return null;
}
