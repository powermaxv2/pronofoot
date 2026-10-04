"use client";

import { m } from "motion/react";
import { useId } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: React.ReactNode; count?: number };

/**
 * Contrôle segmenté (onglets, filtres) : la pastille active glisse d'une option
 * à l'autre grâce à un `layoutId` partagé.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "default",
  ariaLabel,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "default";
  ariaLabel: string;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("glass-strong relative flex rounded-full p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "font-condensed relative flex-1 rounded-full font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-colors",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              active ? "text-volt-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <m.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                className="bg-volt absolute inset-0 rounded-full"
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {o.label}
              {o.count != null && <span className="tabular opacity-70">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
