import { defineConfig, devices } from "@playwright/test";
/** `check:profile-height` — its own config, its own number (`E593` WS-B).
 *  ⚠ app-shell.config uses `testIgnore`, so a new spec here is absorbed and
 *  moves its count — the `E562` defect. Pinned with `testMatch` AND named there. */
export default defineConfig({
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B). `reuseExistingServer` below is what makes that possible:
     a `next dev` left running since before `prisma generate` serves 500s from a
     cached client, and two of three red gates on 2026-09-21 were exactly that,
     attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
  testDir: "./e2e-shell",
  testMatch: "profile-height.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure", trace: "retain-on-failure" },
  outputDir: "./e2e-shell/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 120_000,
  webServer: { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000, stdout: "ignore", stderr: "pipe" },
});
