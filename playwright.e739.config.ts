import { defineConfig, devices } from "@playwright/test";
/** `E739` — measurement harness for Scott's 2026-10-01 phone walk. */
export default defineConfig({
  testDir: "./e2e-e739",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure" },
  outputDir: "./e2e-e739/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 240_000,
  webServer: { command: "npm run start", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
