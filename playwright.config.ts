import { defineConfig, devices } from "@playwright/test";

/**
 * THE BEHAVIOUR GATE — one spec, one contract.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * The repo's `check:*` harnesses all test LOGIC, and every one of them would
 * have passed while `P1-J0-E097` shipped: a <button> inside a <button>, which
 * is invisible to assistive tech, unreachable by pointer, still in the tab
 * order, and silently eats the Enter that opens the card. Nothing that runs in
 * Node can see that. It needs a browser.
 *
 * ── SCOPE IS DELIBERATELY ONE PAGE ───────────────────────────────────────────
 *
 * `/` only, and only the card→lightbox dialog contract. Not visual regression,
 * not screenshot diffing, not a second test framework spreading across the app.
 * A harness that tries to cover everything on day one is a harness that gets
 * abandoned in a month.
 */
export default defineConfig({
  testDir: "./e2e",

  /*
    CHROMIUM ONLY. A marketing page does not justify tripling the run across
    Firefox and WebKit — and the things this asserts (focus order, dialog roles,
    DOM nesting) are not engine-specific. If a rendering bug ever turns out to
    be engine-specific, that is the day to add a project, not before.
  */
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  use: {
    baseURL: "http://localhost:3100",
    /* Failure evidence only. Nothing here is committed — see .gitignore. */
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  outputDir: "./e2e/.artifacts",

  /*
    ⚠ NO RETRIES, LOCALLY OR ANYWHERE.
    A retry turns a real intermittent defect into a green run. WS-3 forbids
    `waitForTimeout` for the same reason: the suite has to stay trustworthy or
    it stops being read. If something here is flaky, that is a finding.
  */
  retries: 0,
  reporter: [["list"]],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    /*
      REUSE A RUNNING DEV SERVER. Scott usually has `npm run dev` up on 3100;
      without this the harness would fail to bind the port and look broken.
    */
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
