"use client";

import { AnimatePresence, m } from "motion/react";
import { useSelectedLayoutSegments } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useRef, type ReactNode } from "react";
import { useMotionPreset } from "@/hooks/use-motion-preset";

/**
 * Fige le contexte du routeur pendant l'animation de sortie : sans cela,
 * l'ancienne page afficherait déjà le contenu de la nouvelle route.
 */
function FrozenRouter({ children }: { children: ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return <LayoutRouterContext.Provider value={frozen}>{children}</LayoutRouterContext.Provider>;
}

/**
 * Transition fondu + glissement entre les routes du slot `children`.
 * La clé suit les segments du slot principal : une route interceptée
 * (modale de détail de match) ne déclenche donc pas de transition de page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const key = segments.filter((s) => !s.startsWith("(")).join("/") || "index";
  const { props } = useMotionPreset("page");

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={key} {...props} className="min-w-0">
        <FrozenRouter>{children}</FrozenRouter>
      </m.div>
    </AnimatePresence>
  );
}
