"use client";

import { AnimatePresence, m } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMotionPreset } from "@/hooks/use-motion-preset";
import { duration, spring } from "@/lib/motion";
import { matchLayoutId } from "./match-card";

/**
 * Détail de match en surimpression : le conteneur partage le `layoutId` de la
 * carte, qui se transforme ainsi en page de détail. La fermeture ramène la
 * carte à sa place (retour arrière du routeur).
 */
export function MatchModal({
  matchId,
  title,
  children,
}: {
  matchId: string;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  // Le slot parallèle reste monté après une navigation ailleurs : la modale se retire d'elle-même.
  const active = pathname === `/matchs/${matchId}`;
  const backdrop = useMotionPreset("fadeIn");

  // Après l'animation de sortie, retour à la page d'origine (la carte reprend sa place).
  useEffect(() => {
    if (open || !active) return;
    const timer = window.setTimeout(() => router.back(), duration.fast * 1000 + 40);
    return () => window.clearTimeout(timer);
  }, [open, active, router]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <AnimatePresence>
        {open && active && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div {...backdrop.props} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <m.div
                layoutId={matchLayoutId(matchId, "card")}
                transition={spring.layout}
                exit={{ opacity: 0, transition: { duration: duration.fast } }}
                className="bg-popover border-border fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] bottom-0 z-50 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:top-10 sm:bottom-10 sm:rounded-3xl"
              >
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                <div className="flex justify-end px-3 pt-3">
                  <DialogPrimitive.Close
                    className="hover:bg-accent grid size-10 place-items-center rounded-full"
                    aria-label="Fermer le détail"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.12, duration: duration.base } }}
                  className="safe-bottom flex-1 overflow-y-auto px-5 pb-8 sm:px-8"
                >
                  {children}
                </m.div>
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
