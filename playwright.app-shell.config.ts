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
  /*
    ── ⚠⚠ PINNED TO ITS OWN SPEC (`P2-J3-E567` WS-B) ─────────────────────────

    ⚠ `E567` ADDS A SECOND SPEC TO THIS DIRECTORY (`connect-walk.spec.ts`), and
    without this line `testDir` would absorb it — silently moving the 29 that
    briefs are checked against. ⚠⚠ THAT IS THE EXACT FAILURE THE DOCBLOCK ABOVE
    DESCRIBES, one level down: *"Two configs, two numbers, neither able to hide a
    regression in the other."*
    ⚠ ADDED, NOT SUPERSEDED — nothing here changed meaning; the file simply had
    no need to say which specs it owned while it owned all of them.
    ⚠ The walk has its own config and its own script, `check:connect-walk`.

    ⚠⚠ `testIgnore`, NOT `testMatch`, AND THE DIFFERENCE WAS MEASURED. The 29 is
    NOT all from `app-shell.spec.ts` — this directory holds THREE specs
    (`app-shell` 22, plus `public-allowlist` and `unbuilt-counters`). Pinning to
    one spec reported 22 and would have silently dropped seven assertions,
    including the public allowlist. ⚠ EXCLUDING THE NEW FILE KEEPS EVERY
    EXISTING ONE, which is what "29 must stay 29" actually protects.
  */
  /* ⚠⚠ EVERY SIBLING SUITE MUST BE NAMED HERE. `testIgnore` collects any
     spec it does NOT list, so a new file in this directory joins the shell
     contract silently and moves its count — measured on `E562`, which read
     30 for a session because of a scratch spec. ⚠ `community-web.spec.ts`
     added by `P2-J3-E591` WS-B. */
  testIgnore: ["connect-walk.spec.ts", "community-web.spec.ts"],
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
