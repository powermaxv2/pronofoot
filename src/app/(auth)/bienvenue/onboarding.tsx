"use client";

import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { AvatarPicker } from "@/components/features/profile/avatar-picker";
import { TeamPicker, type PickerTeam } from "@/components/features/profile/team-picker";
import { UsernameField, type UsernameStatus } from "@/components/features/profile/username-field";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { duration, ease, spring } from "@/lib/motion";
import { completeOnboarding } from "@/server/actions/profile";

const STEPS = [
  { title: "Ton pseudo", text: "C'est lui qui apparaîtra dans les classements." },
  { title: "Ton avatar", text: "Un maillot, ta photo, ou tes initiales." },
  { title: "Ton club de cœur", text: "Tu recevras un rappel avant chacun de ses matchs." },
] as const;

export function Onboarding({
  teams,
  suggestion,
  googleImage,
}: {
  teams: PickerTeam[];
  suggestion: string;
  googleImage: string | null;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [username, setUsername] = useState(suggestion);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canContinue = step !== 0 || usernameStatus === "available";
  const go = (delta: number) => {
    setDirection(delta);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
  };
  const finish = () =>
    startTransition(async () => {
      const result = await completeOnboarding({ username, avatarUrl, favoriteTeamId });
      if (result && !result.ok) toast.error(result.error);
    });

  const slide = {
    initial: (dir: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: dir * 48 }),
    animate: { opacity: 1, x: 0, transition: { duration: duration.base, ease: ease.out } },
    exit: (dir: number) =>
      reduced
        ? { opacity: 0 }
        : { opacity: 0, x: dir * -48, transition: { duration: duration.fast, ease: ease.exit } },
  };

  return (
    <div className="glass-strong w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl">
      <div className="bg-border h-1.5">
        <m.div
          className="bg-volt h-full origin-left"
          animate={{ scaleX: (step + 1) / STEPS.length }}
          transition={spring.gentle}
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Étape ${step + 1} sur ${STEPS.length}`}
        />
      </div>
      <div className="grid gap-6 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <m.div
            key={avatarUrl ?? "none"}
            initial={reduced ? false : { scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.bouncy}
          >
            <Avatar name={username || "?"} src={avatarUrl ?? googleImage} size={56} />
          </m.div>
          <div className="min-w-0">
            <p className="label-caps text-grass-ink">
              Étape {step + 1} / {STEPS.length}
            </p>
            <h1 className="font-display truncate text-4xl leading-none tracking-wide">
              {STEPS[step]!.title}
            </h1>
            <p className="text-muted-foreground text-sm">{STEPS[step]!.text}</p>
          </div>
        </div>

        <div className="relative min-h-72">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <m.div
              key={step}
              custom={direction}
              variants={slide}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {step === 0 && (
                <UsernameField value={username} onChange={setUsername} onStatus={setUsernameStatus} />
              )}
              {step === 1 && (
                <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} googleImage={googleImage} />
              )}
              {step === 2 && <TeamPicker teams={teams} value={favoriteTeamId} onChange={setFavoriteTeamId} />}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0 || pending}>
            <ArrowLeft /> Retour
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="volt" onClick={() => go(1)} disabled={!canContinue}>
              Continuer <ArrowRight />
            </Button>
          ) : (
            <Button variant="volt" onClick={finish} loading={pending}>
              <Check /> C&apos;est parti
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
