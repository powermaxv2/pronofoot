"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/stagger";
import { TiltCard } from "@/components/motion/tilt-card";
import { Avatar } from "@/components/ui/avatar";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FULL_MOTION, REDUCED_MOTION, gsap, useGSAP } from "@/lib/gsap";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Zap,
    title: "Pronostique",
    text: "Choisis 1, N ou 2 et, si tu le sens, le score exact. Modifiable jusqu'au coup d'envoi.",
  },
  {
    icon: Users,
    title: "Invite tes potes",
    text: "Crée une ligue privée et partage son code d'invitation en un clic.",
  },
  {
    icon: Trophy,
    title: "Grimpe",
    text: "Les points tombent automatiquement après chaque match. Classements du jour, du mois et de la saison.",
  },
];

export function Steps() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16" aria-labelledby="steps-title">
      <Reveal>
        <h2 id="steps-title" className="font-display text-5xl tracking-wide sm:text-6xl">
          Comment ça marche
        </h2>
      </Reveal>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={i * 0.08}>
              <TiltCard className="glass h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="text-volt-ink size-7" aria-hidden />
                  <span className="font-display text-muted-foreground text-5xl leading-none">{i + 1}</span>
                </div>
                <h3 className="font-condensed mt-6 text-2xl font-bold tracking-wide uppercase">{s.title}</h3>
                <p className="text-muted-foreground mt-2">{s.text}</p>
              </TiltCard>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Scoring() {
  const items = [
    {
      value: 3,
      prefix: "",
      suffix: " pts",
      label: "Bon résultat",
      text: "Tu as trouvé le vainqueur ou le nul (1N2).",
      tone: "bg-primary text-primary-foreground",
    },
    {
      value: 5,
      prefix: "+",
      suffix: " pts",
      label: "Score exact",
      text: "Bonus si le score final est exactement le bon : 8 points au total.",
      tone: "bg-volt text-volt-foreground",
    },
    {
      value: 2,
      prefix: "×",
      suffix: "",
      label: "Joker",
      text: "Double tous les points d'un match. Un joker par journée de championnat.",
      tone: "glass-strong",
    },
  ];
  return (
    <section
      id="bareme"
      className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 py-16"
      aria-labelledby="bareme-title"
    >
      <Reveal>
        <h2 id="bareme-title" className="font-display text-5xl tracking-wide sm:text-6xl">
          Le barème
        </h2>
        <p className="text-muted-foreground mt-2 max-w-[60ch]">
          Simple et lisible. Résultat au temps réglementaire, prolongations et tirs au but non comptés. Match
          reporté ou annulé : prono annulé et joker rendu.
        </p>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 0.1}>
            <div className={cn("grid h-full gap-3 rounded-2xl p-6", it.tone)}>
              <p className="font-display text-7xl leading-none">
                {it.prefix}
                <AnimatedNumber value={it.value} />
                <span className="text-3xl">{it.suffix}</span>
              </p>
              <p className="font-condensed text-xl font-bold tracking-wide uppercase">{it.label}</p>
              <p className="opacity-80">{it.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">Maximum sur un match : (3 + 5) × 2 = 16 points.</p>
    </section>
  );
}

const COMMUNITY = [
  { label: "1", value: 0.54 },
  { label: "N", value: 0.27 },
  { label: "2", value: 0.19 },
];

