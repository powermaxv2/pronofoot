"use client";

import { m } from "motion/react";
import { TeamCrest, type CrestTeam } from "@/components/features/match/team-crest";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type StandingRow = {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
  team: CrestTeam & { id: string; shortName: string };
};

const FORM = { W: "bg-primary", D: "bg-muted-foreground/60", L: "bg-destructive" } as const;

/** Classement officiel : lignes en cascade, zones colorées, forme récente. */
export function StandingsTable({
  rows,
  highlightTeamId,
  zones,
}: {
  rows: StandingRow[];
  highlightTeamId?: string | null;
  zones: { top: number; europe: number; relegation: number };
}) {
  const reduced = useReducedMotion();
  const zone = (pos: number) =>
    pos <= zones.top
      ? "bg-primary"
      : pos <= zones.europe
        ? "bg-sky-500"
        : pos > rows.length - zones.relegation
          ? "bg-destructive"
          : "bg-transparent";
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="label-caps text-muted-foreground">
          <tr className="text-left">
            <th className="w-10 py-3 pl-4 font-semibold">#</th>
            <th className="py-3 font-semibold">Club</th>
            {["J", "G", "N", "P", "Diff."].map((h) => (
              <th key={h} className="py-3 text-right font-semibold">
                {h}
              </th>
            ))}
            <th className="py-3 pl-4 text-left font-semibold">Forme</th>
            <th className="py-3 pr-4 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <m.tr
              key={r.team.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: ease.out, delay: Math.min(i, 14) * 0.03 }}
              className={cn("border-border relative border-t", r.team.id === highlightTeamId && "bg-volt/15")}
            >
              <td className="relative py-2 pl-4">
                <span
                  className={cn("absolute top-1 bottom-1 left-0 w-1 rounded-r", zone(r.position))}
                  aria-hidden
                />
                <span className="font-display tabular text-lg">{r.position}</span>
              </td>
              <td className="py-2">
                <span className="flex items-center gap-2 font-semibold">
                  <TeamCrest team={r.team} size={22} /> {r.team.shortName}
                </span>
              </td>
              <td className="tabular py-2 text-right">{r.played}</td>
              <td className="tabular py-2 text-right">{r.won}</td>
              <td className="tabular py-2 text-right">{r.drawn}</td>
              <td className="tabular py-2 text-right">{r.lost}</td>
              <td className="tabular py-2 text-right">
                {r.goalsFor - r.goalsAgainst > 0
                  ? `+${r.goalsFor - r.goalsAgainst}`
                  : r.goalsFor - r.goalsAgainst}
              </td>
              <td className="py-2 pl-4">
                <span className="flex gap-1" aria-label={`Forme : ${r.form ?? "inconnue"}`}>
                  {(r.form ?? "").split("").map((f, j) => (
                    <span
                      key={j}
                      className={cn("size-2.5 rounded-full", FORM[f as keyof typeof FORM] ?? "bg-border")}
                    />
                  ))}
                </span>
              </td>
              <td className="font-display tabular py-2 pr-4 text-right text-xl">{r.points}</td>
            </m.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
