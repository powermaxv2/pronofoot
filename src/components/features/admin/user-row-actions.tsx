"use client";

import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { setUserDisabledAction, setUserRoleAction } from "@/server/actions/admin";

export function UserRowActions({
  userId,
  role,
  disabled,
  isSelf,
}: {
  userId: string;
  role: "USER" | "ADMIN";
  disabled: boolean;
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Fait");
      else toast.error(r.error ?? "Action impossible");
    });
  if (isSelf) return <span className="text-muted-foreground text-xs">vous</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="hover:bg-accent grid size-8 place-items-center rounded-full"
        aria-label="Actions"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => run(() => setUserRoleAction(userId, role === "ADMIN" ? "USER" : "ADMIN"))}
        >
          {role === "ADMIN" ? "Retirer les droits admin" : "Promouvoir administrateur"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={disabled ? undefined : "text-destructive"}
          onSelect={() => run(() => setUserDisabledAction(userId, !disabled))}
        >
          {disabled ? "Réactiver le compte" : "Désactiver le compte"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
