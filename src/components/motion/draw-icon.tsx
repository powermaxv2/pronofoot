"use client";

import { m } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const paths = {
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  cross: ["M7 7l10 10", "M17 7L7 17"],
  info: ["M12 11v6", "M12 7.5v.01"],
  trophy: [
    "M8 4h8v5a4 4 0 0 1-8 0V4z",
    "M8 6H5a3 3 0 0 0 3 4",
    "M16 6h3a3 3 0 0 1-3 4",
    "M12 13v4",
    "M9 20h6",
  ],
  ball: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z"],
} as const;

export type DrawIconName = keyof typeof paths;

/** Icône SVG dont le tracé se dessine (pathLength 0 → 1). */
export function DrawIcon({ name, className }: { name: DrawIconName; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      {paths[name].map((d, i) => (
        <m.path
          key={d}
          d={d}
          initial={reduced ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{ duration: duration.slow, ease: ease.out, delay: 0.08 + i * 0.08 }}
        />
      ))}
    </svg>
  );
}
