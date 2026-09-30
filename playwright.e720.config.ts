import { defineConfig, devices } from "@playwright/test";
/**
 * `E720` — the profile leftovers. ⚠ Its OWN config and its own count, for the reason
 * `E593` WS-C gives: `playwright.app-shell.config.ts` collects `e2e-shell` by `testDir`
 * and names its exclusions one by one, so a spec dropped in there silently moves that
 * gate's number — the `E562` defect.
 * ⚠⚠ `reuseExistingServer` so it measures the BUILT server this run started, not a
 * `next dev` it spawns itself.
 */
export default defineConfig({
  testDir: "./e2e-e720",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-e720/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: { command: "npm run start", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
