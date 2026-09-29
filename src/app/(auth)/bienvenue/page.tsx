import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usernameSchema } from "@/lib/validation";
import { prisma } from "@/server/db";
import { teamsForPicker } from "@/server/queries/teams";
import { requireUser } from "@/server/session";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Bienvenue" };

/** Suggestion de pseudo libre à partir du nom ou de l'e-mail. */
async function suggestUsername(base: string) {
  const cleaned = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  const candidate = usernameSchema.safeParse(cleaned).success ? cleaned : "joueur";
  for (let i = 0; i < 20; i++) {
    const name = i === 0 ? candidate : `${candidate.slice(0, 16)}${Math.floor(10 + Math.random() * 990)}`;
    if (!(await prisma.user.findUnique({ where: { username: name }, select: { id: true } }))) return name;
  }
  return "";
}

export default async function WelcomePage() {
  const user = await requireUser({ allowIncomplete: true, callbackUrl: "/bienvenue" });
  if (user.onboardedAt && user.username) redirect("/accueil");
  const [teams, suggestion] = await Promise.all([
    teamsForPicker(),
    suggestUsername(user.name ?? user.email.split("@")[0] ?? "joueur"),
  ]);
  return <Onboarding teams={teams} suggestion={suggestion} googleImage={user.image} />;
}
