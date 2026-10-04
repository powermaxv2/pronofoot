import { execSync } from "node:child_process";

/**
 * Applique les migrations sur la base de test (non destructif).
 * Les tables sont vidées avant chaque test par `setup.ts`.
 */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "postgresql://postgres:postgres@localhost:5432/pronofoot_test";
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Refus d'utiliser une base dont le nom ne contient pas « test » : ${url}`);
  }
  execSync("pnpm prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
