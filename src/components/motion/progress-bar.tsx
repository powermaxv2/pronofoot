"use client";

import { m, useInView } from "motion/react";
import { useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fade, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

type ProgressBarProps = {
  label: string;
  /** Ratio entre 0 et 1. */
  value: number;
  highlight?: boolean;
  delay?: number;
  className?: string;
};

/** Barre de pourcentage qui se remplit (scaleX) à l'entrée dans le viewport. */
export function ProgressBar({ label, value, highlight, delay = 0, className }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div ref={ref} className={cn("grid grid-cols-[2rem_1fr_3.5rem] items-center gap-3", className)}>
      <span className="font-condensed text-base font-bold">{label}</span>
      <div
        className="bg-border h-3 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} : ${pct} %`}
      >
        <m.div
          className={cn("h-full origin-left rounded-full", highlight ? "bg-volt" : "bg-primary")}
          initial={{ scaleX: reduced ? value : 0, opacity: reduced ? 0 : 1 }}
          animate={{ scaleX: inView || reduced ? value : 0, opacity: inView || !reduced ? 1 : 0 }}
          transition={reduced ? fade : { ...spring.counter, delay }}
        />
      </div>
      <span className="font-condensed tabular text-right text-base font-bold">
        {inView ? <AnimatedNumber value={pct} format={(v) => `${Math.round(v)} %`} /> : "0 %"}
      </span>
    </div>
  );
}
