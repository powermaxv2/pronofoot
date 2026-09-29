import { headers } from "next/headers";
import { env } from "@/lib/env";

type Window = { hits: number[] };

const buckets = new Map<string, Window>();
let lastSweep = Date.now();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export const LIMITS = {
  /** Enregistrement / modification de pronostics. */
  prediction: { max: 30, windowMs: 60_000 },
  /** Demandes de lien magique (par IP + e-mail). */
  magicLink: { max: 5, windowMs: 15 * 60_000 },
  /** Lectures d'API (polling). */
  read: { max: 120, windowMs: 60_000 },
  /** Actions diverses (ligues, profil, upload). */
  write: { max: 20, windowMs: 60_000 },
  /** Déclenchements manuels de l'admin. */
  admin: { max: 10, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Limiteur à fenêtre glissante en mémoire (instance unique, adapté au
 * déploiement Raspberry Pi). Les entrées expirées sont purgées périodiquement.
 */
export function rateLimit(name: LimitName, key: string, now = Date.now()): RateLimitResult {
  if (env().RATE_LIMIT_DISABLED) return { ok: true };
  const { max, windowMs } = LIMITS[name];
  const id = `${name}:${key}`;
  const bucket = buckets.get(id) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= max) {
    buckets.set(id, bucket);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.hits[0]! + windowMs - now) / 1000)) };
  }
  bucket.hits.push(now);
  buckets.set(id, bucket);
  if (now - lastSweep > 5 * 60_000) sweep(now);
  return { ok: true };
}

function sweep(now: number) {
  lastSweep = now;
  const longest = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
  for (const [id, bucket] of buckets) {
    if (bucket.hits.every((t) => now - t >= longest)) buckets.delete(id);
  }
}

/** Réinitialise le limiteur (tests). */
export function resetRateLimits() {
  buckets.clear();
}

/** Adresse IP du client (derrière reverse proxy : X-Forwarded-For). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export class RateLimitError extends Error {
  constructor(readonly retryAfterSec: number) {
    super(`Doucement ! Trop de tentatives, réessayez dans ${retryAfterSec} s.`);
    this.name = "RateLimitError";
  }
}

/** Lève RateLimitError si la limite est atteinte. */
export function assertRateLimit(name: LimitName, key: string) {
  const result = rateLimit(name, key);
  if (!result.ok) throw new RateLimitError(result.retryAfterSec);
}
