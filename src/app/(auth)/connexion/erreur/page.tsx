import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Connexion impossible" };

const MESSAGES: Record<string, { title: string; text: string }> = {
  Verification: {
    title: "Lien expiré",
    text: "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
  },
  AccessDenied: { title: "Accès refusé", text: "Ce compte a été désactivé par un administrateur." },
  Configuration: {
    title: "Configuration incomplète",
    text: "Le serveur d'authentification est mal configuré. Prévenez l'administrateur.",
  },
  OAuthAccountNotLinked: {
    title: "Compte déjà existant",
    text: "Cette adresse est déjà liée à une autre méthode de connexion. Utilisez le lien magique.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = MESSAGES[error ?? ""] ?? {
    title: "Connexion impossible",
    text: "Une erreur est survenue pendant la connexion. Réessayez.",
  };
  return (
    <div className="glass-strong grid w-full max-w-md gap-5 rounded-3xl p-8 shadow-2xl">
      <h1 className="font-display text-5xl leading-none tracking-wide">{message.title}</h1>
      <p className="text-muted-foreground">{message.text}</p>
      <ButtonLink href="/connexion" variant="volt">
        Revenir à la connexion
      </ButtonLink>
    </div>
  );
}
