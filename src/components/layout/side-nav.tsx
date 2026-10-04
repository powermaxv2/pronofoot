"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Barre latérale desktop avec indicateur actif partagé. */
export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [...NAV_ITEMS, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : [])];
  return (
    <aside className="border-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r px-4 py-6 lg:flex">
      <Logo href="/accueil" className="px-3" gradientId="pf-ball-side" />
      <nav aria-label="Navigation principale">
        <ul className="grid gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "font-condensed relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold tracking-wide uppercase transition-colors",
                    active ? "text-volt-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="side-nav-pill"
                      transition={spring.snappy}
                      className="bg-volt absolute inset-0 rounded-xl"
                      aria-hidden
                    />
                  )}
                  <Icon className="relative size-5" aria-hidden />
                  <span className="relative">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="text-muted-foreground mt-auto px-3 text-xs">
        Points virtuels uniquement. Aucun pari, aucun argent réel.
      </p>
    </aside>
  );
}
