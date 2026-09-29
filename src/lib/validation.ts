import { z } from "zod";

/** Pseudos réservés (routes, rôles, termes ambigus). */
const RESERVED = new Set([
  "admin",
  "administrateur",
  "api",
  "moi",
  "me",
  "root",
  "support",
  "pronofoot",
  "parametres",
  "modifier",
  "connexion",
  "deconnexion",
  "null",
  "undefined",
  "system",
  "systeme",
  "moderateur",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "3 caractères minimum.")
  .max(20, "20 caractères maximum.")
  .regex(/^[a-z0-9_-]+$/, "Lettres minuscules, chiffres, « _ » et « - » uniquement.")
  .refine((v) => !RESERVED.has(v), "Ce pseudo est réservé.");

// Nettoyage avant validation : une adresse collée avec des espaces reste acceptée.
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Adresse e-mail invalide."));

/** Avatar : galerie interne ou fichier envoyé (chemins servis par l'application). */
export const avatarUrlSchema = z
  .string()
  .regex(/^\/(avatars\/maillot-\d{2}\.svg|api\/avatars\/[a-z0-9-]+\.webp)$/, "Avatar invalide.")
  .nullable();

export const profileSchema = z.object({
  username: usernameSchema,
  avatarUrl: avatarUrlSchema,
  favoriteTeamId: z.string().min(1).nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const notificationPrefsSchema = z.object({
  notifyReminders: z.boolean(),
  notifyResults: z.boolean(),
  notifyEmail: z.boolean(),
});

export const leagueSchema = z.object({
  name: z.string().trim().min(3, "3 caractères minimum.").max(40, "40 caractères maximum."),
  description: z.string().trim().max(160, "160 caractères maximum.").optional().default(""),
  emoji: z.string().trim().min(1).max(8).default("⚽"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.")
    .default("#22c55e"),
});

export const predictionSchema = z
  .object({
    matchId: z.string().min(1),
    outcome: z.enum(["HOME", "DRAW", "AWAY"]),
    homeScore: z.number().int().min(0).max(9).nullable(),
    awayScore: z.number().int().min(0).max(9).nullable(),
    isJoker: z.boolean(),
  })
  .refine((v) => (v.homeScore == null) === (v.awayScore == null), {
    message: "Score incomplet.",
    path: ["homeScore"],
  })
  .refine(
    (v) => {
      if (v.homeScore == null || v.awayScore == null) return true;
      const outcome = v.homeScore > v.awayScore ? "HOME" : v.homeScore < v.awayScore ? "AWAY" : "DRAW";
      return outcome === v.outcome;
    },
    { message: "Le score ne correspond pas au résultat choisi.", path: ["outcome"] },
  );
export type PredictionInput = z.infer<typeof predictionSchema>;

/** Premier message d'erreur d'une validation Zod. */
export const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Données invalides.";
