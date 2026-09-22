import { defineConfig, devices } from "@playwright/test";

/**
 * `check:community-figures` — ITS OWN CONFIG, ITS OWN NUMBER (`P2-A3-E601` WS-A).
 *
 * ⚠⚠ THE DOCTRINE AGAIN: *"Two configs, two numbers, neither able to hide a
 * regression in the other."* ⚠ `app-shell.config` uses `testIgnore`, so a new
 * spec in `e2e-shell/` is ABSORBED by it and moves its count silently — the
 * `E562` defect. This pins itself with `testMatch` AND is named in that
 * config's `testIgnore`. ⚠⚠⚠ BOTH HALVES ARE REQUIRED: pinning alone still lets
 * the shell suite collect this file and report a bigger number.
 */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B) — a `next dev` left running since before `prisma generate`
     serves 500s from a cached client, and that has been misattributed to a
     branch under test before. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "community-figures.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-shell/.artifacts",
  /* ⚠⚠ NO RETRIES. This gate reconciles rendered text to a database count; a
     retry would turn a real intermittent disagreement into a green run, and
     the disagreement is the whole signal. */
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
