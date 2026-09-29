"use client";

import { animate, useInView, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number;
  /** Formatage de la valeur intermédiaire. */
  format?: (value: number) => string;
  className?: string;
  /** Démarre depuis 0 à la première apparition dans le viewport. */
  fromZero?: boolean;
};

const defaultFormat = (v: number) => new Intl.NumberFormat("fr-FR").format(Math.round(v));

/**
 * Nombre qui « défile » jusqu'à sa valeur avec un ressort.
 * La valeur est écrite directement dans le DOM : aucun re-render React par frame.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  className,
  fromZero = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const motionValue = useMotionValue(fromZero ? 0 : value);
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return motionValue.on("change", (v) => {
      node.textContent = formatRef.current(v);
    });
  }, [motionValue]);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, spring.counter);
    return () => controls.stop();
  }, [inView, value, reduced, motionValue]);

  return (
    <span ref={ref} className={cn("tabular", className)} aria-label={format(value)}>
      {format(fromZero ? 0 : value)}
    </span>
  );
}
