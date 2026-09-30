import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { env } from "@/lib/env";
import { teamsForPicker } from "@/server/queries/teams";
import { requireUser } from "@/server/session";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await requireUser();
  const teams = await teamsForPicker();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Mon compte" title="Paramètres" />
      <SettingsForm
        teams={teams}
        pushPublicKey={env().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        user={{
          username: user.username!,
          avatarUrl: user.avatarUrl,
          image: user.image,
          favoriteTeamId: user.favoriteTeamId,
          notifyReminders: user.notifyReminders,
          notifyResults: user.notifyResults,
          notifyEmail: user.notifyEmail,
          email: user.email,
        }}
      />
    </div>
  );
}
