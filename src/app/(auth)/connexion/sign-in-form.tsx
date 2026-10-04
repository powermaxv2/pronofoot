"use client";

import { AnimatePresence, m } from "motion/react";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Shake } from "@/components/motion/shake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useMotionPreset } from "@/hooks/use-motion-preset";
import { requestMagicLink, signInWithGoogle, type SignInState } from "./actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.3 7.4l3.2 2.3C7.4 7.6 9.5 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 8.2 2.2 4.9 4.4 3.3 7.4z"
        opacity=".9"
      />
      <path
        fill="#FBBC05"
        d="M12 21.8c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-3.8 0-5.2-2.5-5.5-3.8l-3.2 2.5c1.6 3.1 4.9 5 8.7 5z"
        opacity=".9"
      />
      <path
        fill="#4285F4"
        d="M21.4 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.1-1 2.1-2.1 2.7l2.9 2.4c1.7-1.6 3.1-4.1 3.1-7.4z"
      />
    </svg>
  );
}

export function SignInForm({
  emailEnabled,
  googleEnabled,
  callbackUrl,
}: {
  emailEnabled: boolean;
  googleEnabled: boolean;
  callbackUrl: string;
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestMagicLink, {});
  const { props } = useMotionPreset("scaleIn");
  const item = useMotionPreset("listItem");

  return (
    <m.div {...props} className="glass-strong w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8">
      <m.div
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
        className="grid gap-6"
      >
        <m.div variants={item.variants}>
          <h1 className="font-display text-5xl leading-none tracking-wide">Connexion</h1>
          <p className="text-muted-foreground mt-2">
            Pas de mot de passe : on vous envoie un lien magique, valable 30 minutes.
          </p>
        </m.div>

        {emailEnabled && (
          <m.form variants={item.variants} action={action} className="grid gap-3" noValidate>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Label htmlFor="email">Adresse e-mail</Label>
            <Shake trigger={state.error}>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                defaultValue={state.email}
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby={state.error ? "email-error" : undefined}
              />
            </Shake>
            <AnimatePresence>
              {state.error && (
                <m.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <FieldError id="email-error" message={state.error} />
                </m.div>
              )}
            </AnimatePresence>
            <Button type="submit" size="lg" variant="volt" loading={pending} className="mt-1 w-full">
              <Mail /> Recevoir mon lien
            </Button>
          </m.form>
        )}

        {emailEnabled && googleEnabled && (
          <m.div variants={item.variants} className="text-muted-foreground flex items-center gap-3 text-sm">
            <span className="bg-border h-px flex-1" /> ou <span className="bg-border h-px flex-1" />
          </m.div>
        )}

        {googleEnabled && (
          <m.form variants={item.variants} action={signInWithGoogle}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Button type="submit" size="lg" variant="glass" className="w-full tracking-normal normal-case">
              <GoogleIcon /> Continuer avec Google
            </Button>
          </m.form>
        )}

        {!emailEnabled && !googleEnabled && (
          <p role="alert" className="text-destructive">
            Aucune méthode de connexion n&apos;est configurée : renseignez EMAIL_SERVER ou AUTH_GOOGLE_ID dans
            le fichier .env.
          </p>
        )}

        <m.p variants={item.variants} className="text-muted-foreground text-xs">
          En continuant, vous rejoignez un jeu gratuit entre amis : points virtuels uniquement, aucun pari ni
          argent réel.
        </m.p>
      </m.div>
    </m.div>
  );
}
