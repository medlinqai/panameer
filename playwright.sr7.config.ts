import { defineConfig, devices } from "@playwright/test";
/**
 * ── ⚠⚠ SUPER RUN 7's OWN SUITE (`E772`–`E779`) ─────────────────────────────
 *
 * ⚠⚠⚠ **IT IS A SEPARATE SUITE SO `check:ui`'s BASELINE STAYS 123.** That number
 * is quoted in briefs and in the handoffs; adding eight lanes' assertions to it
 * would move it silently and every quote of it would quietly stop meaning what it
 * says (`E619`'s lesson, in the other direction).
 * ⚠ Dev server: these pages are PUBLIC marketing surfaces, and `host.ts` only
 * treats localhost as a marketing host when `NODE_ENV !== "production"`.
 */
export default defineConfig({
  testDir: "./e2e-sr7",
  /*
    ⚠⚠ `e774-stage.spec.ts` IS RETIRED BY `E785` AND KEPT ON DISK (`E164`) — its
    subject, the public current-phase stage list, left `/status`. It is now
    comment-only, so it is ignored here rather than collected as a file with no
    tests. ⚠ The rule it asserted is still guarded: `PUBLIC_HIDDEN_STAGES` is
    byte-unchanged and `e2e-tracker/lane-b.spec.ts` still asserts the payload.
  */
  /*
    ⚠⚠ TWO RETIRED SPECS, BOTH KEPT ON DISK (`E164`), both ignored here because
    they are now comment-only:
    · `e774-stage.spec.ts` — the public current-phase stage list left `/status`.
    · `e776-hero.spec.ts` — every test measured a rendered FIGURE, which an
      empty plan does not render. ⚠⚠⚠ Four of its five were already passing
      VACUOUSLY; the rule moved to `e2e-plan/hero.spec.ts`, which can seed the
      plan row that makes a figure exist.
    ⚠ `e777-buildline.spec.ts` is NOT ignored — its pure `assignRows` unit test
    is kept and still runs; only its DOM half is retired in place.
  */
  testIgnore: ["e774-stage.spec.ts", "e776-hero.spec.ts"],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100", screenshot: "only-on-failure" },
  outputDir: "./e2e-sr7/.artifacts",
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
