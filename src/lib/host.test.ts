/**
 * The host split, proved (brief_marketing_home_localhost).
 *
 *   npm run check:host
 *
 * WHY THIS EXISTS. The change under test widens who may be served a public
 * marketing page at `/`, and the failure mode is invisible: nothing errors, a
 * live environment just quietly starts showing a marketing front door instead
 * of the app. Nobody walks Vercel preview URLs looking for that. So the
 * production behaviour is asserted rather than reasoned about.
 *
 * `NODE_ENV` is set per-case here because the whole point is that the answer
 * DIFFERS between builds — a test that only ran in one mode would prove the
 * less interesting half.
 */
import { isMarketingHost, isStatusHost, normalizeHost } from "./host";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label} — expected ${expected}, got ${actual}`);
  }
}

/**
 * `NODE_ENV` is readonly in the Node types and Next inlines it at build time;
 * in this bundled harness it is a plain property, so the cast is the honest way
 * to say "this test drives the thing the compiler thinks is a constant".
 */
function withEnv(env: string, run: () => void) {
  const before = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = env;
  try {
    run();
  } finally {
    (process.env as Record<string, string>).NODE_ENV = before as string;
  }
}

console.log("\nnormalizeHost");
check("strips the port", normalizeHost("panameer.com:443"), "panameer.com");
check("lowercases", normalizeHost("PANAMEER.com"), "panameer.com");
check("strips the FQDN dot", normalizeHost("panameer.com."), "panameer.com");
check("keeps IPv6 brackets", normalizeHost("[::1]:3100"), "[::1]");
check("null is empty", normalizeHost(null), "");

console.log("\nproduction — the allowlist is exactly two hosts");
withEnv("production", () => {
  check("panameer.com", isMarketingHost("panameer.com"), true);
  check("www.panameer.com", isMarketingHost("www.panameer.com"), true);
  // The four that must NOT get a marketing root in production. Each one is a
  // real environment: the app domain, a preview build, staging, and the dev
  // machine spelling that would otherwise leak in.
  check("app.panameer.com", isMarketingHost("app.panameer.com"), false);
  check(
    "a Vercel preview",
    isMarketingHost("panameer-git-main-medlinqai.vercel.app"),
    false
  );
  check("staging.panameer.com", isMarketingHost("staging.panameer.com"), false);
  check("localhost", isMarketingHost("localhost:3100"), false);
  check("127.0.0.1", isMarketingHost("127.0.0.1:3100"), false);
  check("[::1]", isMarketingHost("[::1]:3100"), false);
});

console.log("\ndevelopment — localhost joins, and nothing else does");
withEnv("development", () => {
  check("localhost", isMarketingHost("localhost:3100"), true);
  check("127.0.0.1", isMarketingHost("127.0.0.1:3100"), true);
  check("[::1]", isMarketingHost("[::1]:3100"), true);
  check("panameer.com still", isMarketingHost("panameer.com"), true);
  // Widening the gate in dev must not widen it for hosts that merely LOOK
  // local — a preview URL is still a real deployment.
  check("app.panameer.com", isMarketingHost("app.panameer.com"), false);
  check(
    "a Vercel preview",
    isMarketingHost("panameer-git-main-medlinqai.vercel.app"),
    false
  );
  check("localhost.evil.com", isMarketingHost("localhost.evil.com"), false);
});

/**
 * ── ⚠⚠⚠ THE STATUS HOST (`P2-ALL-E753`) ─────────────────────────────────────
 *
 * ⚠ Same reasoning as the block at the top of this file, with a sharper edge:
 * the status host serves a PUBLIC page on a domain nobody signs in to, so the
 * failure that matters is a host drifting into or out of that set unnoticed.
 *
 * ⚠⚠ **THE TWO SETS MUST STAY DISJOINT, AND THAT IS ASSERTED BOTH WAYS.** The
 * proxy tests `isStatusHost` FIRST and falls through to `isMarketingHost`; if
 * one host ever answered true to both, which page a visitor saw would depend on
 * the order of two `if`s rather than on a decision anybody made.
 */
console.log("\nproduction — the status host, and only the status host");
withEnv("production", () => {
  check("status.panameer.com", isStatusHost("status.panameer.com"), true);
  check("with a port", isStatusHost("status.panameer.com:443"), true);
  check("trailing dot", isStatusHost("status.panameer.com."), true);
  check("uppercase", isStatusHost("STATUS.PANAMEER.COM"), true);
  check("panameer.com", isStatusHost("panameer.com"), false);
  check("www.panameer.com", isStatusHost("www.panameer.com"), false);
  check("app.panameer.com", isStatusHost("app.panameer.com"), false);
  check("a Vercel preview", isStatusHost("panameer-git-main-medlinqai.vercel.app"), false);
  // ⚠ A lookalike is not the host. `status.panameer.com.evil.com` ends in a
  // different registrable domain and must never be served the tracker.
  check("status.panameer.com.evil.com", isStatusHost("status.panameer.com.evil.com"), false);
  // ⚠⚠ THE DEV SPELLING IS COMPILED OUT OF A PRODUCTION BUILD.
  check("status.localhost in prod", isStatusHost("status.localhost:3101"), false);
});

console.log("\ndevelopment — the local spelling joins, and nothing else does");
withEnv("development", () => {
  check("status.localhost", isStatusHost("status.localhost:3101"), true);
  check("status.127.0.0.1", isStatusHost("status.127.0.0.1:3101"), true);
  check("status.panameer.com still", isStatusHost("status.panameer.com"), true);
  check("plain localhost", isStatusHost("localhost:3101"), false);
  check("app.panameer.com", isStatusHost("app.panameer.com"), false);
});

console.log("\nthe two sets are disjoint — no host answers true to both");
for (const env of ["production", "development"] as const) {
  withEnv(env, () => {
    for (const h of [
      "panameer.com",
      "www.panameer.com",
      "status.panameer.com",
      "app.panameer.com",
      "localhost:3101",
      "status.localhost:3101",
      "127.0.0.1:3101",
      "status.127.0.0.1:3101",
    ]) {
      check(
        `${env}: ${h} is not both`,
        isMarketingHost(h) && isStatusHost(h),
        false
      );
    }
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
