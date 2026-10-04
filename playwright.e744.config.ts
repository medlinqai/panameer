import { defineConfig, devices } from "@playwright/test";
/** `E744` — super run 4 Phase 1 measurement. Read-only. */
export default defineConfig({
  testDir: "./e2e-e744",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure" },
  outputDir: "./e2e-e744/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 240_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
