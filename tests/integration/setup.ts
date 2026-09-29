import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

// Garde-fou : ce fichier vide les tables, il ne doit tourner que sur une base de test.
if (!/test/i.test(new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname)) {
  throw new Error("Les tests d'intégration exigent une base dont le nom contient « test ».");
}

beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
