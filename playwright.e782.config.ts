import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ THE RÉSUMÉ REBUILD PANEL (`P2-ALL-E782`) ────────────────────────────
 * ⚠ Port 3199 (Scott's instruction). :3100 is his walk server and is left alone.
 */
export default defineConfig({
  testDir: "./e2e-e782",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3199" },
  outputDir: "./e2e-e782/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 180_000,
  webServer: {
    /* ⚠⚠ `next start`, NOT `next dev`: Next refuses a second DEV server from the
       same directory, and :3100 is Scott's walk server which must stay up. ⚠ These
       assertions are route- and source-level and are the same on either. */
    command: "npx next start -p 3199",
    url: "http://localhost:3199/login",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
