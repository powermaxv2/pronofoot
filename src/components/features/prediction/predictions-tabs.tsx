"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { PredictionTab } from "@/server/queries/predictions";

const PARAM: Record<PredictionTab, string | null> = {
  upcoming: null,
  progress: "en-cours",
  history: "historique",
};

export function PredictionsTabs({
  tab,
  counts,
  children,
}: {
  tab: PredictionTab;
  counts: Record<PredictionTab, number>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-5">
      <Segmented
        ariaLabel="Mes pronostics"
        value={tab}
        onChange={(v) => {
          const next = new URLSearchParams(params);
          next.delete("page");
          if (PARAM[v]) next.set("onglet", PARAM[v]!);
          else next.delete("onglet");
          startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
        }}
        options={[
          { value: "upcoming", label: "À venir", count: counts.upcoming },
          { value: "progress", label: "En cours", count: counts.progress || undefined },
          { value: "history", label: "Historique", count: counts.history },
        ]}
        className="max-w-lg"
      />
      <div className={cn("transition-opacity", pending && "opacity-50")}>{children}</div>
    </div>
  );
}
