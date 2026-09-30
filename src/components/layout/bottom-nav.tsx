"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Barre de navigation mobile : la pastille active glisse d'un onglet à l'autre. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="glass-strong safe-bottom fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5 pb-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors",
                  active ? "text-volt-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <m.span
                    layoutId="bottom-nav-pill"
                    transition={spring.snappy}
                    className="bg-volt absolute inset-x-1.5 inset-y-0 rounded-2xl"
                    aria-hidden
                  />
                )}
                <m.span className="relative" whileTap={{ scale: 0.85 }} transition={spring.snappy}>
                  <Icon className="size-5" aria-hidden />
                </m.span>
                <span className="font-condensed relative tracking-wide uppercase">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
