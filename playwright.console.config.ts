import { defineConfig, devices } from "@playwright/test";
/** `check:console` — no page in the WS-C walk logs a console error (`P0-E595` WS-C).
 *  ⚠ Its own config and its own number, for the reason `app-shell.config.ts`
 *  records: that config uses `testIgnore`, so a spec left unnamed there is
 *  absorbed into the shell contract and silently moves its count (`E562`).
 *  ⚠⚠ THIS SPEC IS NAMED IN `playwright.app-shell.config.ts`'s `testIgnore` TOO
 *  — both halves are required, and one without the other is the bug. */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B) — a stale `next dev` serves 500s from a cached client and
     the failure gets attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "console-errors.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-shell/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
