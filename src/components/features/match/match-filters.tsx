"use client";

import { m } from "motion/react";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { formatDayShort, relativeDay } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MatchTab } from "@/server/queries/matches";

type Competition = { code: string; shortName: string; color: string };

/** Filtres des matchs : onglets, compétitions (multi-sélection) et jour. Synchronisés avec l'URL. */
export function MatchFilters({
  tab,
  competitions,
  selected,
  days,
  day,
  liveCount,
  children,
}: {
  tab: MatchTab;
  competitions: Competition[];
  selected: string[];
  days: { day: string; count: number }[];
  day: string | null;
  liveCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const toggleCompetition = (code: string) => {
    const set = new Set(selected);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    update({ comp: set.size ? [...set].join(",") : null, jour: null });
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4">
        <Segmented
          ariaLabel="Statut des matchs"
          value={tab}
          onChange={(v) =>
            update({ onglet: v === "upcoming" ? null : v === "live" ? "direct" : "termines", jour: null })
          }
          options={[
            { value: "upcoming", label: "À venir" },
            { value: "live", label: "En direct", count: liveCount || undefined },
            { value: "finished", label: "Terminés" },
          ]}
          className="max-w-md"
        />
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
          role="group"
          aria-label="Compétitions"
        >
          {competitions.map((c) => {
            const active = selected.includes(c.code);
            return (
              <m.button
                key={c.code}
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={spring.snappy}
                aria-pressed={active}
                onClick={() => toggleCompetition(c.code)}
                className={cn(
                  "font-condensed flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold tracking-wide uppercase transition-colors",
                  active
                    ? "border-transparent text-white"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                style={active ? { background: c.color } : undefined}
              >
                <m.span
                  animate={{ width: active ? 14 : 0, opacity: active ? 1 : 0 }}
                  transition={spring.snappy}
                  className="grid overflow-hidden"
                >
                  <Check className="size-3.5" aria-hidden />
                </m.span>
                {!active && (
                  <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                )}
                {c.shortName}
              </m.button>
            );
          })}
        </div>
        {days.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Jour">
            {[{ day: null as string | null, count: days.reduce((a, d) => a + d.count, 0) }, ...days].map(
              (d) => {
                const active = d.day === day;
                const date = d.day ? new Date(`${d.day}T12:00:00Z`) : null;
                return (
                  <button
                    key={d.day ?? "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ jour: d.day })}
                    className={cn(
                      "relative grid shrink-0 justify-items-center rounded-2xl px-3.5 py-2 text-center",
                      active ? "text-volt-foreground" : "glass hover:bg-accent",
                    )}
                  >
                    {active && (
                      <m.span
                        layoutId="day-pill"
                        transition={spring.snappy}
                        className="bg-volt absolute inset-0 rounded-2xl"
                        aria-hidden
                      />
                    )}
                    <span className="font-condensed relative text-sm font-bold tracking-wide uppercase">
                      {date ? relativeDay(date).replace(/^(\w+)\.?\s.*$/, "$1") : "Tous"}
                    </span>
                    <span className={cn("relative text-xs", !active && "text-muted-foreground")}>
                      {date ? formatDayShort(date).split(" ").slice(1).join(" ") : `${d.count} matchs`}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>
      <div
        className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-50")}
        aria-busy={pending}
      >
        {children}
      </div>
    </div>
  );
}
