import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Envelope } from "./envelope";

export const metadata: Metadata = { title: "Vérifiez vos e-mails" };

export default function VerifyRequestPage() {
  return (
    <div className="glass-strong grid w-full max-w-md gap-6 rounded-3xl p-8 text-center shadow-2xl">
      <Envelope />
      <div>
        <h1 className="font-display text-5xl leading-none tracking-wide">Lien envoyé !</h1>
        <p className="text-muted-foreground mt-3">
          Ouvrez l&apos;e-mail que nous venons d&apos;envoyer et cliquez sur « Me connecter ». Pensez à
          vérifier les courriers indésirables. Le lien expire dans 30 minutes.
        </p>
      </div>
      <ButtonLink href="/connexion" variant="glass">
        Utiliser une autre adresse
      </ButtonLink>
    </div>
  );
}
