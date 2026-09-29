import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/features/landing/hero";
import { Community, LeaderboardPreview, Scoring, Steps } from "@/components/features/landing/sections";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <>
      <header className="safe-top bg-background/70 sticky top-0 z-40 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <nav className="flex items-center gap-1" aria-label="Compte">
            <ThemeToggle />
            <ButtonLink href="/connexion" variant="glass" size="sm">
              Se connecter
            </ButtonLink>
          </nav>
        </div>
      </header>
      <main id="contenu">
        <Hero />
        <Steps />
        <Scoring />
        <Community />
        <LeaderboardPreview />
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-24">
          <div className="bg-primary text-primary-foreground grid gap-6 rounded-3xl p-8 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-5xl leading-none tracking-wide sm:text-6xl">
                Coup d&apos;envoi ?
              </h2>
              <p className="mt-3 max-w-[52ch] text-lg opacity-85">
                Gratuit, sans pari et sans publicité. Connexion par lien magique ou compte Google.
              </p>
            </div>
            <ButtonLink href="/connexion" variant="volt" size="lg">
              Je me lance <ArrowRight />
            </ButtonLink>
          </div>
        </section>
      </main>
      <footer className="text-muted-foreground border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm">
          <p>
            PronoFoot — jeu gratuit entre amis, points virtuels uniquement. Aucun pari, aucun argent réel.
          </p>
          <p>Données : API-Football & football-data.org</p>
        </div>
      </footer>
    </>
  );
}
