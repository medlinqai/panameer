import { defineConfig, devices } from "@playwright/test";
/*
  ⚠⚠ THE SAME SHAPE AS `playwright.stats-live.config.ts` (`E606`): it starts a
  server only if none is listening and REUSES the one the other runtime gates
  already started, so this gate runs inside `npm run sweep` rather than
  reddening environmentally. ⚠ A gate that cannot run inside the sweep is not a
  gate.
  ⚠ `.env.local` is loaded because the suite signs in, which needs the database.
*/
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e-settings",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: [["list"]],
  timeout: 120_000,
  use: { baseURL: "http://localhost:3100", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