/** Barres communauté remplies au scroll par GSAP ScrollTrigger. */
export function Community() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        gsap.utils.toArray<HTMLElement>("[data-bar]").forEach((bar, i) => {
          const target = Number(bar.dataset.bar);
          const pct = bar.parentElement?.parentElement?.querySelector<HTMLElement>("[data-pct]");
          const counter = { v: 0 };
          if (pct) pct.textContent = "0 %";
          const tl = gsap.timeline({
            scrollTrigger: { trigger: bar, start: "top 85%", toggleActions: "play none none none" },
          });
          tl.fromTo(
            bar,
            { scaleX: 0 },
            { scaleX: target, duration: 1.1, ease: "expo.out", delay: i * 0.12 },
            0,
          ).to(
            counter,
            {
              v: Math.round(target * 100),
              duration: 1.1,
              ease: "expo.out",
              delay: i * 0.12,
              onUpdate: () => {
                if (pct) pct.textContent = `${Math.round(counter.v)} %`;
              },
            },
            0,
          );
        });
      });
      mm.add(REDUCED_MOTION, () => {
        gsap.utils.toArray<HTMLElement>("[data-bar]").forEach((bar) => {
          gsap.fromTo(
            bar,
            { opacity: 0 },
            { opacity: 1, duration: 0.2, scrollTrigger: { trigger: bar, start: "top 90%" } },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2"
      aria-labelledby="communaute-title"
    >
      <Reveal>
        <h2 id="communaute-title" className="font-display text-5xl tracking-wide sm:text-6xl">
          Joue avec ou contre la foule
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[52ch]">
          Au coup d&apos;envoi, les pronostics se verrouillent et la répartition de la communauté se dévoile.
          Un bon résultat choisi par moins de 20 % des joueurs rapporte le badge Contre-pied.
        </p>
      </Reveal>
      <div className="glass grid gap-4 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="font-condensed text-lg font-bold tracking-wide uppercase">Lens – Lille</p>
          <span className="label-caps text-muted-foreground">Exemple · 312 pronos</span>
        </div>
        {COMMUNITY.map((c, i) => (
          <div key={c.label} className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-3">
            <span className="font-condensed text-base font-bold">{c.label}</span>
            <div className="bg-border h-3 overflow-hidden rounded-full">
              <div
                data-bar={c.value}
                className={cn("h-full origin-left rounded-full", i === 0 ? "bg-volt" : "bg-primary")}
                style={{ transform: `scaleX(${c.value})` }}
              />
            </div>
            <span data-pct className="font-condensed tabular text-right font-bold">
              {Math.round(c.value * 100)} %
            </span>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          {["2–1 · 18 %", "1–1 · 14 %", "2–0 · 11 %"].map((s) => (
            <span
              key={s}
              className="glass-strong font-condensed rounded-full px-3 py-1.5 text-sm font-semibold"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

type Row = { id: string; name: string; pts: number };
const INITIAL: Row[] = [
  { id: "lea", name: "Léa_OL", pts: 131 },
  { id: "max", name: "Maxou", pts: 124 },
  { id: "karim", name: "Karim10", pts: 118 },
  { id: "julie", name: "JulieFCN", pts: 112 },
  { id: "tom", name: "Tom_Kop", pts: 109 },
];
const GAINS = [0, 3, 3, 8, 0, 6, 16];

/** Aperçu de classement qui se réordonne tout seul (données d'exemple). */
export function LeaderboardPreview() {
  const [rows, setRows] = useState(INITIAL);
  const [tick, setTick] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry?.isIntersecting) {
        timer = window.setInterval(() => {
          setTick((t) => t + 1);
          setRows((prev) =>
            prev
              .map((r) => ({ ...r, pts: r.pts + GAINS[Math.floor(Math.random() * GAINS.length)]! }))
              .sort((a, b) => b.pts - a.pts),
          );
        }, 2600);
      }
    });
    io.observe(node);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [reduced]);

  return (
    <section
      className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2"
      aria-labelledby="ligues-title"
    >
      <div ref={ref} className="glass order-2 grid gap-2 rounded-2xl p-4 md:order-1">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="font-condensed text-lg font-bold tracking-wide uppercase">Les Ultras du Bureau</p>
          <span className="label-caps text-muted-foreground">Exemple · J{7 + tick}</span>
        </div>
        <ol className="grid gap-1.5">
          {rows.map((r, i) => (
            <m.li
              key={r.id}
              layout={!reduced}
              transition={spring.layout}
              className={cn(
                "glass-strong grid grid-cols-[1.75rem_2.25rem_1fr_auto] items-center gap-3 rounded-xl px-3 py-2",
                r.id === "max" && "border-volt/60",
              )}
            >
              <span className="font-display text-muted-foreground text-center text-2xl">{i + 1}</span>
              <Avatar name={r.name} size={36} />
              <span className="font-condensed truncate text-base font-semibold">{r.name}</span>
              <span className="font-display text-3xl leading-none">
                <AnimatedNumber value={r.pts} fromZero={false} />
              </span>
            </m.li>
          ))}
        </ol>
      </div>
      <Reveal className="order-1 md:order-2">
        <h2 id="ligues-title" className="font-display text-5xl tracking-wide sm:text-6xl">
          Des ligues privées entre potes
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[52ch]">
          Bureau, famille, coloc : chaque ligue a son classement général, par journée et par mois. Les lignes
          bougent en direct quand les points tombent.
        </p>
      </Reveal>
    </section>
  );
}
