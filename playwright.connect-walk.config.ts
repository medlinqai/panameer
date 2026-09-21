import { defineConfig, devices } from "@playwright/test";

/**
 * `check:connect-walk` — ITS OWN CONFIG, ITS OWN NUMBER (`P2-J3-E567` WS-B).
 *
 * ⚠⚠ THE SAME DOCTRINE `playwright.app-shell.config.ts` STATES, ONE LEVEL DOWN:
 * *"Two configs, two numbers, neither able to hide a regression in the other."*
 * The shell contract's 29 is quoted in briefs; folding the Connect walk into it
 * would move that number for a reason unrelated to the shell.
 *
 * ⚠ IT SHARES `e2e-shell/` because it shares the SIGN-IN — `_auth.ts` lives
 * there and one helper with two callers is the point of `E567` WS-A. ⚠ Each
 * config pins its own spec with `testMatch`, so the directory holds two suites
 * without either absorbing the other.
 *
 * ⚠ SIGNED IN, like the shell suite: the five Connect pages are auth-gated,
 * which is why `check:ui` cannot reach them and this exists at all.
 */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B). `reuseExistingServer` below is what makes that possible:
     a `next dev` left running since before `prisma generate` serves 500s from a
     cached client, and two of three red gates on 2026-09-21 were exactly that,
     attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "connect-walk.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-shell/.artifacts",
  /* ⚠ NO RETRIES — the same rule as both other suites. A retry turns a real
     intermittent defect into a green run, and this suite exists to catch
     regressions in empty states that nothing else watches. */
  retries: 0,
  /* One worker: every test drives the same signed-in page. */
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
