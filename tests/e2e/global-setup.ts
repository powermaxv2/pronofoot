import { execSync } from "node:child_process";

/** Base e2e : migrations puis jeu de données complet (le nom de la base doit contenir « e2e » ou « test »). */
export default function globalSetup() {
  const url = process.env.DATABASE_URL_E2E ?? "postgresql://postgres:postgres@localhost:5432/pronofoot_e2e";
  if (!/(e2e|test)/i.test(new URL(url).pathname)) throw new Error(`Base e2e refusée : ${url}`);
  const env = {
    ...process.env,
    DATABASE_URL: url,
    SEED_RESET: "true",
    ADMIN_EMAILS: "admin@pronofoot.local",
  };
  execSync("pnpm prisma migrate deploy", { stdio: "pipe", env });
  execSync("pnpm prisma db seed", { stdio: "pipe", env });
}
