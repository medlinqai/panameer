import { defineConfig, devices } from "@playwright/test";

/**
 * `check:community-web-ui` — ITS OWN CONFIG, ITS OWN NUMBER (`P2-J3-E591` WS-B).
 *
 * ⚠⚠ THE THIRD APPLICATION OF THE DOCTRINE `playwright.app-shell.config.ts`
 * STATES: *"Two configs, two numbers, neither able to hide a regression in the
 * other."* ⚠ The shell contract's count is quoted in briefs, and
 * `app-shell.config` uses `testIgnore`, NOT `testMatch` — so a new spec dropped
 * into `e2e-shell/` is ABSORBED BY IT and moves that number silently.
 *
 * ⚠⚠⚠ THAT IS NOT HYPOTHETICAL: it is exactly how `E562` read 30 instead of 29
 * for a whole session, from a scratch spec left in this directory. ⚠ So this
 * suite pins itself with `testMatch` AND is named in the shell config's
 * `testIgnore` — both halves, because either alone leaves the other config free
 * to collect it.
 *
 * ⚠ It shares `e2e-shell/` for the same reason the Connect walk does: the
 * sign-in helper lives there, and one helper with three callers beats three
 * that drift.
 */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B). `reuseExistingServer` below is what makes that possible:
     a `next dev` left running since before `prisma generate` serves 500s from a
     cached client, and two of three red gates on 2026-09-21 were exactly that,
     attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "community-web.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-shell/.artifacts",
  /* ⚠ NO RETRIES — the same rule as the other three suites. */
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
