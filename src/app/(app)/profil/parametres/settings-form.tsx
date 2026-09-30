"use client";

import { m } from "motion/react";
import { useTheme } from "next-themes";
import { useState, useTransition } from "react";
import { AvatarPicker } from "@/components/features/profile/avatar-picker";
import { TeamPicker, type PickerTeam } from "@/components/features/profile/team-picker";
import { UsernameField, type UsernameStatus } from "@/components/features/profile/username-field";
import { Reveal } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import {
  deleteAccount,
  signOutAction,
  updateNotificationPrefs,
  updateProfile,
} from "@/server/actions/profile";
import { PushToggle } from "./push-toggle";

type Props = {
  user: {
    username: string;
    avatarUrl: string | null;
    image: string | null;
    favoriteTeamId: string | null;
    notifyReminders: boolean;
    notifyResults: boolean;
    notifyEmail: boolean;
    email: string;
  };
  teams: PickerTeam[];
  pushPublicKey: string | null;
};

export function SettingsForm({ user, teams, pushPublicKey }: Props) {
  const [username, setUsername] = useState(user.username);
  const [status, setStatus] = useState<UsernameStatus>("available");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [favoriteTeamId, setFavoriteTeamId] = useState(user.favoriteTeamId);
  const [prefs, setPrefs] = useState({
    notifyReminders: user.notifyReminders,
    notifyResults: user.notifyResults,
    notifyEmail: user.notifyEmail,
  });
  const [savingProfile, startProfile] = useTransition();
  const [, startPrefs] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, startDelete] = useTransition();
  const { theme, setTheme } = useTheme();

  const saveProfile = () =>
    startProfile(async () => {
      const result = await updateProfile({ username, avatarUrl, favoriteTeamId });
      if (result.ok) toast.success(result.message ?? "Enregistré");
      else toast.error(result.error);
    });

  const togglePref = (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startPrefs(async () => {
      const result = await updateNotificationPrefs(next);
      if (!result.ok) {
        toast.error(result.error);
        setPrefs(prefs);
      }
    });
  };

  const prefRows: { key: keyof typeof prefs; label: string; text: string }[] = [
    {
      key: "notifyReminders",
      label: "Rappels avant les matchs",
      text: "1 h avant un match non pronostiqué de vos compétitions ou de votre club.",
    },
    { key: "notifyResults", label: "Résultats de mes pronos", text: "Points gagnés dès la fin du match." },
    {
      key: "notifyEmail",
      label: "Recevoir aussi par e-mail",
      text: `Copie des notifications à ${user.email}.`,
    },
  ];

  return (
    <div className="grid gap-5">
      <Reveal>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Pseudo, avatar et club de cœur.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Pseudo</Label>
              <UsernameField
                value={username}
                onChange={setUsername}
                onStatus={setStatus}
                initial={user.username}
              />
            </div>
            <div className="grid gap-2">
              <Label>Avatar</Label>
              <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} googleImage={user.image} />
            </div>
            <div className="grid gap-2">
              <Label>Club de cœur</Label>
              <TeamPicker teams={teams} value={favoriteTeamId} onChange={setFavoriteTeamId} />
            </div>
            <Button
              variant="volt"
              onClick={saveProfile}
              loading={savingProfile}
              disabled={status !== "available"}
              className="justify-self-start"
            >
              Enregistrer le profil
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Toujours visibles dans l&apos;application ; en plus sur cet appareil et par e-mail si vous le
                souhaitez.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-1">
            {prefRows.map((row) => (
              <label
                key={row.key}
                className="hover:bg-accent flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-3"
              >
                <span>
                  <span className="font-condensed block text-base font-bold tracking-wide uppercase">
                    {row.label}
                  </span>
                  <span className="text-muted-foreground text-sm">{row.text}</span>
                </span>
                <Switch
                  checked={prefs[row.key]}
                  onCheckedChange={(v) => togglePref(row.key, v)}
                  aria-label={row.label}
                />
              </label>
            ))}
            <PushToggle publicKey={pushPublicKey} />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>
                Les animations suivent le réglage « réduire les animations » de votre appareil.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Segmented
              ariaLabel="Thème"
              value={(theme ?? "dark") as "dark" | "light" | "system"}
              onChange={setTheme}
              options={[
                { value: "dark", label: "Sombre" },
                { value: "light", label: "Clair" },
                { value: "system", label: "Système" },
              ]}
              className="max-w-sm"
            />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.15}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Compte</CardTitle>
              <CardDescription>Connecté avec {user.email}.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="glass" onClick={() => void signOutAction()}>
              Se déconnecter
            </Button>
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          title="Supprimer le compte ?"
          description="Vos pronostics, badges, notifications et les ligues que vous avez créées seront définitivement supprimés."
        >
          <div className="grid gap-2">
            <Label htmlFor="confirm-delete">Tapez votre pseudo pour confirmer</Label>
            <Input
              id="confirm-delete"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={user.username}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <m.div animate={confirmation === user.username ? { scale: [1, 1.05, 1] } : undefined}>
              <Button
                variant="destructive"
                loading={deleting}
                disabled={confirmation !== user.username}
                onClick={() =>
                  startDelete(async () => {
                    const result = await deleteAccount(confirmation);
                    if (result && !result.ok) toast.error(result.error);
                  })
                }
              >
                Supprimer définitivement
              </Button>
            </m.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
