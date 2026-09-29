/**
 * Presets de motion design de PronoFoot.
 *
 * Règles :
 * - on n'anime que `transform` (x, y, scale, rotate) et `opacity` ;
 * - chaque variante a un équivalent « réduit » (fondu seul) utilisé quand
 *   l'utilisateur a activé `prefers-reduced-motion` ;
 * - les composants consomment ces presets plutôt que des valeurs en dur.
 */
import type { Transition, Variants } from "motion/react";

/** Durées en secondes. */
export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
  slower: 0.8,
} as const;

/** Courbes de Bézier cubiques. */
export const ease = {
  /** Expo out — entrées d'éléments. */
  out: [0.16, 1, 0.3, 1],
  /** Déplacements symétriques. */
  inOut: [0.65, 0, 0.35, 1],
  /** Transitions de page. */
  emphasized: [0.2, 0, 0, 1],
  /** Sorties rapides. */
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type EaseName = keyof typeof ease;

/** Ressorts physiques. */
export const spring = {
  /** Boutons, toggles, indicateurs d'onglets. */
  snappy: { type: "spring", stiffness: 500, damping: 32, mass: 0.8 },
  /** But marqué, badge obtenu, toasts. */
  bouncy: { type: "spring", stiffness: 380, damping: 14 },
  /** Cartes, modales, tilt. */
  gentle: { type: "spring", stiffness: 170, damping: 26 },
  /** Réordonnancement de listes et `layoutId`. */
  layout: { type: "spring", stiffness: 350, damping: 35 },
  /** Compteurs animés (points, pourcentages). */
  counter: { type: "spring", stiffness: 90, damping: 20 },
  /** Sélecteur de score façon compteur mécanique. */
  roller: { type: "spring", stiffness: 260, damping: 24 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof spring;

/** Délais de cascade entre enfants. */
export const stagger = {
  fast: 0.035,
  base: 0.06,
  slow: 0.1,
} as const;

/** Nombre maximum d'éléments animés en cascade (au-delà, apparition directe). */
export const STAGGER_LIMIT = 12;

/** Transition standard d'un fondu (utilisée aussi en mouvement réduit). */
export const fade: Transition = { duration: duration.fast, ease: "linear" };

const tween = (d: number, e: EaseName = "out"): Transition => ({ duration: d, ease: ease[e] });

/* -------------------------------------------------------------------------- */
/*                                   Variants                                 */
/* -------------------------------------------------------------------------- */

export const variants = {
  /** Transition entre deux pages : fondu + glissement vertical de 16 px. */
  page: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: tween(duration.base, "emphasized") },
    exit: { opacity: 0, y: -8, transition: tween(duration.fast, "exit") },
  },
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: tween(duration.slow) },
    exit: { opacity: 0, y: 8, transition: tween(duration.fast, "exit") },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: tween(duration.base) },
    exit: { opacity: 0, transition: tween(duration.fast, "exit") },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1, transition: spring.gentle },
    exit: { opacity: 0, scale: 0.96, transition: tween(duration.fast, "exit") },
  },
  /** Conteneur de liste : orchestre la cascade des enfants. */
  listContainer: {
    initial: {},
    animate: { transition: { staggerChildren: stagger.base, delayChildren: 0.04 } },
    exit: {},
  },
  listItem: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: tween(duration.slow) },
    exit: { opacity: 0, transition: tween(duration.fast, "exit") },
  },
  /** Score qui rebondit quand un but est marqué. */
  goalBounce: {
    initial: { scale: 1 },
    // Les ressorts ne gèrent que deux keyframes : on utilise un tween à trois temps.
    animate: { scale: [1, 1.4, 1], transition: { duration: 0.55, ease: ease.out, times: [0, 0.3, 1] } },
  },
  /** Secousse d'un prono raté (400 ms). */
  shake: {
    initial: { x: 0 },
    animate: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4, ease: ease.inOut } },
  },
  /** Déblocage d'un badge. */
  badgeUnlock: {
    initial: { opacity: 0, scale: 0, rotate: -30 },
    animate: { opacity: 1, scale: 1, rotate: 0, transition: spring.bouncy },
  },
  /** Tiroir mobile qui monte depuis le bas. */
  drawerFromBottom: {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0, transition: spring.gentle },
    exit: { opacity: 0, y: "100%", transition: tween(duration.base, "exit") },
  },
  toast: {
    initial: { opacity: 0, y: 40, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1, transition: spring.bouncy },
    exit: { opacity: 0, y: 12, transition: tween(duration.fast, "exit") },
  },
} as const satisfies Record<string, Variants>;

export type VariantName = keyof typeof variants;

/** Transformations neutres, appliquées instantanément (annule toute translation héritée du rendu serveur). */
export const NEUTRAL_TRANSFORM = { x: 0, y: 0, scale: 1, rotate: 0 } as const;
const reducedTransition: Transition = { default: { duration: 0 }, opacity: fade };

function reducedFor(name: VariantName): Variants {
  if (name === "listContainer") return { initial: {}, animate: {}, exit: {} };
  if (name === "goalBounce" || name === "shake") {
    return {
      initial: { opacity: 1, ...NEUTRAL_TRANSFORM },
      animate: { opacity: [0.4, 1], ...NEUTRAL_TRANSFORM, transition: reducedTransition },
    };
  }
  return {
    initial: { opacity: 0, ...NEUTRAL_TRANSFORM },
    animate: { opacity: 1, ...NEUTRAL_TRANSFORM, transition: reducedTransition },
    exit: { opacity: 0, transition: fade },
  };
}

/** Versions réduites : tout devient un simple fondu ; les transformations restent neutres. */
export const reducedVariants = Object.fromEntries(
  (Object.keys(variants) as VariantName[]).map((name) => [name, reducedFor(name)]),
) as Record<VariantName, Variants>;

/** Retourne la variante complète ou réduite. */
export function pickVariants(name: VariantName, reduced: boolean): Variants {
  return reduced ? reducedVariants[name] : variants[name];
}

/** Props prêtes à l'emploi pour un élément `m.*`. */
export function motionProps(name: VariantName, reduced: boolean) {
  return {
    variants: pickVariants(name, reduced),
    initial: "initial",
    animate: "animate",
    exit: "exit",
  } as const;
}

/** Délai de cascade d'un élément (plafonné à STAGGER_LIMIT). */
export function staggerDelay(index: number, step: number = stagger.base): number {
  return Math.min(index, STAGGER_LIMIT) * step;
}

/** Transform CSS de la bande de chiffres du sélecteur de score (1 chiffre = 1em). */
export function rollerOffset(value: number): string {
  return `translateY(${-value}em)`;
}

/** Interactions de press partagées par les boutons. */
export const press = {
  whileTap: { scale: 0.94 },
  whileHover: { scale: 1.02 },
  transition: spring.snappy,
} as const;

/** Amplitude maximale du tilt 3D des cartes (degrés). */
export const TILT_MAX = { x: 10, y: 12 } as const;

/** Calcule la rotation 3D d'une carte à partir de la position relative du pointeur (0 → 1). */
export function tiltFromPointer(px: number, py: number): { rotateX: number; rotateY: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    rotateX: (0.5 - clamp(py)) * 2 * TILT_MAX.x,
    rotateY: (clamp(px) - 0.5) * 2 * TILT_MAX.y,
  };
}
