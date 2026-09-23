import { defineConfig, devices } from "@playwright/test";
/*
  ── ⚠⚠⚠ THIS CONFIG EXISTS SO THE GATE CAN RUN INSIDE THE SWEEP ──────────

  ⚠ `check:stats-live` was a standalone node script that assumed a server was
  already listening on **:3199** — a port nothing in the harness starts. Inside
  `npm run sweep` it therefore went RED EVERY TIME, in about two seconds,
  without running a single assertion.
  ⚠⚠ A GATE THAT CANNOT RUN INSIDE THE SWEEP IS NOT A GATE. Sixteen of E603's
  live assertions were protecting nothing, while a green-looking sweep line
  implied they had run.

  ⚠⚠⚠ THE FIX IS TO STOP OWNING A PORT AND JOIN THE HARNESS. Playwright's
  `webServer` starts a server if none is there and REUSES the one the other
  runtime gates already started, and it tears its own down afterwards. **No
  second dev server, because two of them share one `.next` and fight.**

  ⚠ `.env.local` IS LOADED HERE for the same reason `playwright.config.ts`
  loads it: this suite seeds and tears down rows, so the TEST process needs the
  database, not only the web server.
*/
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e-stats",
  fullyParallel: false,
  /* ⚠⚠ ONE WORKER. The suite seeds rows for a named persona and tears them
     down; two workers would seed the same persona twice and each would see the
     other's rows. */
  workers: 1,
  forbidOnly: true,
  reporter: [["list"]],
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
