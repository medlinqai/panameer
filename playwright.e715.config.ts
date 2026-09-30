import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ `E715`'s OWN CONFIG AND ITS OWN DIRECTORY ──────────────────────────────
 *
 * ⚠⚠⚠ **IT DOES NOT LIVE IN `e2e-shell/`, AND THAT IS `E562`'s LESSON PAID FORWARD.**
 * `playwright.app-shell.config.ts` has `testDir: "./e2e-shell"` and a `testIgnore` naming
 * exactly one file, so **any new spec dropped in there is collected and silently moves
 * `check:app-shell`'s count** — which then reads as a verified baseline on both sides of a
 * stash. ⚠ A separate `testDir` cannot do that.
 * ⚠ It reuses the same server guard every other suite uses, so a `next dev` older than the
 * generated Prisma client refuses to attach rather than serving 500s that read as a red gate.
 */
export default defineConfig({
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-e715",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-e715/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 180_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
