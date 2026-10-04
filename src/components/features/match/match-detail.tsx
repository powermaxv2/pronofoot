"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Flag, MapPin } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LiveBadge } from "@/components/motion/live-badge";
import { ScoreDigit } from "@/components/motion/score-digit";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { Segmented } from "@/components/ui/segmented";
import { useMotionPreset } from "@/hooks/use-motion-preset";
import { formatDate, formatKickoff, formatTime } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MatchEvent } from "@/server/football/types";
import type { MatchDetail as MatchDetailData } from "@/server/queries/matches";
import { Countdown } from "./countdown";
import { useLiveMatch } from "./live-scores";
import { matchLayoutId } from "./match-card";
import { STATUS_LABEL, awaitingResult, hasScore, isLiveStatus } from "./status";
import { TeamCrest } from "./team-crest";

type Tab = "summary" | "lineups" | "form" | "table";

export type LiveDetail = {
  status: MatchDetailData["status"];
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  htHome: number | null;
  htAway: number | null;
  events: MatchEvent[] | null;
  community: MatchDetailData["community"];
  prediction: { state: string; points: number; isJoker: boolean; seenAt: string | null } | null;
};

/** Polling du détail : actif pendant le match, peu avant et en attente du résultat. */
export function useMatchLive(detail: MatchDetailData) {
  const base = useLiveMatch(detail);
  const watch =
    isLiveStatus(base.status) ||
    awaitingResult(base.status, base.kickoffAt) ||
    (base.status === "SCHEDULED" && base.kickoffAt.getTime() - Date.now() < 15 * 60_000);
  const { data } = useQuery({
    queryKey: ["match", detail.id],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${detail.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Match indisponible");
      return (await res.json()) as LiveDetail;
    },
    enabled: watch,
    refetchInterval: watch ? 60_000 : false,
  });
  return {
    ...base,
    ...(data
      ? {
          status: data.status,
          minute: data.minute,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          htHome: data.htHome,
          htAway: data.htAway,
        }
      : {}),
    events: data?.events ?? detail.events,
    community: data?.community ?? detail.community,
    livePrediction: data?.prediction ?? null,
  };
}

