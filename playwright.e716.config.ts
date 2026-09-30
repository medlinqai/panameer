import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ `E716`'s OWN CONFIG AND ITS OWN DIRECTORY ──────────────────────────────
 *
 * ⚠⚠⚠ **NOT IN `e2e-shell/`, FOR `E562`'s REASON:** `playwright.app-shell.config.ts` takes
 * every spec in that directory and names exactly one in its `testIgnore`, so a new file there
 * is silently absorbed and **moves `check:app-shell`'s count** — which then reads as a
 * verified baseline on both sides of a stash. A separate `testDir` cannot do that.
 */
export default defineConfig({
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-e716",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-e716/.artifacts",
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
