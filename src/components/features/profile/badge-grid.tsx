"use client";

import type { BadgeTier } from "@prisma/client";
import { m } from "motion/react";
import {
  Award,
  Crosshair,
  Crown,
  Flag,
  Flame,
  Globe,
  Lock,
  Rocket,
  Shield,
  Shuffle,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatDate } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { markBadgesSeen } from "@/server/actions/profile";

const ICONS: Record<string, LucideIcon> = {
  Flag,
  Flame,
  Rocket,
  Target,
  Crosshair,
  Award,
  Sparkles,
  Shuffle,
  Globe,
  Shield,
  Crown,
  Users,
};
const TIER: Record<BadgeTier, { label: string; ring: string; bg: string }> = {
  BRONZE: { label: "Bronze", ring: "ring-[#d08b4c]", bg: "bg-[#d08b4c]" },
  SILVER: { label: "Argent", ring: "ring-[#c0c7d1]", bg: "bg-[#c0c7d1]" },
  GOLD: { label: "Or", ring: "ring-gold", bg: "bg-gold" },
};

export type BadgeItem = {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  earnedAt: Date | null;
  seen: boolean;
  context: string | null;
};

/** Collection de badges : les nouveaux se débloquent en animation (une fois, pour leur propriétaire). */
export function BadgeGrid({ badges, isOwner }: { badges: BadgeItem[]; isOwner: boolean }) {
  const reduced = useReducedMotion();
  const fresh = useMemo(
    () => (isOwner ? badges.filter((b) => b.earnedAt && !b.seen) : []),
    [badges, isOwner],
  );
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || fresh.length === 0) return;
    announced.current = true;
    toast.badge(
      fresh.length > 1 ? `${fresh.length} nouveaux badges !` : `Nouveau badge : ${fresh[0]!.name}`,
      { description: fresh.length > 1 ? fresh.map((b) => b.name).join(", ") : fresh[0]!.description },
    );
    void markBadgesSeen();
  }, [fresh]);

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {badges.map((b, i) => {
        const Icon = ICONS[b.icon] ?? Award;
        const earned = Boolean(b.earnedAt);
        const isFresh = isOwner && earned && !b.seen;
        return (
          <m.li
            key={b.code}
            initial={
              reduced
                ? { opacity: 0 }
                : isFresh
                  ? { opacity: 0, scale: 0, rotate: -30 }
                  : { opacity: 0, y: 12 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0, y: 0 }}
            transition={
              isFresh ? { ...spring.bouncy, delay: 0.3 + i * 0.05 } : { delay: Math.min(i, 12) * 0.035 }
            }
            className={cn(
              "glass grid justify-items-center gap-2 rounded-2xl p-3 text-center",
              !earned && "opacity-45",
            )}
            title={b.description}
          >
            <span
              className={cn(
                "relative grid size-14 place-items-center rounded-full ring-2",
                earned ? TIER[b.tier].ring : "ring-border",
              )}
            >
              {isFresh && !reduced && (
                <m.span
                  className={cn("absolute inset-0 rounded-full", TIER[b.tier].bg)}
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 1.2, repeat: 2, delay: 0.5 }}
                  aria-hidden
                />
              )}
              {earned ? (
                <Icon className="size-6" aria-hidden />
              ) : (
                <Lock className="text-muted-foreground size-5" aria-hidden />
              )}
            </span>
            <span className="font-condensed text-sm leading-tight font-bold tracking-wide uppercase">
              {b.name}
            </span>
            <span className="text-muted-foreground text-[11px] leading-tight">
              {earned ? `${TIER[b.tier].label} · ${formatDate(b.earnedAt!)}` : b.description}
            </span>
          </m.li>
        );
      })}
    </ul>
  );
}
