import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ THE FOLLOW ROUND TRIP ON THE STATUS HOST (`E781`) ───────────────────
 *
 * ⚠⚠⚠ **A DEV SERVER, AND THAT IS FORCED BY THE CODE, NOT A PREFERENCE.**
 * `isStatusHost()` admits `status.localhost` **only when `NODE_ENV !==
 * "production"`** — so the signed-in status-host flow is simply not reachable on a
 * production build locally. ⚠ `E780`'s own suite is the opposite case and runs
 * against `next start`; the two configs exist because the two lanes need
 * different halves of that gate.
 * ⚠ Port 3104: 3100 is the walk server and 3103 is `E780`'s production server.
 */
export default defineConfig({
  testDir: "./e2e-followhop",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://status.localhost:3104" },
  outputDir: "./e2e-followhop/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  webServer: {
    command: "npx next dev -p 3104",
    url: "http://localhost:3104/login",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
