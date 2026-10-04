"use client";

import { m } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Shake } from "@/components/motion/shake";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { joinLeagueAction } from "@/server/actions/leagues";
import { INVITE_ALPHABET, INVITE_LENGTH } from "@/server/domain/invite";

/** Saisie du code d'invitation : 8 cases qui se remplissent une à une. */
export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const onChange = (raw: string) =>
    setCode(
      raw
        .toUpperCase()
        .split("")
        .filter((c) => INVITE_ALPHABET.includes(c))
        .join("")
        .slice(0, INVITE_LENGTH),
    );
  const submit = () =>
    start(async () => {
      const result = await joinLeagueAction(code);
      if (!result.ok) {
        setError((e) => e + 1);
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.joined ? "Bienvenue dans la ligue !" : "Vous êtes déjà membre de cette ligue.",
      );
      router.push(`/ligues/${result.data.slug}${result.data.joined ? "?rejoint=1" : ""}`);
    });

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === INVITE_LENGTH) submit();
      }}
    >
      <label htmlFor="invite-code" className="label-caps text-muted-foreground">
        Code d&apos;invitation
      </label>
      <Shake trigger={error}>
        <div className="relative" onClick={() => input.current?.focus()}>
          <input
            ref={input}
            id="invite-code"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            className="absolute inset-0 z-10 cursor-text opacity-0"
            aria-describedby="invite-hint"
          />
          <div className="grid grid-cols-8 gap-1.5" aria-hidden>
            {Array.from({ length: INVITE_LENGTH }, (_, i) => {
              const char = code[i];
              const current = i === code.length;
              return (
                <span
                  key={i}
                  className={cn(
                    "glass-strong font-display grid aspect-[3/4] place-items-center rounded-lg text-2xl",
                    current && "ring-volt ring-2",
                  )}
                >
                  {char && (
                    <m.span
                      key={char + i}
                      initial={{ y: 12, opacity: 0, scale: 0.6 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={spring.bouncy}
                    >
                      {char}
                    </m.span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </Shake>
      <p id="invite-hint" className="text-muted-foreground text-xs">
        8 caractères, reçus du créateur de la ligue (majuscules et chiffres).
      </p>
      <Button type="submit" variant="volt" loading={pending} disabled={code.length !== INVITE_LENGTH}>
        Rejoindre
      </Button>
    </form>
  );
}
