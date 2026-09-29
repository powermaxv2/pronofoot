import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { features } from "@/lib/env";
import { getCurrentUser } from "@/server/session";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const safe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/accueil";
  if (await getCurrentUser()) redirect(safe);
  return <SignInForm emailEnabled={features.email()} googleEnabled={features.google()} callbackUrl={safe} />;
}
