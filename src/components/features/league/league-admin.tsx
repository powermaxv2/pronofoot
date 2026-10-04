"use client";

import { LogOut, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/dates";
import {
  deleteLeagueAction,
  leaveLeagueAction,
  removeMemberAction,
  transferLeagueAction,
} from "@/server/actions/leagues";
import { LeagueFormDialog } from "./league-form-dialog";

type Member = {
  userId: string;
  username: string;
  avatar: string | null;
  role: "OWNER" | "MEMBER";
  joinedAt: Date;
};
type League = { id: string; name: string; description: string | null; emoji: string; color: string };

/** Membres et actions de gestion (président) ou départ (membre). */
export function LeagueAdmin({
  league,
  members,
  meId,
  isOwner,
}: {
  league: League;
  members: Member[];
  meId: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    text: string;
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>;
  }>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      if (!confirm) return;
      const result = await confirm.action();
      if (result.ok) {
        if (result.message) toast.success(result.message);
        setConfirm(null);
      } else toast.error(result.error ?? "Action impossible");
    });

  return (
    <div className="grid gap-4">
      <ul className="grid gap-1.5">
        {members.map((m) => (
          <li key={m.userId} className="glass-strong flex items-center gap-3 rounded-xl px-3 py-2">
            <Avatar name={m.username} src={m.avatar} size={34} />
            <span className="min-w-0 flex-1">
              <span className="font-condensed block truncate font-bold">{m.username}</span>
              <span className="text-muted-foreground text-xs">depuis le {formatDate(m.joinedAt)}</span>
            </span>
            {m.role === "OWNER" && <Badge variant="volt">Président</Badge>}
            {isOwner && m.userId !== meId && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hover:bg-accent grid size-8 place-items-center rounded-full"
                  aria-label={`Gérer ${m.username}`}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      setConfirm({
                        title: `Nommer ${m.username} président ?`,
                        text: "Vous deviendrez simple membre et ne pourrez plus gérer la ligue.",
                        action: () => transferLeagueAction(league.id, m.userId),
                      })
                    }
                  >
                    Nommer président
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() =>
                      setConfirm({
                        title: `Retirer ${m.username} ?`,
                        text: "Il pourra revenir avec le code d'invitation, sauf si vous le renouvelez.",
                        action: () => removeMemberAction(league.id, m.userId),
                      })
                    }
                  >
                    Retirer de la ligue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {isOwner ? (
          <>
            <Button variant="glass" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() =>
                setConfirm({
                  title: "Supprimer la ligue ?",
                  text: "Le classement de la ligue disparaît. Les pronostics et points des joueurs sont conservés.",
                  action: () => deleteLeagueAction(league.id),
                })
              }
            >
              <Trash2 /> Supprimer
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirm({
                title: "Quitter la ligue ?",
                text: "Vous pourrez revenir avec le code d'invitation.",
                action: () => leaveLeagueAction(league.id),
              })
            }
          >
            <LogOut /> Quitter la ligue
          </Button>
        )}
      </div>
      {editing && (
        <LeagueFormDialog
          open={editing}
          onOpenChange={setEditing}
          league={{
            id: league.id,
            name: league.name,
            description: league.description ?? "",
            emoji: league.emoji,
            color: league.color,
          }}
        />
      )}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent title={confirm?.title ?? ""} description={confirm?.text}>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={run} loading={pending}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
