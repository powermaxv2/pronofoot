"use client";

import type { Outcome } from "@prisma/client";
import { AnimatePresence, m } from "motion/react";
import { Lock, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { fireConfetti } from "@/components/motion/confetti";
import { ScoreRoller } from "@/components/motion/score-roller";
import { Shake } from "@/components/motion/shake";
import { Countdown } from "@/components/features/match/countdown";
import { OUTCOME_SHORT } from "@/components/features/match/labels";
import { PREDICTION_LABEL } from "@/components/features/match/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatKickoff } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { markPredictionSeen, removePrediction, savePrediction } from "@/server/actions/predictions";
import type { MatchDetail } from "@/server/queries/matches";

const outcomeOf = (h: number, a: number): Outcome => (h > a ? "HOME" : h < a ? "AWAY" : "DRAW");

type Live = {
  status: MatchDetail["status"];
  kickoffAt: Date;
  livePrediction: { state: string; points: number; seenAt: string | null } | null;
};

/** Bouton joker : la carte se retourne quand il est activé. */
function JokerToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className="h-12 w-36 shrink-0 [perspective:600px] disabled:opacity-50"
      aria-label={active ? "Retirer le joker" : "Poser le joker (points ×2)"}
    >
      <m.span
        className="relative block size-full [transform-style:preserve-3d]"
        animate={reduced ? { opacity: [0.5, 1] } : { rotateY: active ? 180 : 0 }}
        transition={reduced ? { duration: 0.2 } : spring.bouncy}
      >
        <span className="border-border text-muted-foreground font-condensed absolute inset-0 grid place-items-center rounded-xl border border-dashed text-sm font-bold tracking-wider uppercase [backface-visibility:hidden]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-4" aria-hidden /> Joker ×2
          </span>
        </span>
        <span
          className={cn(
            "bg-volt text-volt-foreground font-condensed absolute inset-0 grid place-items-center rounded-xl text-sm font-bold tracking-wider uppercase [backface-visibility:hidden]",
            reduced ? (active ? "opacity-100" : "opacity-0") : "[transform:rotateY(180deg)]",
          )}
        >
          ×2 activé
        </span>
      </m.span>
    </button>
  );
}

