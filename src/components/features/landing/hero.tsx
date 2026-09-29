"use client";

import { m } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { LiveBadge } from "@/components/motion/live-badge";
import { LottiePlayer } from "@/components/motion/lottie-player";
import { ButtonLink } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FULL_MOTION, gsap, useGSAP } from "@/lib/gsap";
import { duration, ease, spring } from "@/lib/motion";

const TITLE = ["Pronostique.", "Défie tes potes.", "Grimpe au classement."];

/** Tribunes stylisées (arrière-plan le plus lointain). */
function Stands() {
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      {Array.from({ length: 6 }, (_, row) => (
        <g key={row} opacity={0.05 + row * 0.018}>
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} cx={i * 20 + (row % 2) * 10 + 5} cy={30 + row * 36} r={6} fill="currentColor" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Lignes de terrain en perspective. */
function PitchLines() {
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.14">
        <path d="M150 400 L400 40 L800 40 L1050 400" />
        <path d="M600 40 L600 400" />
        <ellipse cx="600" cy="230" rx="170" ry="60" />
        <path d="M470 40 L445 110 L755 110 L730 40" />
      </g>
    </svg>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL_MOTION, () => {
        const scrub = { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 };
        gsap.to("[data-parallax='stands']", { yPercent: 35, ease: "none", scrollTrigger: scrub });
        gsap.to("[data-parallax='pitch']", { yPercent: 22, ease: "none", scrollTrigger: scrub });
        gsap.to("[data-parallax='title']", { y: -120, opacity: 0.2, ease: "none", scrollTrigger: scrub });
        gsap.to("[data-parallax='ball']", {
          y: 220,
          rotate: 200,
          scale: 0.7,
          ease: "none",
          scrollTrigger: scrub,
        });
        gsap.utils.toArray<HTMLElement>("[data-parallax='chip']").forEach((chip, i) => {
          gsap.to(chip, { y: -80 - i * 60, ease: "none", scrollTrigger: scrub });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative isolate overflow-hidden pt-8 pb-20 sm:pt-16 sm:pb-28">
      <div data-parallax="stands" className="text-foreground absolute inset-x-0 -top-10 -z-10 h-72">
        <Stands />
      </div>
      <div data-parallax="pitch" className="text-primary absolute inset-x-0 top-40 -z-10 h-[420px]">
        <PitchLines />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[1.2fr_1fr]">
        <div data-parallax="title" className="grid gap-6">
          <m.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, ease: ease.out }}
            className="label-caps text-grass-ink"
          >
            Ligue 1 · Premier League · Liga · Serie A · Bundesliga · C1
          </m.span>
          <h1 className="font-display text-[clamp(3.2rem,10vw,6.5rem)] leading-[0.88] tracking-wide">
            {TITLE.map((line, li) => (
              <span key={line} className="block overflow-hidden pb-1">
                <m.span
                  className={li === 2 ? "text-volt-ink block" : "block"}
                  initial={reduced ? { opacity: 0 } : { y: "105%" }}
                  animate={reduced ? { opacity: 1 } : { y: "0%" }}
                  transition={{ duration: duration.slower, ease: ease.out, delay: 0.1 + li * 0.12 }}
                >
                  {line}
                </m.span>
              </span>
            ))}
          </h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: duration.slow }}
            className="text-muted-foreground max-w-[52ch] text-lg"
          >
            Des pronostics foot entre amis, sans argent réel : des points virtuels, des ligues privées, des
            classements qui bougent en direct et des badges à collectionner.
          </m.p>
          <m.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.6 }}
            className="flex flex-wrap gap-3"
          >
            <ButtonLink href="/connexion" size="lg" variant="volt">
              Créer mon compte <ArrowRight />
            </ButtonLink>
            <ButtonLink href="#bareme" size="lg" variant="glass">
              Voir le barème
            </ButtonLink>
          </m.div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div data-parallax="ball">
            <LottiePlayer src="/lottie/ball-bounce.json" className="w-full" />
          </div>
          <div
            data-parallax="chip"
            className="glass-strong absolute top-8 -left-2 rounded-2xl px-4 py-3 shadow-xl sm:-left-10"
          >
            <LiveBadge minute={63} />
            <p className="font-display mt-1 text-3xl leading-none">PSG 2 – 1 OM</p>
          </div>
          <div
            data-parallax="chip"
            className="bg-volt text-volt-foreground absolute right-0 bottom-24 rounded-2xl px-4 py-3 shadow-xl sm:-right-6"
          >
            <p className="font-display text-4xl leading-none">+16</p>
            <p className="font-condensed text-xs font-bold tracking-widest uppercase">Score exact · joker</p>
          </div>
        </div>
      </div>
    </section>
  );
}
