import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est obligatoire"),
  APP_URL: z.url().default("http://localhost:3000"),
  AUTH_SECRET: optionalString,
  EMAIL_SERVER: optionalString,
  EMAIL_FROM: z.string().default("PronoFoot <no-reply@pronofoot.local>"),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  API_FOOTBALL_KEY: optionalString,
  API_FOOTBALL_DAILY_BUDGET: z.coerce.number().int().positive().default(90),
  FOOTBALL_DATA_KEY: optionalString,
  FOOTBALL_DATA_MINUTE_BUDGET: z.coerce.number().int().positive().default(9),
  FOOTBALL_LIVE_PROVIDER: z.enum(["football-data", "api-football"]).default("football-data"),
  FOOTBALL_SEASON: z.coerce.number().int().min(2020).max(2100).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: z.string().default("mailto:admin@pronofoot.local"),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  CRON_ENABLED: bool,
  RATE_LIMIT_DISABLED: bool,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/** Variables d'environnement serveur validées (lecture paresseuse, mise en cache). */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Réinitialise le cache (tests). */
export function resetEnvCache() {
  cached = undefined;
}

export const features = {
  google: () => Boolean(env().AUTH_GOOGLE_ID && env().AUTH_GOOGLE_SECRET),
  email: () => Boolean(env().EMAIL_SERVER),
  push: () => Boolean(env().NEXT_PUBLIC_VAPID_PUBLIC_KEY && env().VAPID_PRIVATE_KEY),
  apiFootball: () => Boolean(env().API_FOOTBALL_KEY),
  footballData: () => Boolean(env().FOOTBALL_DATA_KEY),
};
