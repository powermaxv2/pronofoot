"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft, ChevronRight, Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { LeaderboardView, PeriodParam } from "@/server/queries/leaderboard";
import type { LeaderboardRow } from "@/server/services/leaderboards";

type Params = { periode: PeriodParam; mois?: string; comp?: string; journee?: string };
type Competition = { code: string; shortName: string; color: string };

const DISPLAY_LIMIT = 50;
const MEDALS = ["#f5c542", "#c0c7d1", "#d08b4c"];

function toSearch(params: Params, ligue?: string) {
  const sp = new URLSearchParams();
  if (params.periode !== "saison") sp.set("periode", params.periode);
  if (params.periode === "mois" && params.mois) sp.set("mois", params.mois);
  if (params.periode === "journee") {
    if (params.comp) sp.set("comp", params.comp);
    if (params.journee) sp.set("journee", params.journee);
  }
  if (ligue) sp.set("ligue", ligue);
  return sp;
}

/** Ligne de classement : se déplace en ressort, flash vert/rouge quand le rang change. */
function Row({ row, me, change }: { row: LeaderboardRow; me: boolean; change: "up" | "down" | null }) {
  const reduced = useReducedMotion();
  const delta = row.delta;
  return (
    <m.li
      layout={reduced ? false : "position"}
      transition={spring.layout}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "relative grid grid-cols-[2.25rem_2.5rem_1fr_auto_auto] items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5",
        me ? "bg-volt/15 ring-volt/50 ring-1" : "glass-strong",
      )}
    >
      <AnimatePresence>
        {change && (
          <m.span
            key={change + row.rank}
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className={cn(
              "pointer-events-none absolute inset-0",
              change === "up" ? "bg-primary" : "bg-destructive",
            )}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <span className="font-display relative grid place-items-center text-2xl leading-none">
        {row.rank <= 3 && row.points > 0 ? (
          <span
            className="grid size-8 place-items-center rounded-full text-lg text-black"
            style={{ background: MEDALS[row.rank - 1] }}
          >
            {row.rank === 1 ? <Crown className="size-4" aria-label="1er" /> : row.rank}
          </span>
        ) : (
          <span className="text-muted-foreground">{row.rank}</span>
        )}
      </span>
      <Avatar name={row.user.username} src={row.user.avatarUrl ?? row.user.image} size={40} />
      <Link href={`/profil/${row.user.username}`} className="relative min-w-0 hover:underline">
        <span className="font-condensed block truncate text-base font-bold tracking-wide">
          {row.user.username}
          {me && <span className="text-grass-ink"> · vous</span>}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {row.exact} exact{row.exact > 1 ? "s" : ""} · {row.won} bons · {row.predictions} pronos
        </span>
      </Link>
      <span
        className="relative w-10 text-right"
        aria-label={
          delta == null
            ? "Nouveau"
            : delta > 0
              ? `+${delta} places`
              : delta < 0
                ? `${delta} places`
                : "Stable"
        }
      >
        {delta == null ? null : delta > 0 ? (
          <span className="text-grass-ink inline-flex items-center gap-0.5 text-xs font-bold">
            <TrendingUp className="size-3.5" aria-hidden />
            {delta}
          </span>
        ) : delta < 0 ? (
          <span className="text-destructive inline-flex items-center gap-0.5 text-xs font-bold">
            <TrendingDown className="size-3.5" aria-hidden />
            {-delta}
          </span>
        ) : (
          <Minus className="text-muted-foreground ml-auto size-3.5" aria-hidden />
        )}
      </span>
      <span className="font-display relative w-14 text-right text-3xl leading-none">
        <AnimatedNumber value={row.points} fromZero={false} />
      </span>
    </m.li>
  );
}

/**
 * Classement interactif : période (saison, mois, journée), navigation,
 * rafraîchissement automatique. Les lignes se réordonnent en animation
 * quand les points changent.
 */
