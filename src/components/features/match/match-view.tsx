"use client";

import { CommunityPanel } from "@/components/features/prediction/community-panel";
import { PredictionPanel } from "@/components/features/prediction/prediction-panel";
import type { MatchDetail } from "@/server/queries/matches";
import { MatchDetailView } from "./match-detail";

/** Détail complet : informations du match + pronostic + communauté. */
export function MatchView({ detail }: { detail: MatchDetail }) {
  return (
    <MatchDetailView
      detail={detail}
      prediction={(live) => (
        <div className="grid gap-4">
          <PredictionPanel detail={detail} live={live} />
          <CommunityPanel
            community={live.community}
            myOutcome={detail.prediction?.outcome ?? null}
            labels={{ home: detail.homeTeam.shortName, away: detail.awayTeam.shortName }}
          />
        </div>
      )}
    />
  );
}
