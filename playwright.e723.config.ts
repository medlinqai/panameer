import { defineConfig, devices } from "@playwright/test";
/** `E723` — its own config and its own count (`E593` WS-C / the `E562` defect). */
export default defineConfig({
  testDir: "./e2e-e723",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-e723/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 240_000,
  webServer: { command: "npm run start", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
