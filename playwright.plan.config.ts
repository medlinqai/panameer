import { defineConfig, devices } from "@playwright/test";

/**
 * THE PLAN SUITE (`P2-ALL-E784`, isolated by `P2-ALL-E804`).
 *
 * Scott, 2026-10-03: "no test may read or write the panameer-build plan, ever
 * again."
 *
 * So this suite runs its OWN server with `PLAN_OWNER_KEY` set, and `/status`
 * there renders the throwaway plan the specs create. Port 3198 of its own, and
 * `reuseExistingServer: false` — reusing the shared 3199 server would silently
 * give these tests the LIVE plan, which is the exact failure being removed.
 *
 * `TEST_OWNER` in `e2e-plan/_plan-state.ts` must match the value below.
 */
const TEST_PLAN_OWNER = "e2e-plan-throwaway";

export default defineConfig({
  testDir: "./e2e-plan",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3198", screenshot: "only-on-failure" },
  outputDir: "./e2e-plan/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
  webServer: {
    command: `npx next dev -p 3198`,
    url: "http://localhost:3198/login",
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
    env: { PLAN_OWNER_KEY: TEST_PLAN_OWNER },
  },
});
