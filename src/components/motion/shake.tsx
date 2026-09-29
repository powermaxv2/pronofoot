"use client";

import { m, useAnimationControls } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pickVariants } from "@/lib/motion";

/** Secoue ses enfants chaque fois que `trigger` change (et vaut une valeur non nulle). */
export function Shake({
  trigger,
  children,
  className,
}: {
  trigger: unknown;
  children: ReactNode;
  className?: string;
}) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!trigger) return;
    void controls.start(pickVariants("shake", reduced).animate as never);
  }, [trigger, controls, reduced]);
  return (
    <m.div animate={controls} className={className}>
      {children}
    </m.div>
  );
}
