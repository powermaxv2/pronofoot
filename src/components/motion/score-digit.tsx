"use client";

import { m, useAnimationControls } from "motion/react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pickVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Chiffre de score qui « rebondit » quand il augmente (but marqué).
 * Le rebond ne se déclenche pas au premier rendu.
 */
export function ScoreDigit({ value, className }: { value: number | null; className?: string }) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current !== null && value !== null && value > previous.current) {
      void controls.start(pickVariants("goalBounce", reduced).animate as never);
    }
    previous.current = value;
  }, [value, controls, reduced]);

  return (
    <m.span animate={controls} className={cn("tabular inline-block min-w-[0.6em] text-center", className)}>
      {value ?? "–"}
    </m.span>
  );
}
