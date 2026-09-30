"use client";

import { m, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";
import { useMotionPreset } from "@/hooks/use-motion-preset";
import { STAGGER_LIMIT, stagger } from "@/lib/motion";

type StaggerListProps = HTMLMotionProps<"div"> & { step?: number; as?: "div" | "ul" | "ol" };

/** Conteneur qui fait apparaître ses enfants `StaggerItem` en cascade. */
export function StaggerList({ step = stagger.base, children, ...rest }: StaggerListProps) {
  const { reduced } = useMotionPreset("listContainer");
  return (
    <m.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: reduced ? {} : { transition: { staggerChildren: step, delayChildren: 0.04 } },
        exit: {},
      }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

type StaggerItemProps = HTMLMotionProps<"div"> & { index?: number };

/**
 * Élément de liste en cascade. Au-delà de STAGGER_LIMIT, l'élément apparaît
 * sans délai supplémentaire pour ne jamais faire attendre l'utilisateur.
 */
export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(function StaggerItem(
  { index = 0, ...rest },
  ref,
) {
  const { variants } = useMotionPreset("listItem");
  const beyond = index >= STAGGER_LIMIT;
  return <m.div ref={ref} variants={beyond ? undefined : variants} {...rest} />;
});

/** Apparition au scroll (une seule fois). */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { reduced, variants } = useMotionPreset("fadeUp");
  return (
    <m.div
      className={className}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={variants}
      transition={reduced ? undefined : { delay }}
    >
      {children}
    </m.div>
  );
}
