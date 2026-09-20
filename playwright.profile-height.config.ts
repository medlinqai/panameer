import { defineConfig, devices } from "@playwright/test";
/** `check:profile-height` — its own config, its own number (`E593` WS-B).
 *  ⚠ app-shell.config uses `testIgnore`, so a new spec here is absorbed and
 *  moves its count — the `E562` defect. Pinned with `testMatch` AND named there. */
export default defineConfig({
  testDir: "./e2e-shell",
  testMatch: "profile-height.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-shell/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 120_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
