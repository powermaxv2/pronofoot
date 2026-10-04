"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { cn } from "@/lib/utils";

/** Tuile statistique avec compteur animé. */
export function StatTile({
  label,
  value,
  suffix,
  hint,
  tone = "default",
  format,
}: {
  label: string;
  /** `null` : valeur indisponible (affiche un tiret). */
  value: number | null;
  suffix?: string;
  hint?: string;
  tone?: "default" | "volt" | "grass";
  format?: "int" | "percent";
}) {
  const fmt = format === "percent" ? (v: number) => `${Math.round(v)} %` : undefined;
  return (
    <div
      className={cn(
        "grid gap-1 rounded-2xl p-4",
        tone === "volt"
          ? "bg-volt text-volt-foreground"
          : tone === "grass"
            ? "bg-primary text-primary-foreground"
            : "glass",
      )}
    >
      <span className={cn("label-caps", tone === "default" && "text-muted-foreground")}>{label}</span>
      <span className="font-display text-5xl leading-none">
        {value == null ? (
          "–"
        ) : (
          <AnimatedNumber value={format === "percent" ? value * 100 : value} format={fmt} />
        )}
        {suffix && <span className="ml-1 text-2xl">{suffix}</span>}
      </span>
      {hint && (
        <span className={cn("text-sm", tone === "default" ? "text-muted-foreground" : "opacity-80")}>
          {hint}
        </span>
      )}
    </div>
  );
}
