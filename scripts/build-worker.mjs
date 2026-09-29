// Compile le worker (tâches planifiées) en un seul fichier ESM exécutable par Node.
import { build } from "esbuild";

await build({
  entryPoints: ["src/worker/index.ts"],
  outfile: "dist/worker.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  // Dépendances natives ou générées : résolues à l'exécution depuis node_modules.
  external: ["@prisma/client", ".prisma/client", "sharp"],
  alias: { "server-only": "./src/worker/server-only-stub.ts" },
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: "info",
});
