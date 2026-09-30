import { LottiePlayer } from "@/components/motion/lottie-player";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenu" className="pitch-lines grid min-h-[70dvh] place-items-center px-4">
      <div className="grid max-w-md justify-items-center gap-3 text-center">
        <LottiePlayer src="/lottie/ball-roll.json" className="w-52" />
        <p className="font-display text-volt-ink text-8xl leading-none">404</p>
        <h1 className="font-display text-4xl tracking-wide">Hors-jeu !</h1>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou plus. Retour au rond central.</p>
        <ButtonLink href="/accueil" variant="volt">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </main>
  );
}
