"use client";

import { AnimatePresence, m } from "motion/react";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { usernameSchema } from "@/lib/validation";
import { checkUsername } from "@/server/actions/profile";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/** Champ pseudo avec validation et vérification de disponibilité (debounce 350 ms). */
export function UsernameField({
  value,
  onChange,
  onStatus,
  initial,
}: {
  value: string;
  onChange: (v: string) => void;
  onStatus: (s: UsernameStatus) => void;
  initial?: string | null;
}) {
  const [status, setStatus] = useState<UsernameStatus>(initial ? "available" : "idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsed = usernameSchema.safeParse(value);
    if (!value) {
      setStatus("idle");
      setMessage(null);
      onStatus("idle");
      return;
    }
    if (!parsed.success) {
      setStatus("invalid");
      setMessage(parsed.error.issues[0]?.message ?? "Pseudo invalide.");
      onStatus("invalid");
      return;
    }
    if (initial && parsed.data === initial) {
      setStatus("available");
      setMessage(null);
      onStatus("available");
      return;
    }
    setStatus("checking");
    onStatus("checking");
    const timer = window.setTimeout(async () => {
      const result = await checkUsername(parsed.data);
      const next: UsernameStatus = result.ok ? (result.data.available ? "available" : "taken") : "invalid";
      setStatus(next);
      setMessage(result.ok ? (result.data.available ? null : "Ce pseudo est déjà pris.") : result.error);
      onStatus(next);
    }, 350);
    return () => window.clearTimeout(timer);
    // onStatus est stable côté appelant (setter d'état).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initial]);

  return (
    <div className="grid gap-2">
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold">
          @
        </span>
        <Input
          id="username"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ""))}
          placeholder="ton_pseudo"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          className="pr-11 pl-9"
          aria-invalid={status === "invalid" || status === "taken"}
          aria-describedby="username-hint"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2">
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={status}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="grid"
            >
              {status === "checking" && <Loader2 className="text-muted-foreground size-5 animate-spin" />}
              {status === "available" && <Check className="text-grass-ink size-5" />}
              {(status === "taken" || status === "invalid") && <X className="text-destructive size-5" />}
            </m.span>
          </AnimatePresence>
        </span>
      </div>
      <p
        id="username-hint"
        className={
          status === "taken" || status === "invalid"
            ? "text-destructive text-sm"
            : "text-muted-foreground text-sm"
        }
      >
        {message ?? "3 à 20 caractères : lettres minuscules, chiffres, « _ » ou « - »."}
      </p>
    </div>
  );
}
