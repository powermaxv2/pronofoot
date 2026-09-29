"use client";

import type { Outcome } from "@prisma/client";
import { Users } from "lucide-react";
import { ProgressBar } from "@/components/motion/progress-bar";
import { plural } from "@/lib/utils";
import type { MatchDetail } from "@/server/queries/matches";

/** Répartition des pronostics de la communauté (visible après le coup d'envoi). */
export function CommunityPanel({
  community,
  myOutcome,
  labels,
}: {
  community: MatchDetail["community"];
  myOutcome: Outcome | null;
  labels: { home: string; away: string };
}) {
  if (!community) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Users className="size-4" aria-hidden /> Les choix de la communauté seront dévoilés au coup
        d&apos;envoi.
      </p>
    );
  }
  if (community.total === 0) {
    return <p className="text-muted-foreground text-sm">Personne n&apos;a pronostiqué ce match.</p>;
  }
  const rows: { key: Outcome; label: string }[] = [
    { key: "HOME", label: "1" },
    { key: "DRAW", label: "N" },
    { key: "AWAY", label: "2" },
  ];
  const top = rows.reduce(
    (best, r) => (community.distribution[r.key] > community.distribution[best.key] ? r : best),
    rows[0]!,
  );
  return (
    <section aria-label="La communauté a voté" className="glass-strong grid gap-4 rounded-2xl p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl leading-none tracking-wide">La communauté a voté</h2>
        <span className="label-caps text-muted-foreground">{plural(community.total, "prono")}</span>
      </header>
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={r.key} className="grid gap-1">
            <ProgressBar
              label={r.label}
              value={community.distribution[r.key]}
              highlight={r.key === top.key}
              delay={i * 0.1}
            />
            <span className="text-muted-foreground pl-11 text-xs">
              {r.key === "HOME" ? labels.home : r.key === "AWAY" ? labels.away : "Match nul"}
              {myOutcome === r.key && <span className="text-grass-ink font-semibold"> · votre choix</span>}
            </span>
          </div>
        ))}
      </div>
      {community.topScores.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-muted-foreground">Scores les plus joués</span>
          {community.topScores.map((s) => (
            <span key={s.score} className="glass font-condensed rounded-full px-3 py-1 text-sm font-semibold">
              {s.score} · {Math.round(s.share * 100)} %
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
