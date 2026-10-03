import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ THE STATUS-HOST REDIRECTS (`E780`/`E781`) ───────────────────────────
 *
 * ⚠⚠⚠ **A PRODUCTION SERVER, AND ON PORT 3103.** `next.config`'s `redirects()`
 * is read at BOOT, so a dev server that was already running would not have them —
 * and the host rules depend on `NODE_ENV === "production"` (`isStatusHost` admits
 * `status.localhost` only outside production).
 * ⚠ **3103 and not 3100**: 3100 is the walk server and is left alone.
 * ⚠ `reuseExistingServer: false` — attaching to a server booted from an older
 * `next.config` is precisely the failure this suite cannot afford.
 */
export default defineConfig({
  testDir: "./e2e-redirects",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3103" },
  outputDir: "./e2e-redirects/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  webServer: {
    command: "npx next start -p 3103",
    url: "http://localhost:3103/status",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
