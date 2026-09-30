"use client";

import { motionProps, pickVariants, type VariantName } from "@/lib/motion";
import { useReducedMotion } from "./use-reduced-motion";

/** Variantes du preset, réduites automatiquement selon `prefers-reduced-motion`. */
export function useMotionPreset(name: VariantName) {
  const reduced = useReducedMotion();
  return { reduced, variants: pickVariants(name, reduced), props: motionProps(name, reduced) };
}
