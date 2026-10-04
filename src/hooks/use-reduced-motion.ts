"use client";

import { useReducedMotion as useMotionReduced } from "motion/react";

/** `true` si l'utilisateur préfère un mouvement réduit (jamais `null`). */
export function useReducedMotion(): boolean {
  return useMotionReduced() ?? false;
}
