"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LottieRefCurrentProps } from "lottie-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const cache = new Map<string, Promise<object>>();
function loadAnimation(src: string) {
  if (!cache.has(src))
    cache.set(
      src,
      fetch(src).then((r) => r.json() as Promise<object>),
    );
  return cache.get(src)!;
}

type LottiePlayerProps = {
  src: `/lottie/${string}.json`;
  className?: string;
  loop?: boolean;
  /** Texte alternatif ; laisser vide pour une illustration décorative. */
  label?: string;
};

/**
 * Lecteur Lottie chargé à la demande. En mouvement réduit, l'animation est
 * figée sur sa première image.
 */
export function LottiePlayer({ src, className, loop = true, label }: LottiePlayerProps) {
  const [data, setData] = useState<object | null>(null);
  const ref = useRef<LottieRefCurrentProps>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let alive = true;
    loadAnimation(src)
      .then((json) => alive && setData(json))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    if (!ref.current) return;
    if (reduced) ref.current.goToAndStop(0, true);
    else ref.current.play();
  }, [reduced, data]);

  return (
    <div
      className={cn("aspect-square", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={!label}
    >
      {data && (
        <Lottie
          lottieRef={ref}
          animationData={data}
          loop={loop}
          autoplay={!reduced}
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet", progressiveLoad: true }}
          className="size-full"
        />
      )}
    </div>
  );
}
