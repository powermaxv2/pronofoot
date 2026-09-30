"use client";

import { m } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { spring } from "@/lib/motion";

/** Enveloppe animée : la lettre sort, l'enveloppe flotte doucement. */
export function Envelope() {
  const reduced = useReducedMotion();
  return (
    <m.svg
      viewBox="0 0 160 120"
      className="mx-auto w-40"
      aria-hidden
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, rotate: -8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0], rotate: 0 }}
      transition={
        reduced
          ? { duration: 0.2 }
          : { y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }, default: spring.bouncy }
      }
    >
      <rect x="10" y="40" width="140" height="74" rx="10" className="fill-primary" />
      <m.g
        initial={reduced ? false : { y: 36 }}
        animate={{ y: 0 }}
        transition={{ ...spring.gentle, delay: 0.35 }}
      >
        <rect x="26" y="8" width="108" height="72" rx="6" className="fill-foreground" />
        <rect x="38" y="22" width="60" height="6" rx="3" className="fill-background" opacity="0.6" />
        <rect x="38" y="36" width="84" height="6" rx="3" className="fill-background" opacity="0.35" />
        <rect x="38" y="50" width="70" height="6" rx="3" className="fill-background" opacity="0.35" />
        <circle cx="116" cy="62" r="9" className="fill-volt" />
      </m.g>
      <path d="M10 50 L80 92 L150 50 L150 114 L10 114 Z" className="fill-primary" />
      <path
        d="M10 114 L68 78 M150 114 L92 78"
        className="stroke-primary-foreground"
        strokeWidth="2"
        opacity="0.25"
      />
    </m.svg>
  );
}
