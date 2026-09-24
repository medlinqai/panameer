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
  /* ⚠⚠⚠ REFUSES A SERVER OLDER THAN THE GENERATED PRISMA CLIENT OR THE BUILD
     (`P0-E595` WS-B). `reuseExistingServer` below is what makes that possible:
     a `next dev` left running since before `prisma generate` serves 500s from a
     cached client, and two of three red gates on 2026-09-21 were exactly that,
     attributed to the branch under test. */
  globalSetup: "./e2e-shell/_app-server-guard.ts",
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
  /* ⚠ `profile-edit-contract.spec.ts` added by `P2-A2-E597` WS-D — it has its
     own config and its own count, so leaving it out would move THIS suite's
     number instead, which is exactly `E562`. */
  /* ⚠ `community-figures.spec.ts` added by `P2-A3-E601` WS-A — its own config,
     its own count, so leaving it out would move THIS suite's number instead,
     which is exactly `E562`. */
  /*
    ── ⚠⚠⚠ `explore-rates.spec.ts` WAS MISSING, AND IT HAD ALREADY BITTEN ────

    ⚠⚠ `P2-A2-E618` added `explore-rates.spec.ts` to this directory WITH its own
    config and its own script (`check:explore-rates`) — and **did not name it
    here**. ⚠⚠⚠ SO THIS SUITE SILENTLY ABSORBED IT AND ITS COUNT MOVED, which is
    `E562` EXACTLY, in the file whose own comment three lines up warns about it.
    ⚠ MEASURED 2026-09-24 at `E619`: `--list` reported **47 tests in 5 files**
    against a contract of **29 in 3**.
    ⚠⚠ IT WENT UNNOTICED BECAUSE THE SUITE STAYED GREEN. A count that moves
    silently does not fail — **it just stops meaning what briefs quote it as**,
    which is why `E562` was found by a deliberate probe rather than by a red.
    ⚠ `groups-page.spec.ts` (`P2-A3-E619` WS-A) is named at the same time, for
    the same reason and before it can repeat it.
  */
  testIgnore: ["connect-walk.spec.ts", "community-web.spec.ts", "community-page.spec.ts", "profile-height.spec.ts", "visitor-profile.spec.ts", "console-errors.spec.ts", "wizard-contract.spec.ts", "profile-edit-contract.spec.ts", "community-figures.spec.ts", "explore-rates.spec.ts", "groups-page.spec.ts"],
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