/** Formulaire de pronostic (match ouvert) ou résumé (match verrouillé). */
export function PredictionPanel({ detail, live }: { detail: MatchDetail; live: Live }) {
  const router = useRouter();
  const existing = detail.prediction;
  const open = live.status === "SCHEDULED" && live.kickoffAt.getTime() > Date.now();
  const [outcome, setOutcome] = useState<Outcome | null>(existing?.outcome ?? null);
  const [withScore, setWithScore] = useState(existing ? existing.homeScore != null : true);
  const [home, setHome] = useState(existing?.homeScore ?? 1);
  const [away, setAway] = useState(existing?.awayScore ?? 0);
  const [joker, setJoker] = useState(existing?.isJoker ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<number>(0);

  // Avec un score précisé, le 1N2 en découle toujours.
  const effectiveOutcome = withScore ? outcomeOf(home, away) : outcome;
  const dirty =
    !existing ||
    existing.outcome !== effectiveOutcome ||
    existing.isJoker !== joker ||
    (withScore ? existing.homeScore !== home || existing.awayScore !== away : existing.homeScore != null);

  function pickOutcome(o: Outcome) {
    setOutcome(o);
    if (!withScore) return;
    // Choisir une issue ajuste le score pour rester cohérent.
    if (o === "HOME" && !(home > away)) setHome(away + 1 > 9 ? 9 : away + 1);
    if (o === "AWAY" && !(away > home)) setAway(home + 1 > 9 ? 9 : home + 1);
    if (o === "DRAW" && home !== away) setAway(home);
  }

  function submit() {
    if (!effectiveOutcome) {
      setError((e) => e + 1);
      toast.error("Choisissez 1, N ou 2.");
      return;
    }
    startTransition(async () => {
      const result = await savePrediction({
        matchId: detail.id,
        outcome: effectiveOutcome,
        homeScore: withScore ? home : null,
        awayScore: withScore ? away : null,
        isJoker: joker,
      });
      if (result.ok) {
        toast.success(result.message ?? "Enregistré", {
          description: result.data.movedJokerFrom ? "Votre joker a été déplacé sur ce match." : undefined,
        });
        router.refresh();
      } else {
        setError((e) => e + 1);
        toast.error(result.error);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removePrediction(detail.id);
      if (result.ok) {
        toast.info(result.message ?? "Supprimé");
        setOutcome(null);
        setJoker(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  if (!open) return <LockedSummary detail={detail} live={live} />;

  return (
    <Shake trigger={error}>
      <section aria-label="Mon pronostic" className="glass-strong grid gap-5 rounded-2xl p-4 sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-3xl leading-none tracking-wide">Mon prono</h2>
          <span className="label-caps text-grass-ink flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden /> Verrouillage <Countdown to={live.kickoffAt} />
          </span>
        </header>

        <div
          role="radiogroup"
          aria-label="Résultat"
          className="bg-surface relative grid grid-cols-3 gap-1 rounded-2xl p-1"
        >
          {(["HOME", "DRAW", "AWAY"] as const).map((o) => {
            const active = effectiveOutcome === o;
            const label =
              o === "HOME"
                ? detail.homeTeam.shortName
                : o === "AWAY"
                  ? detail.awayTeam.shortName
                  : "Match nul";
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickOutcome(o)}
                className={cn(
                  "relative grid justify-items-center rounded-xl px-2 py-2.5",
                  active ? "text-volt-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <m.span
                    layoutId={`outcome-${detail.id}`}
                    transition={spring.snappy}
                    className="bg-volt absolute inset-0 rounded-xl"
                    aria-hidden
                  />
                )}
                <span className="font-display relative text-3xl leading-none">{OUTCOME_SHORT[o]}</span>
                <span className="font-condensed relative truncate text-xs font-semibold tracking-wide uppercase">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="font-condensed block font-bold tracking-wide uppercase">
              Préciser le score exact
            </span>
            <span className="text-muted-foreground text-sm">+5 points bonus s&apos;il est juste.</span>
          </span>
          <Switch checked={withScore} onCheckedChange={setWithScore} aria-label="Préciser le score exact" />
        </label>

        <AnimatePresence initial={false}>
          {withScore && (
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={spring.gentle}
              className="grid grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-2"
            >
              <ScoreRoller value={home} onChange={setHome} label={`Buts ${detail.homeTeam.shortName}`} />
              <span className="font-display text-muted-foreground text-5xl">–</span>
              <ScoreRoller value={away} onChange={setAway} label={`Buts ${detail.awayTeam.shortName}`} />
            </m.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <JokerToggle active={joker} onChange={setJoker} />
            <p className="text-muted-foreground max-w-[26ch] text-xs">
              {detail.otherJoker
                ? `Joker actuellement sur ${detail.otherJoker.homeTeam.shortName} – ${detail.otherJoker.awayTeam.shortName} : il sera déplacé ici.`
                : "Un joker par journée : il double les points de ce match."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {existing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={remove}
                disabled={pending}
                aria-label="Supprimer mon pronostic"
              >
                <Trash2 />
              </Button>
            )}
            <Button variant="volt" size="lg" onClick={submit} loading={pending} disabled={!dirty}>
              {existing ? (dirty ? "Modifier" : "Enregistré") : "Valider mon prono"}
            </Button>
          </div>
        </div>
      </section>
    </Shake>
  );
}

/** Résumé après verrouillage : résultat, points, célébration une seule fois. */
function LockedSummary({ detail, live }: { detail: MatchDetail; live: Live }) {
  const p = detail.prediction;
  const state = live.livePrediction?.state ?? p?.state ?? null;
  const points = live.livePrediction?.points ?? p?.points ?? 0;
  const ref = useRef<HTMLElement>(null);
  const celebrated = useRef(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!p || celebrated.current || !state || state === "PENDING") return;
    const seen = (live.livePrediction ? live.livePrediction.seenAt : p.seenAt) != null;
    if (seen) return;
    celebrated.current = true;
    if (state === "EXACT") void fireConfetti(ref.current);
    if (state === "LOST") setShake((s) => s + 1);
    void markPredictionSeen(detail.id);
  }, [state, p, live.livePrediction, detail.id]);

  if (!p) {
    return (
      <section className="glass-strong text-muted-foreground flex items-center gap-3 rounded-2xl p-4">
        <Lock className="size-5 shrink-0" aria-hidden />
        {live.status === "POSTPONED" || live.status === "CANCELLED"
          ? "Match reporté ou annulé : les pronostics sont fermés."
          : `Pronostics fermés depuis le coup d'envoi (${formatKickoff(live.kickoffAt)}).`}
      </section>
    );
  }
  const pick = p.homeScore != null ? `${p.homeScore}-${p.awayScore}` : OUTCOME_SHORT[p.outcome];
  const tone =
    state === "EXACT"
      ? "bg-volt text-volt-foreground"
      : state === "WON"
        ? "bg-primary text-primary-foreground"
        : "glass-strong";
  return (
    <Shake trigger={shake}>
      <section
        ref={ref}
        aria-label="Mon pronostic"
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 transition-colors",
          tone,
          state === "LOST" && "saturate-50",
        )}
      >
        <div className="grid gap-1">
          <span className="label-caps opacity-80">Mon prono</span>
          <span className="font-display flex items-center gap-2 text-4xl leading-none">
            {pick}
            {p.isJoker && (
              <Badge variant={state === "EXACT" ? "default" : "volt"}>
                <Sparkles className="size-3" aria-hidden /> ×2
              </Badge>
            )}
          </span>
          <span className="text-sm opacity-80">
            {state && state !== "PENDING"
              ? PREDICTION_LABEL[state as keyof typeof PREDICTION_LABEL]
              : "Verrouillé · en attente du résultat"}
          </span>
        </div>
        {state && state !== "PENDING" && state !== "VOID" && (
          <m.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.bouncy}
            className="font-display text-6xl leading-none"
          >
            +<AnimatedNumber value={points} />
            <span className="ml-1 text-2xl">pts</span>
          </m.span>
        )}
      </section>
    </Shake>
  );
}
