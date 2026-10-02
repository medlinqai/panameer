import { defineConfig, devices } from "@playwright/test";
/** `P2-ALL-E752`/`E753` — Work Tracker verification. ⚠ Port 3101: the main
 *  checkout's server owns 3100 and another session may be using it. */
export default defineConfig({
  testDir: "./e2e-tracker",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3101", screenshot: "only-on-failure" },
  outputDir: "./e2e-tracker/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: {
    command: "npx next dev -p 3101",
    url: "http://localhost:3101/login",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
