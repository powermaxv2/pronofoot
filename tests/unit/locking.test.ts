import { describe, expect, it } from "vitest";
import {
  PredictionLockedError,
  assertPredictionOpen,
  isLocked,
  isPredictionOpen,
  msUntilLock,
} from "@/server/domain/locking";

const kickoff = new Date("2026-10-03T19:00:00Z");
const scheduled = { kickoffAt: kickoff, status: "SCHEDULED" as const };

describe("verrouillage des pronostics", () => {
  it("est ouvert avant le coup d'envoi", () => {
    const now = new Date("2026-10-03T18:59:59.999Z");
    expect(isPredictionOpen(scheduled, now)).toBe(true);
    expect(() => assertPredictionOpen(scheduled, now)).not.toThrow();
    expect(msUntilLock(scheduled, now)).toBe(1);
  });

  it("est fermé pile au coup d'envoi", () => {
    expect(isPredictionOpen(scheduled, kickoff)).toBe(false);
    expect(() => assertPredictionOpen(scheduled, kickoff)).toThrow(PredictionLockedError);
    expect(msUntilLock(scheduled, kickoff)).toBe(0);
  });

  it("est fermé après le coup d'envoi", () => {
    const now = new Date("2026-10-03T19:30:00Z");
    expect(isLocked(scheduled, now)).toBe(true);
    expect(() => assertPredictionOpen(scheduled, now)).toThrow(/commencé/);
  });

  it("est fermé dès que le match n'est plus programmé, même avant l'heure", () => {
    const early = new Date("2026-10-03T10:00:00Z");
    for (const status of ["LIVE", "HALFTIME", "FINISHED"] as const) {
      expect(isPredictionOpen({ kickoffAt: kickoff, status }, early)).toBe(false);
    }
  });

  it("explique la fermeture d'un match reporté ou annulé", () => {
    const early = new Date("2026-10-01T10:00:00Z");
    expect(() => assertPredictionOpen({ kickoffAt: kickoff, status: "POSTPONED" }, early)).toThrow(
      /reporté ou annulé/,
    );
    expect(() => assertPredictionOpen({ kickoffAt: kickoff, status: "CANCELLED" }, early)).toThrow(
      PredictionLockedError,
    );
  });
});
