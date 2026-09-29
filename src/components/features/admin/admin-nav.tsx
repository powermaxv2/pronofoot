"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/utilisateurs", label: "Joueurs" },
  { href: "/admin/synchronisation", label: "Synchronisation" },
  { href: "/admin/matchs", label: "Résultats" },
  { href: "/admin/journal", label: "Journal" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="glass-strong inline-flex gap-1 rounded-full p-1">
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "font-condensed relative block rounded-full px-4 py-2 text-sm font-bold tracking-wide whitespace-nowrap uppercase",
                  active ? "text-volt-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <m.span
                    layoutId="admin-nav"
                    transition={spring.snappy}
                    className="bg-volt absolute inset-0 rounded-full"
                    aria-hidden
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
