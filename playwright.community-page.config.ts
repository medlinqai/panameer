import { defineConfig, devices } from "@playwright/test";

/**
 * `check:community-page-ui` — ITS OWN CONFIG, ITS OWN NUMBER (`E591` WS-C).
 *
 * ⚠⚠ THE FOURTH APPLICATION OF THE DOCTRINE: *"Two configs, two numbers,
 * neither able to hide a regression in the other."* ⚠ `app-shell.config` uses
 * `testIgnore`, so a new spec in `e2e-shell/` is ABSORBED by it and moves its
 * count silently — the `E562` defect. This pins itself with `testMatch` AND is
 * named in that config's `testIgnore`.
 */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B). `reuseExistingServer` below is what makes that possible:
     a `next dev` left running since before `prisma generate` serves 500s from a
     cached client, and two of three red gates on 2026-09-21 were exactly that,
     attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "community-page.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-shell/.artifacts",
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
