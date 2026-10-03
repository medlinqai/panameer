import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ SUPER RUN 7's OWN SUITE (`E772`–`E779`) ─────────────────────────────
 *
 * ⚠⚠⚠ **IT IS A SEPARATE SUITE SO `check:ui`'s BASELINE STAYS 123.** That number
 * is quoted in briefs and in the handoffs; adding eight lanes' assertions to it
 * would move it silently and every quote of it would quietly stop meaning what it
 * says (`E619`'s lesson, in the other direction).
 * ⚠ Dev server: these pages are PUBLIC marketing surfaces, and `host.ts` only
 * treats localhost as a marketing host when `NODE_ENV !== "production"`.
 */
export default defineConfig({
  testDir: "./e2e-sr7",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure" },
  outputDir: "./e2e-sr7/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
