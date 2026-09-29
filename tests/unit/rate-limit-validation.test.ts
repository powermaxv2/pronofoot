import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
process.env.DATABASE_URL ??= "postgresql://localhost/unit";

const { rateLimit, resetRateLimits, LIMITS } = await import("@/server/rate-limit");
const { predictionSchema, profileSchema, usernameSchema, emailSchema } = await import("@/lib/validation");

describe("rate limiting (fenêtre glissante)", () => {
  beforeEach(() => resetRateLimits());

  it("bloque au-delà du maximum puis libère après la fenêtre", () => {
    const { max, windowMs } = LIMITS.magicLink;
    const t0 = 1_000_000;
    for (let i = 0; i < max; i++) expect(rateLimit("magicLink", "ip:a@b.fr", t0 + i).ok).toBe(true);
    const blocked = rateLimit("magicLink", "ip:a@b.fr", t0 + max);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
    // Une autre clé n'est pas affectée.
    expect(rateLimit("magicLink", "ip:c@d.fr", t0 + max).ok).toBe(true);
    // Après la fenêtre, les anciennes requêtes sortent du compte.
    expect(rateLimit("magicLink", "ip:a@b.fr", t0 + windowMs + 1).ok).toBe(true);
  });
});

describe("validation des saisies", () => {
  it("valide les pseudos", () => {
    expect(usernameSchema.parse("  Lea_OL ")).toBe("lea_ol");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("léa").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("valide les e-mails", () => {
    expect(emailSchema.parse(" Lea@Exemple.FR ")).toBe("lea@exemple.fr");
    expect(emailSchema.safeParse("pas-un-mail").success).toBe(false);
  });

  it("n'accepte que des avatars servis par l'application", () => {
    const base = { username: "lea_ol", favoriteTeamId: null };
    expect(profileSchema.safeParse({ ...base, avatarUrl: "/avatars/maillot-03.svg" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, avatarUrl: "/api/avatars/abc-123.webp" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, avatarUrl: "https://evil.example/x.png" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, avatarUrl: "/api/avatars/../../etc.webp" }).success).toBe(false);
  });

  it("exige un score complet et cohérent avec le 1N2", () => {
    const base = { matchId: "m1", isJoker: false };
    expect(predictionSchema.safeParse({ ...base, outcome: "HOME", homeScore: 2, awayScore: 1 }).success).toBe(true);
    expect(predictionSchema.safeParse({ ...base, outcome: "DRAW", homeScore: null, awayScore: null }).success).toBe(true);
    expect(predictionSchema.safeParse({ ...base, outcome: "AWAY", homeScore: 2, awayScore: 1 }).success).toBe(false);
    expect(predictionSchema.safeParse({ ...base, outcome: "HOME", homeScore: 2, awayScore: null }).success).toBe(false);
    expect(predictionSchema.safeParse({ ...base, outcome: "HOME", homeScore: 12, awayScore: 1 }).success).toBe(false);
  });
});
