import { defineConfig, devices } from "@playwright/test";
/** `P2-ALL-E793`+ — the admin-data lanes (E3 · E1 · E2 · E4). ⚠ Port 3199: the
 *  main checkout owns 3100 and the tracker suite 3101. */
export default defineConfig({
  testDir: "./e2e-admin",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3199", screenshot: "only-on-failure" },
  outputDir: "./e2e-admin/.artifacts",
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
