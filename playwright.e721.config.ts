import { defineConfig, devices } from "@playwright/test";
/**
 * `E721` — its own config and its own number (`E593` WS-C): `app-shell.config` collects
 * `e2e-shell` by `testDir` and names its exclusions one by one, so a spec dropped there
 * silently moves that gate's count (the `E562` defect).
 * ⚠⚠ `reuseExistingServer` so it measures the BUILT server this run started.
 */
export default defineConfig({
  testDir: "./e2e-e721",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-e721/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 240_000,
  webServer: { command: "npm run start", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
