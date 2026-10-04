"use client";

import type { NotificationType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { CheckCheck, Clock, Megaphone, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatKickoff, relativeDay } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";

type Item = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const ICON: Record<NotificationType, LucideIcon> = {
  REMINDER: Clock,
  RESULT: Trophy,
  BADGE: Trophy,
  LEAGUE: Users,
  SYSTEM: Megaphone,
};
const TONE: Record<NotificationType, string> = {
  REMINDER: "bg-volt text-volt-foreground",
  RESULT: "bg-primary text-primary-foreground",
  BADGE: "bg-gold text-black",
  LEAGUE: "bg-sky-500 text-white",
  SYSTEM: "bg-surface-strong text-foreground",
};

export function NotificationList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const queryClient = useQueryClient();
  const unread = items.filter((i) => !i.readAt).length;

  const markOne = (id: string) => {
    setItems((list) => list.map((i) => (i.id === id && !i.readAt ? { ...i, readAt: new Date() } : i)));
    void markNotificationRead(id).then(() =>
      queryClient.invalidateQueries({ queryKey: ["notifications", "count"] }),
    );
  };
  const markAll = () =>
    start(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) return void toast.error(result.error);
      setItems((list) => list.map((i) => ({ ...i, readAt: i.readAt ?? new Date() })));
      await queryClient.invalidateQueries({ queryKey: ["notifications", "count"] });
      toast.success(result.data.count ? "Tout est lu" : "Rien de nouveau");
    });

  if (items.length === 0) {
    return (
      <p className="glass text-muted-foreground rounded-2xl p-6 text-center">
        Aucune notification pour le moment.
      </p>
    );
  }

  let lastDay = "";
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
        </span>
        <Button variant="glass" size="sm" onClick={markAll} loading={pending} disabled={unread === 0}>
          <CheckCheck /> Tout marquer comme lu
        </Button>
      </div>
      <StaggerList className="grid gap-2" step={0.04}>
        {items.map((n, i) => {
          const Icon = ICON[n.type];
          const day = relativeDay(n.createdAt);
          const header = day !== lastDay ? day : null;
          lastDay = day;
          const content = (
            <div
              className={cn(
                "glass relative flex items-start gap-3 rounded-2xl p-3.5 transition-opacity",
                n.readAt && "opacity-70",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE[n.type])}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-condensed block font-bold tracking-wide">{n.title}</span>
                <span className="text-muted-foreground block text-sm">{n.body}</span>
                <span className="text-muted-foreground mt-1 block text-xs">{formatKickoff(n.createdAt)}</span>
              </span>
              <AnimatePresence>
                {!n.readAt && (
                  <m.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={spring.bouncy}
                    className="bg-live mt-1.5 size-2.5 shrink-0 rounded-full"
                    aria-label="Non lue"
                  />
                )}
              </AnimatePresence>
            </div>
          );
          return (
            <StaggerItem key={n.id} index={i}>
              {header && (
                <h2 className="font-condensed text-muted-foreground mt-3 mb-2 text-sm font-bold tracking-wide uppercase">
                  {header}
                </h2>
              )}
              {n.href ? (
                <Link href={n.href} onClick={() => markOne(n.id)} className="block rounded-2xl">
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  className="block w-full rounded-2xl text-left"
                >
                  {content}
                </button>
              )}
            </StaggerItem>
          );
        })}
      </StaggerList>
    </div>
  );
}
