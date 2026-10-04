import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { LottiePlayer } from "@/components/motion/lottie-player";
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = { title: "Hors ligne" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main id="contenu" className="pitch-lines grid min-h-dvh place-items-center px-4">
      <div className="glass-strong grid max-w-md justify-items-center gap-4 rounded-3xl p-8 text-center">
        <Logo />
        <LottiePlayer src="/lottie/ball-roll.json" className="w-48" />
        <h1 className="font-display text-5xl leading-none tracking-wide">Pas de réseau</h1>
        <p className="text-muted-foreground">
          PronoFoot a besoin d&apos;une connexion pour afficher les scores et enregistrer vos pronostics. Les
          pages déjà consultées restent disponibles.
        </p>
        <ReloadButton />
      </div>
    </main>
  );
}
