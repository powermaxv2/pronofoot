"use client";

import { m } from "motion/react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { spring } from "@/lib/motion";
import { OUTCOME_SHORT } from "./labels";
import type { MatchCardData } from "@/server/queries/matches";

/** Résumé du pronostic d'un joueur sur une carte de match. */
export function PredictionChip({
  prediction,
  open,
}: {
  prediction: MatchCardData["prediction"];
  open: boolean;
}) {
  if (!prediction) {
    return open ? (
      <Badge variant="volt">À pronostiquer</Badge>
    ) : (
      <span className="text-muted-foreground text-xs">Pas de pronostic</span>
    );
  }
  const pick =
    prediction.homeScore != null
      ? `${prediction.homeScore}-${prediction.awayScore}`
      : OUTCOME_SHORT[prediction.outcome];
  const scored = prediction.state !== "PENDING";
  return (
    <span className="flex items-center gap-2">
      <span className="font-condensed text-muted-foreground text-sm font-semibold">
        Mon prono <span className="text-foreground">{pick}</span>
      </span>
      {prediction.isJoker && (
        <Badge variant="volt" className="px-1.5">
          <Sparkles className="size-3" aria-hidden /> ×2
        </Badge>
      )}
      {scored && (
        <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy}>
          <Badge
            variant={
              prediction.state === "EXACT" ? "volt" : prediction.state === "WON" ? "success" : "default"
            }
          >
            {prediction.state === "VOID"
              ? "Annulé"
              : `+${prediction.points} pt${prediction.points > 1 ? "s" : ""}`}
          </Badge>
        </m.span>
      )}
    </span>
  );
}
