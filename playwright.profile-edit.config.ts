import { defineConfig, devices } from "@playwright/test";
/** `check:profile-edit` — the `P2-A2-E597` WS-D shape gate.
 *  ⚠⚠ ITS WHOLE PURPOSE IS TO READ THE SAME NUMBER BEFORE AND AFTER THE
 *  REFACTOR, so it gets its own config and its own count. A spec absorbed into
 *  another suite's `testIgnore` moves that suite's number instead (`E562`).
 *  ⚠ NAMED IN `playwright.app-shell.config.ts`'s `testIgnore` too — both halves
 *  are required, and one without the other is the bug. */
export default defineConfig({
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "profile-edit-contract.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-shell/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
