"use client";

import { m } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createLeagueAction, updateLeagueAction } from "@/server/actions/leagues";

export const LEAGUE_EMOJIS = ["⚽", "🏆", "📣", "🔥", "🦁", "🐓", "🏡", "🛋️", "🍻", "🎯", "⚡", "👑"];
export const LEAGUE_COLORS = [
  "#22c55e",
  "#e8ff3a",
  "#38bdf8",
  "#a855f7",
  "#f97316",
  "#ef4444",
  "#f5c542",
  "#14b8a6",
];

type Values = { name: string; description: string; emoji: string; color: string };

/** Création ou modification d'une ligue. */
export function LeagueFormDialog({
  open,
  onOpenChange,
  league,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league?: { id: string } & Values;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(
    league ?? { name: "", description: "", emoji: "⚽", color: "#22c55e" },
  );
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = () =>
    start(async () => {
      if (league) {
        const result = await updateLeagueAction(league.id, values);
        if (!result.ok) return void toast.error(result.error);
        toast.success(result.message ?? "Enregistré");
        onOpenChange(false);
        router.refresh();
      } else {
        const result = await createLeagueAction(values);
        if (!result.ok) return void toast.error(result.error);
        toast.success(result.message ?? "Ligue créée", {
          description: "Partagez le code d'invitation à vos potes.",
        });
        onOpenChange(false);
        router.push(`/ligues/${result.data.slug}`);
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={league ? "Modifier la ligue" : "Nouvelle ligue"}
        description="Un nom, un emblème, une couleur : c'est parti."
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="league-name">Nom</Label>
            <Input
              id="league-name"
              value={values.name}
              maxLength={40}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Les Ultras du Bureau"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="league-description">Description (facultative)</Label>
            <Textarea
              id="league-description"
              value={values.description}
              maxLength={160}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Le dernier paie les croissants."
              className="min-h-20"
            />
          </div>
          <div className="grid gap-2">
            <Label>Emblème</Label>
            <div role="radiogroup" aria-label="Emblème" className="grid grid-cols-6 gap-2">
              {LEAGUE_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={values.emoji === e}
                  onClick={() => set("emoji", e)}
                  className="relative grid aspect-square place-items-center rounded-xl text-2xl"
                >
                  {values.emoji === e && (
                    <m.span
                      layoutId="league-emoji"
                      transition={spring.snappy}
                      className="bg-surface-strong ring-volt absolute inset-0 rounded-xl ring-2"
                      aria-hidden
                    />
                  )}
                  <span className="relative">{e}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Couleur</Label>
            <div role="radiogroup" aria-label="Couleur" className="flex flex-wrap gap-2">
              {LEAGUE_COLORS.map((c) => (
                <m.button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={values.color === c}
                  aria-label={c}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => set("color", c)}
                  className={cn(
                    "size-9 rounded-full ring-offset-2 ring-offset-[var(--popover)]",
                    values.color === c && "ring-foreground ring-2",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="volt" onClick={submit} loading={pending} disabled={values.name.trim().length < 3}>
            {league ? "Enregistrer" : "Créer la ligue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
