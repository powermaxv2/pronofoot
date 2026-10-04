import { defineConfig, devices } from "@playwright/test";

/**
 * Tests end-to-end : base dédiée (seedée à chaque lancement), serveur SMTP de
 * test pour les liens magiques, application en mode production.
 * Prérequis : `pnpm build`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_DATABASE_URL =
  process.env.DATABASE_URL_E2E ?? "postgresql://postgres:postgres@localhost:5432/pronofoot_e2e";
export const SMTP = { smtp: 2525, http: 2580 };

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
  ],
  webServer: [
    {
      command: "pnpm exec tsx tests/e2e/smtp-sink.ts",
      url: `http://localhost:${SMTP.http}/messages`,
      reuseExistingServer: !process.env.CI,
      env: { SMTP_SINK_PORT: String(SMTP.smtp), SMTP_SINK_HTTP_PORT: String(SMTP.http) },
    },
    {
      command: `pnpm start -p ${PORT}`,
      url: `http://localhost:${PORT}/hors-ligne`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        APP_URL: `http://localhost:${PORT}`,
        AUTH_URL: `http://localhost:${PORT}`,
        AUTH_SECRET: "e2e-secret-not-for-production-0123456789",
        AUTH_TRUST_HOST: "true",
        EMAIL_SERVER: `smtp://localhost:${SMTP.smtp}`,
        EMAIL_FROM: "PronoFoot <no-reply@pronofoot.local>",
        ADMIN_EMAILS: "admin@pronofoot.local",
        RATE_LIMIT_DISABLED: "true",
        API_FOOTBALL_KEY: "",
        FOOTBALL_DATA_KEY: "",
        UPLOAD_DIR: "./data/e2e-uploads",
      },
    },
  ],
});
