"use client";

import { m, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { spring, tiltFromPointer } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Reflet lumineux qui suit le pointeur. */
  glare?: boolean;
  layoutId?: string;
};

/**
 * Carte avec inclinaison 3D au survol (souris uniquement).
 * Désactivée au tactile et en mouvement réduit.
 */
export function TiltCard({ children, className, glare = true, layoutId }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useSpring(0, spring.gentle);
  const ry = useSpring(0, spring.gentle);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.14), transparent 45%)`;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const t = tiltFromPointer(px, py);
    rx.set(t.rotateX);
    ry.set(t.rotateY);
    gx.set(px * 100);
    gy.set(py * 100);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div className="[perspective:900px]">
      <m.div
        ref={ref}
        layoutId={layoutId}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        transition={spring.layout}
        className={cn("group relative overflow-hidden", className)}
      >
        {glare && !reduced && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: glareBg }}
          />
        )}
        {children}
      </m.div>
    </div>
  );
}
