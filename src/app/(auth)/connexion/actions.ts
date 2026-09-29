"use server";

import { AuthError } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import { features } from "@/lib/env";
import { emailSchema, firstError } from "@/lib/validation";
import { signIn } from "@/server/auth";
import { clientIp, rateLimit } from "@/server/rate-limit";

export type SignInState = { error?: string; email?: string };

/** N'accepte que des chemins internes comme destination après connexion. */
function safeCallback(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/accueil";
}

export async function requestMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error), email: String(formData.get("email") ?? "") };
  if (!features.email())
    return { error: "La connexion par e-mail n'est pas configurée sur ce serveur.", email: parsed.data };
  const ip = await clientIp();
  const limited = rateLimit("magicLink", `${ip}:${parsed.data}`);
  if (!limited.ok)
    return {
      error: `Trop de demandes. Réessayez dans ${Math.ceil(limited.retryAfterSec / 60)} min.`,
      email: parsed.data,
    };
  try {
    // redirect: false → on redirige nous-mêmes vers la page de vérification (navigation client fiable).
    await signIn("nodemailer", {
      email: parsed.data,
      redirectTo: safeCallback(formData.get("callbackUrl")),
      redirect: false,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "AccessDenied"
            ? "Ce compte est désactivé."
            : "Impossible d'envoyer le lien pour le moment.",
        email: parsed.data,
      };
    }
    console.error("[connexion]", error);
    return { error: "Impossible d'envoyer le lien pour le moment.", email: parsed.data };
  }
  redirect("/connexion/verification");
}

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}
