import { defineConfig, devices } from "@playwright/test";
/** `E761`/`E762` — ticket history + the preview bar. ⚠ Port 3102: 3100 is the
 *  main checkout and 3101 is the tracker worktree. */
export default defineConfig({
  testDir: "./e2e-support",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3102", screenshot: "only-on-failure" },
  outputDir: "./e2e-support/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: {
    command: "npx next dev -p 3102",
    url: "http://localhost:3102/login",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
