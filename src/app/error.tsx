"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="contenu" className="grid min-h-[70dvh] place-items-center px-4">
      <div className="glass-strong grid max-w-md gap-4 rounded-3xl p-8 text-center">
        <h1 className="font-display text-5xl leading-none tracking-wide">Carton rouge</h1>
        <p className="text-muted-foreground">
          Une erreur inattendue est survenue. Réessayez ; si elle persiste, prévenez l&apos;administrateur.
        </p>
        {error.digest && <code className="text-muted-foreground text-xs">Référence : {error.digest}</code>}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="volt" onClick={reset}>
            Réessayer
          </Button>
          <ButtonLink href="/accueil" variant="glass">
            Accueil
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
