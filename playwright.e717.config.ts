import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ `E717`'s OWN CONFIG AND DIRECTORY ──────────────────────────────────────
 *
 * ⚠⚠⚠ **NOT IN `e2e-shell/`, FOR `E562`'s REASON:** `playwright.app-shell.config.ts` collects
 * every spec in that directory and names exactly one in its `testIgnore`, so a file dropped
 * there is silently absorbed and **moves `check:app-shell`'s count.**
 */
export default defineConfig({
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-e717",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-e717/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 240_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
