import { defineConfig, devices } from "@playwright/test";
/** `P2-ALL-E784` — the Plan editor. ⚠ Port 3199: 3100 belongs to the main
 *  checkout's server and 3101 to the tracker suite. */
export default defineConfig({
  testDir: "./e2e-plan",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3199", screenshot: "only-on-failure" },
  outputDir: "./e2e-plan/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: {
    command: "npx next dev -p 3199",
    url: "http://localhost:3199/login",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
