import { defineConfig, devices } from "@playwright/test";

/**
 * `check:app-shell` — ITS OWN CONFIG, AND THAT IS THE POINT.
 *
 * `playwright.config.ts` owns `e2e/` and the marketing-home contract, and its
 * count (54) is quoted in briefs as a thing that must not move. Adding a second
 * spec to that directory would silently change the number every future brief is
 * checked against, so this suite gets its own `testDir` and its own script.
 * Two configs, two numbers, neither able to hide a regression in the other.
 *
 * SIGNED IN, unlike the marketing suite — the shell only exists for an
 * authenticated viewer, which is also why this cannot live in `e2e/`.
 */
export default defineConfig({
  testDir: "./e2e-shell",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e-shell/.artifacts",
  /* ⚠ NO RETRIES — same rule as the marketing suite. A retry turns a real
     intermittent defect into a green run. */
  retries: 0,
  /* One worker: every test drives the same signed-in page through a width
     sweep, and parallel logins to one seeded account is a race for no gain. */
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