function Header({ match }: { match: ReturnType<typeof useMatchLive> }) {
  const live = isLiveStatus(match.status);
  const scored = hasScore(match.status);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/championnats/${match.competition.code}`}
          className="label-caps text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <span className="size-2 rounded-full" style={{ background: match.competition.color }} aria-hidden />
          {match.competition.name} · {match.roundLabel}
        </Link>
        {live ? (
          <LiveBadge
            minute={match.status === "LIVE" ? match.minute : null}
            label={match.status === "HALFTIME" ? "Mi-temps" : "Live"}
          />
        ) : (
          <span className="label-caps text-muted-foreground">
            {awaitingResult(match.status, match.kickoffAt)
              ? "Résultat en attente"
              : STATUS_LABEL[match.status]}
          </span>
        )}
      </div>
      <m.div
        layoutId={matchLayoutId(match.id, "score")}
        transition={spring.layout}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
      >
        {(["home", "away"] as const).map((side, i) => {
          const team = side === "home" ? match.homeTeam : match.awayTeam;
          return (
            <div
              key={side}
              className={cn("grid justify-items-center gap-2 text-center", i === 1 && "order-3")}
            >
              <m.span layoutId={matchLayoutId(match.id, side)} transition={spring.layout}>
                <TeamCrest team={team} size={64} />
              </m.span>
              <span className="font-condensed text-lg leading-tight font-bold tracking-wide uppercase">
                {team.shortName}
              </span>
            </div>
          );
        })}
        <div className="order-2 grid justify-items-center gap-1">
          {scored ? (
            <div
              className="font-display flex items-center gap-2 text-6xl leading-none sm:text-7xl"
              aria-live="polite"
            >
              <ScoreDigit value={match.homeScore} />
              <span className="text-muted-foreground text-4xl">–</span>
              <ScoreDigit value={match.awayScore} />
            </div>
          ) : (
            <span className="font-display text-5xl leading-none">{formatTime(match.kickoffAt)}</span>
          )}
          {scored && match.htHome != null && (
            <span className="text-muted-foreground text-xs">
              Mi-temps {match.htHome}-{match.htAway}
            </span>
          )}
          {match.status === "SCHEDULED" && !awaitingResult(match.status, match.kickoffAt) && (
            <Countdown to={match.kickoffAt} className="label-caps text-grass-ink" />
          )}
        </div>
      </m.div>
      <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <span>{formatKickoff(match.kickoffAt)}</span>
        {match.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {match.venue}
          </span>
        )}
        {match.referee && (
          <span className="flex items-center gap-1">
            <Flag className="size-3.5" aria-hidden /> {match.referee}
          </span>
        )}
      </p>
    </div>
  );
}

const EVENT_ICON: Record<MatchEvent["type"], ReactNode> = {
  GOAL: <span aria-label="But">⚽</span>,
  PENALTY: <span aria-label="But sur penalty">⚽ (p)</span>,
  OWN_GOAL: <span aria-label="But contre son camp">⚽ (csc)</span>,
  YELLOW: <span className="bg-gold inline-block h-4 w-3 rounded-[2px]" aria-label="Carton jaune" />,
  RED: <span className="bg-destructive inline-block h-4 w-3 rounded-[2px]" aria-label="Carton rouge" />,
};

function Summary({ match }: { match: ReturnType<typeof useMatchLive> }) {
  if (!match.events || match.events.length === 0) {
    const text =
      match.status === "SCHEDULED"
        ? "Les buts et les cartons s'afficheront ici pendant le match."
        : isLiveStatus(match.status)
          ? "Aucun événement pour le moment."
          : "La chronologie de ce match n'est pas fournie par la source de données.";
    return <p className="text-muted-foreground py-6 text-center">{text}</p>;
  }
  const events = [...match.events].sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0));
  return (
    <StaggerList className="relative grid gap-2 py-2" step={0.04}>
      <span className="bg-border absolute top-0 bottom-0 left-1/2 w-px" aria-hidden />
      {events.map((e, i) => (
        <StaggerItem
          key={`${e.minute}-${e.player}-${i}`}
          index={i}
          className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-3")}
        >
          <div
            className={cn("flex items-center justify-end gap-2 text-right", e.side !== "home" && "invisible")}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{e.player}</span>
              {e.assist && (
                <span className="text-muted-foreground block truncate text-xs">passe : {e.assist}</span>
              )}
            </span>
            {EVENT_ICON[e.type]}
          </div>
          <span className="bg-surface-strong font-condensed relative z-10 grid h-7 min-w-11 place-items-center rounded-full px-2 text-sm font-bold">
            {e.minute}
            {e.extra ? `+${e.extra}` : ""}&apos;
          </span>
          <div className={cn("flex items-center gap-2", e.side !== "away" && "invisible")}>
            {EVENT_ICON[e.type]}
            <span className="min-w-0">
              <span className="block truncate font-semibold">{e.player}</span>
              {e.assist && (
                <span className="text-muted-foreground block truncate text-xs">passe : {e.assist}</span>
              )}
            </span>
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

function Lineups({ match }: { match: MatchDetailData }) {
  if (!match.lineups) {
    return (
      <p className="text-muted-foreground py-6 text-center">
        Compositions communiquées environ une heure avant le coup d&apos;envoi.
      </p>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {(["home", "away"] as const).map((side) => {
        const lineup = match.lineups![side];
        const team = side === "home" ? match.homeTeam : match.awayTeam;
        return (
          <section key={side} className="grid gap-3">
            <header className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TeamCrest team={team} size={24} />
                <span className="font-condensed font-bold uppercase">{team.shortName}</span>
              </span>
              {lineup.formation && <span className="label-caps text-grass-ink">{lineup.formation}</span>}
            </header>
            <StaggerList className="grid gap-1" step={0.03}>
              {lineup.startXI.map((p, i) => (
                <StaggerItem
                  key={p.name}
                  index={i}
                  className="glass-strong flex items-center gap-3 rounded-lg px-3 py-1.5"
                >
                  <span className="font-display text-muted-foreground w-6 text-right text-lg">
                    {p.number ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="label-caps text-muted-foreground">{p.position}</span>
                </StaggerItem>
              ))}
            </StaggerList>
            {lineup.substitutes.length > 0 && (
              <p className="text-muted-foreground text-sm">
                <span className="label-caps">Remplaçants</span> —{" "}
                {lineup.substitutes.map((p) => p.name).join(", ")}
              </p>
            )}
            {lineup.coach && <p className="text-muted-foreground text-sm">Entraîneur : {lineup.coach}</p>}
          </section>
        );
      })}
    </div>
  );
}

const FORM_STYLE = {
  W: "bg-primary text-primary-foreground",
  D: "bg-surface-strong text-foreground",
  L: "bg-destructive text-destructive-foreground",
};
const FORM_LETTER = { W: "V", D: "N", L: "D" };

function Form({ match }: { match: MatchDetailData }) {
  return (
    <div className="grid gap-6">
      {(["home", "away"] as const).map((side) => {
        const form = side === "home" ? match.homeForm : match.awayForm;
        const team = side === "home" ? match.homeTeam : match.awayTeam;
        return (
          <section key={side} className="grid gap-2">
            <h3 className="font-condensed flex items-center gap-2 font-bold uppercase">
              <TeamCrest team={team} size={22} /> {team.shortName} · 5 derniers matchs
            </h3>
            {form.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun match joué cette saison.</p>
            ) : (
              <StaggerList className="flex flex-wrap gap-2" step={0.05}>
                {form.map((f, i) => (
                  <StaggerItem key={f.matchId} index={i}>
                    <span
                      className="glass-strong flex items-center gap-2 rounded-xl py-1 pr-3 pl-1"
                      title={`${f.home ? "Dom." : "Ext."} contre ${f.opponent}, ${f.score}`}
                    >
                      <span
                        className={cn(
                          "font-condensed grid size-7 place-items-center rounded-lg text-sm font-bold",
                          FORM_STYLE[f.result],
                        )}
                      >
                        {FORM_LETTER[f.result]}
                      </span>
                      <span className="text-sm">
                        <span className="text-muted-foreground">{f.home ? "vs" : "à"}</span> {f.opponent}{" "}
                        <span className="font-semibold">{f.score}</span>
                      </span>
                    </span>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </section>
        );
      })}
      <section className="grid gap-2">
        <h3 className="font-condensed font-bold uppercase">Face-à-face</h3>
        {match.headToHead.meetings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {match.headToHead.source === "base"
              ? "Première confrontation de la saison entre ces deux équipes."
              : "Aucune confrontation récente."}
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {match.headToHead.meetings.map((h, i) => (
              <li
                key={`${h.date}-${i}`}
                className="glass-strong grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground w-24 text-xs">{formatDate(new Date(h.date))}</span>
                <span className="truncate text-right">{h.homeName}</span>
                <span className="font-display text-xl">
                  {h.homeScore}-{h.awayScore}
                </span>
                <span className="truncate">{h.awayName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Table({ match }: { match: MatchDetailData }) {
  if (match.standings.length === 0)
    return <p className="text-muted-foreground py-6 text-center">Classement indisponible pour le moment.</p>;
  const ids = new Set([match.homeTeam.id, match.awayTeam.id]);
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="label-caps text-muted-foreground">
            <tr className="text-left">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 font-semibold">Club</th>
              <th className="py-2 text-right font-semibold">J</th>
              <th className="py-2 text-right font-semibold">Diff.</th>
              <th className="py-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {match.standings.map((s, i) => (
              <m.tr
                key={s.team.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i, 12) * 0.025 }}
                className={cn("border-border border-t", ids.has(s.team.id) && "bg-volt/15 font-semibold")}
              >
                <td className="tabular py-1.5 pr-2">{s.position}</td>
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <TeamCrest team={s.team} size={20} /> {s.team.shortName}
                  </span>
                </td>
                <td className="tabular py-1.5 text-right">{s.played}</td>
                <td className="tabular py-1.5 text-right">
                  {s.goalsFor - s.goalsAgainst > 0
                    ? `+${s.goalsFor - s.goalsAgainst}`
                    : s.goalsFor - s.goalsAgainst}
                </td>
                <td className="tabular font-display py-1.5 text-right text-lg">{s.points}</td>
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={`/championnats/${match.competition.code}`}
        className="text-grass-ink inline-flex items-center gap-1 justify-self-start text-sm font-semibold hover:underline"
      >
        Classement complet <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/** Détail d'un match (page ou modale) : en-tête, pronostic, onglets. */
export function MatchDetailView({
  detail,
  prediction,
}: {
  detail: MatchDetailData;
  prediction?: (live: ReturnType<typeof useMatchLive>) => ReactNode;
}) {
  const match = useMatchLive(detail);
  const [tab, setTab] = useState<Tab>(
    isLiveStatus(detail.status) || detail.status === "FINISHED" ? "summary" : "form",
  );
  const { variants } = useMotionPreset("fadeUp");
  return (
    <div className="grid gap-6">
      <Header match={match} />
      {prediction?.(match)}
      <div className="grid gap-4">
        <Segmented
          ariaLabel="Informations du match"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "summary", label: "Résumé" },
            { value: "lineups", label: "Compos" },
            { value: "form", label: "Forme" },
            { value: "table", label: "Classement" },
          ]}
        />
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={tab}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="tabpanel"
          >
            {tab === "summary" && <Summary match={match} />}
            {tab === "lineups" && <Lineups match={detail} />}
            {tab === "form" && <Form match={detail} />}
            {tab === "table" && <Table match={detail} />}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
