import { defineConfig, devices } from "@playwright/test";

// check:logo-fit — wide, tall and square logos show whole on every company surface.
export default defineConfig({
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-r1",
  testMatch: "logo-fit.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100" },
  outputDir: "./e2e-r1/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
