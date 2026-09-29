"use client";

import { m, useSpring, useTransform } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { press, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const ROLLER_MAX = 9;
const DIGITS = Array.from({ length: ROLLER_MAX + 1 }, (_, i) => i);
/** Déplacement vertical (px) pour changer d'une unité en glissant. */
const DRAG_STEP = 26;

type ScoreRollerProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Sélecteur de score façon compteur mécanique : une bande de chiffres
 * translatée en Y par un ressort. Boutons +/−, glisser vertical, molette et clavier.
 */
export function ScoreRoller({ value, onChange, label, disabled, className }: ScoreRollerProps) {
  const reduced = useReducedMotion();
  const position = useSpring(value, reduced ? { duration: 0 } : spring.roller);
  const y = useTransform(position, (v) => `${-v}em`);
  const drag = useRef<{ startY: number; startValue: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) position.jump(value);
    else position.set(value);
  }, [value, reduced, position]);

  const set = (next: number) => {
    if (disabled) return;
    const clamped = Math.max(0, Math.min(ROLLER_MAX, next));
    if (clamped !== value) onChange(clamped);
  };

  // Molette : écouteur natif non passif pour bloquer le scroll de la page.
  useEffect(() => {
    const node = windowRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      set(value + (e.deltaY < 0 ? 1 : -1));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  });

  function onKeyDown(e: KeyboardEvent) {
    const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    if (e.key in map) {
      e.preventDefault();
      set(value + map[e.key]!);
    } else if (e.key === "Home") set(0);
    else if (/^\d$/.test(e.key)) set(Number(e.key));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    drag.current = { startY: e.clientY, startValue: value };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    set(drag.current.startValue + Math.round((drag.current.startY - e.clientY) / DRAG_STEP));
  }
  function onPointerUp() {
    drag.current = null;
  }

  const stepButton = (delta: 1 | -1) => (
    <m.button
      type="button"
      {...(reduced ? {} : { whileTap: press.whileTap, transition: press.transition })}
      onClick={() => set(value + delta)}
      disabled={disabled || (delta > 0 ? value >= ROLLER_MAX : value <= 0)}
      aria-label={`${label} : ${delta > 0 ? "un but de plus" : "un but de moins"}`}
      className="glass-strong grid h-9 w-12 place-items-center rounded-xl disabled:opacity-40"
    >
      {delta > 0 ? <Plus className="size-4" /> : <Minus className="size-4" />}
    </m.button>
  );

  return (
    <div className={cn("grid justify-items-center gap-2", className)}>
      {stepButton(1)}
      <div
        ref={windowRef}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={ROLLER_MAX}
        aria-valuenow={value}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "font-display relative h-[1em] w-[0.8em] touch-none overflow-hidden rounded-xl text-center text-7xl leading-none select-none sm:text-8xl",
          "[mask-image:linear-gradient(transparent,#000_18%,#000_82%,transparent)]",
          disabled ? "opacity-60" : "cursor-ns-resize",
        )}
      >
        <m.div style={{ y }} className="tabular grid">
          {DIGITS.map((d) => (
            <span key={d} className="block h-[1em]" aria-hidden={d !== value}>
              {d}
            </span>
          ))}
        </m.div>
      </div>
      {stepButton(-1)}
    </div>
  );
}