export function LeaderboardBoard({
  initial,
  initialParams,
  meId,
  competitions,
  leagueSlug,
}: {
  initial: LeaderboardView;
  initialParams: Params;
  meId: string;
  competitions: Competition[];
  leagueSlug?: string;
}) {
  const [params, setParams] = useState<Params>(initialParams);
  const search = toSearch(params, leagueSlug).toString();
  const initialSearch = useRef(toSearch(initialParams, leagueSlug).toString());
  const { data, isFetching } = useQuery({
    queryKey: ["leaderboard", search],
    queryFn: async () => {
      const res = await fetch(`/api/classement?${search}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Classement indisponible");
      return (await res.json()) as LeaderboardView;
    },
    initialData: search === initialSearch.current ? initial : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const view = data ?? initial;

  // URL partageable sans rechargement.
  useEffect(() => {
    const sp = toSearch(params);
    window.history.replaceState(null, "", `${window.location.pathname}${sp.size ? `?${sp}` : ""}`);
  }, [params]);

  // Flash des lignes qui changent de rang entre deux rafraîchissements.
  const previous = useRef(new Map<string, number>());
  const changes = useMemo(() => {
    const map = new Map<string, "up" | "down">();
    for (const r of view.rows) {
      const before = previous.current.get(r.userId);
      if (before != null && before !== r.rank) map.set(r.userId, r.rank < before ? "up" : "down");
    }
    return map;
  }, [view.rows]);
  useEffect(() => {
    previous.current = new Map(view.rows.map((r) => [r.userId, r.rank]));
  }, [view.rows]);

  const shown = view.rows.slice(0, DISPLAY_LIMIT);
  const meRow = view.rows.find((r) => r.userId === meId);
  const meHidden = meRow && !shown.includes(meRow);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <Segmented
          ariaLabel="Période"
          value={params.periode}
          onChange={(periode) => setParams({ periode, comp: params.comp ?? view.round?.competition })}
          options={[
            { value: "saison", label: "Saison" },
            { value: "mois", label: "Mois" },
            { value: "journee", label: "Journée" },
          ]}
          className="max-w-md"
        />
        {view.period === "mois" && view.month && (
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Mois précédent"
              disabled={!view.month.prev}
              onClick={() => setParams({ ...params, mois: view.month!.prev! })}
            >
              <ChevronLeft />
            </Button>
            <span className="font-condensed min-w-40 text-center text-lg font-bold tracking-wide capitalize">
              {view.month.label}
            </span>
            <Button
              variant="glass"
              size="icon-sm"
              aria-label="Mois suivant"
              disabled={!view.month.next}
              onClick={() => setParams({ ...params, mois: view.month!.next! })}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
        {view.period === "journee" && view.round && (
          <div className="grid gap-3">
            <div
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
              role="group"
              aria-label="Compétition"
            >
              {competitions.map((c) => {
                const active = c.code === view.round!.competition;
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setParams({ periode: "journee", comp: c.code })}
                    className={cn(
                      "font-condensed shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-bold tracking-wide uppercase",
                      active ? "border-transparent text-white" : "border-border text-muted-foreground",
                    )}
                    style={active ? { background: c.color } : undefined}
                  >
                    {c.shortName}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="icon-sm"
                aria-label="Journée précédente"
                disabled={view.round.round <= view.round.min}
                onClick={() =>
                  setParams({
                    ...params,
                    comp: view.round!.competition,
                    journee: String(view.round!.round - 1),
                  })
                }
              >
                <ChevronLeft />
              </Button>
              <span className="font-condensed min-w-44 text-center text-lg font-bold tracking-wide">
                {view.round.label}
              </span>
              <Button
                variant="glass"
                size="icon-sm"
                aria-label="Journée suivante"
                disabled={view.round.round >= view.round.max}
                onClick={() =>
                  setParams({
                    ...params,
                    comp: view.round!.competition,
                    journee: String(view.round!.round + 1),
                  })
                }
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {view.rows.length === 0 ? (
        <p className="glass text-muted-foreground rounded-2xl p-6 text-center">
          Aucun point distribué sur cette période pour le moment.
        </p>
      ) : (
        <ol
          className={cn("grid gap-1.5 transition-opacity", isFetching && data !== undefined && "opacity-90")}
          aria-live="polite"
        >
          <AnimatePresence initial={false}>
            {shown.map((row) => (
              <Row
                key={row.userId}
                row={row}
                me={row.userId === meId}
                change={changes.get(row.userId) ?? null}
              />
            ))}
          </AnimatePresence>
        </ol>
      )}
      {meHidden && meRow && (
        <div className="safe-bottom sticky bottom-24 z-10 lg:bottom-4">
          <ol>
            <Row row={meRow} me change={changes.get(meRow.userId) ?? null} />
          </ol>
        </div>
      )}
    </div>
  );
}
