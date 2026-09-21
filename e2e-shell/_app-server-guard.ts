import { assertServerFresh } from "../e2e/_server-freshness";

/**
 * ── ⚠⚠ THE APP-SHELL FAMILY'S `globalSetup` (`P0-E595` WS-B) ───────────────
 *
 * ⚠ SCOTT, 2026-09-21: *"Gates must never reuse a server older than the current
 * Prisma client or build. Extend `_dev-server-guard.ts` to every Playwright
 * config, or set `reuseExistingServer: false` for gate runs."*
 *
 * ⚠⚠ THE GUARD WAS EXTENDED, NOT `reuseExistingServer` TURNED OFF — the reasons
 * are recorded in the commit and in `_server-freshness.ts`. The freshness check
 * itself is SHARED, so all seven suites refuse the same server for the same
 * reason and there is one definition to keep true.
 *
 * ⚠⚠⚠ THIS FILE EXISTS RATHER THAN POINTING THESE CONFIGS AT
 * `e2e/_dev-server-guard.ts` BECAUSE THAT GUARD ALSO REQUIRES `/` TO SERVE THE
 * MARKETING HOME, and that assertion is TRUE ONLY FOR `check:ui`. `host.ts:71`
 * makes localhost a marketing host only when `NODE_ENV !== "production"`, so
 * pointing the app-shell suites at it would fail them against a perfectly good
 * production server — a guard inventing its own false positive.
 * ⚠ These suites test SIGNED-IN pages and do not care which host `/` serves.
 */
export default async function guardAppServer() {
  await assertServerFresh(3100);
}
