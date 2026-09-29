import { describe, expect, it } from "vitest";
import {
  STAGGER_LIMIT,
  reducedVariants,
  rollerOffset,
  spring,
  stagger,
  staggerDelay,
  tiltFromPointer,
  TILT_MAX,
  variants,
} from "@/lib/motion";

const ANIMATABLE = new Set(["opacity", "x", "y", "scale", "rotate", "rotateX", "rotateY", "transition"]);

function keysOf(target: unknown): string[] {
  return target && typeof target === "object" ? Object.keys(target) : [];
}

describe("lib/motion", () => {
  it("n'anime que transform et opacity dans tous les variants", () => {
    for (const [name, v] of Object.entries(variants)) {
      for (const state of Object.values(v)) {
        for (const key of keysOf(state)) {
          expect(ANIMATABLE.has(key), `${name} anime ${key}`).toBe(true);
        }
      }
    }
  });

  it("réduit chaque variant à un simple fondu (aucune translation ni échelle)", () => {
    for (const [name, v] of Object.entries(reducedVariants)) {
      for (const state of Object.values(v)) {
        const keys = keysOf(state).filter((k) => k !== "transition");
        expect(
          keys.every((k) => k === "opacity"),
          `${name} : ${keys.join(",")}`,
        ).toBe(true);
      }
    }
    expect(Object.keys(reducedVariants).sort()).toEqual(Object.keys(variants).sort());
  });

  it("déclare des ressorts physiquement plausibles", () => {
    for (const s of Object.values(spring)) {
      expect(s.type).toBe("spring");
      expect(s.stiffness).toBeGreaterThan(0);
      expect(s.damping).toBeGreaterThan(0);
    }
    // Le rebond du but doit être plus « élastique » que le réordonnancement.
    expect(spring.bouncy.damping).toBeLessThan(spring.layout.damping);
  });

  it("plafonne le délai de cascade", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBeCloseTo(3 * stagger.base);
    expect(staggerDelay(500)).toBeCloseTo(STAGGER_LIMIT * stagger.base);
  });

  it("calcule le décalage du rouleau de score", () => {
    expect(rollerOffset(0)).toBe("translateY(0em)");
    expect(rollerOffset(3)).toBe("translateY(-3em)");
  });

  it("borne l'inclinaison 3D", () => {
    expect(tiltFromPointer(0.5, 0.5)).toEqual({ rotateX: 0, rotateY: 0 });
    expect(tiltFromPointer(1, 0)).toEqual({ rotateX: TILT_MAX.x, rotateY: TILT_MAX.y });
    expect(tiltFromPointer(5, -3)).toEqual({ rotateX: TILT_MAX.x, rotateY: TILT_MAX.y });
    expect(tiltFromPointer(0, 1)).toEqual({ rotateX: -TILT_MAX.x, rotateY: -TILT_MAX.y });
  });
});
