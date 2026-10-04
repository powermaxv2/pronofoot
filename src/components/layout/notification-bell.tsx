"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { spring } from "@/lib/motion";

/** Cloche avec compteur de notifications non lues (rafraîchi toutes les 60 s). */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const { data } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count", { cache: "no-store" });
      if (!res.ok) throw new Error("Compteur indisponible");
      return (await res.json()) as { unread: number };
    },
    initialData: { unread: initialUnread },
    refetchInterval: 60_000,
  });
  const unread = data.unread;
  return (
    <Link
      href="/notifications"
      className="hover:bg-accent relative grid size-10 place-items-center rounded-full"
      aria-label={unread ? `Notifications (${unread} non lues)` : "Notifications"}
    >
      <m.span
        key={unread}
        animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : undefined}
        transition={{ duration: 0.6 }}
        className="grid"
      >
        <Bell className="size-5" aria-hidden />
      </m.span>
      <AnimatePresence>
        {unread > 0 && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
            className="bg-live font-condensed absolute top-1 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[11px] leading-none font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </m.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
