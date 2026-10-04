"use client";

import { m } from "motion/react";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { TeamCrest, type CrestTeam } from "@/components/features/match/team-crest";
import { Input } from "@/components/ui/input";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type PickerTeam = CrestTeam & { id: string; shortName: string; group: string };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Sélecteur d'équipe favorite avec recherche instantanée. */
export function TeamPicker({
  teams,
  value,
  onChange,
}: {
  teams: PickerTeam[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const groups = useMemo(() => {
    const q = normalize(deferred.trim());
    const filtered = q
      ? teams.filter((t) => normalize(`${t.name} ${t.shortName} ${t.tla}`).includes(q))
      : teams;
    const map = new Map<string, PickerTeam[]>();
    for (const t of filtered) map.set(t.group, [...(map.get(t.group) ?? []), t]);
    return [...map.entries()];
  }, [teams, deferred]);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un club"
          className="pl-10"
          aria-label="Rechercher un club"
        />
      </div>
      <div className="grid max-h-80 gap-4 overflow-y-auto pr-1">
        {groups.length === 0 && <p className="text-muted-foreground text-sm">Aucun club ne correspond.</p>}
        {groups.map(([group, list]) => (
          <section key={group} className="grid gap-2">
            <h3 className="label-caps text-muted-foreground">{group}</h3>
            <div role="radiogroup" aria-label={group} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((t) => {
                const active = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(active ? null : t.id)}
                    className={cn(
                      "relative flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                      active ? "text-volt-foreground" : "glass-strong hover:bg-accent",
                    )}
                  >
                    {active && (
                      <m.span
                        layoutId="team-pick"
                        transition={spring.snappy}
                        className="bg-volt absolute inset-0 rounded-xl"
                        aria-hidden
                      />
                    )}
                    <span className="relative">
                      <TeamCrest team={t} size={26} />
                    </span>
                    <span
                      className={cn(
                        "font-condensed relative truncate text-sm font-semibold",
                        active && "text-volt-foreground",
                      )}
                    >
                      {t.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
