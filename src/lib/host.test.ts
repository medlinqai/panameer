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
import { isMarketingHost, normalizeHost } from "./host";

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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
