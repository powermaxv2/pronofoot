"use client";

import { LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/server/actions/profile";

/** Déconnexion : purge d'abord les pages mises en cache hors ligne (appareil partagé). */
async function signOut() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.endsWith("-pages")).map((k) => caches.delete(k)));
  } catch {
    /* Cache Storage indisponible */
  }
  await signOutAction();
}

export function UserMenu({
  username,
  avatar,
  isAdmin,
}: {
  username: string;
  avatar: string | null;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Menu du compte">
        <Avatar name={username} src={avatar} size={36} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-muted-foreground block text-xs">Connecté en tant que</span>
          <span className="font-condensed text-base font-bold">@{username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profil/${username}`}>
            <User /> Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profil/parametres">
            <Settings /> Paramètres
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
