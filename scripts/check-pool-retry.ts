/**
 * `check:pool-retry` — the shared-pooler retry retries connections and NOTHING
 * else (`P2-A2-E597` WS-D). `npm run check:pool-retry`.
 *
 * ── ⚠⚠⚠ WHY THIS GATE HAD TO EXIST ───────────────────────────────────────
 *
 * ⚠ The retry was built for a flake measured at WS-C's gate: `check:wizard-
 * contract` failed ~4 of 12 back-to-back runs on `08006 / EAUTHTIMEOUT`
 * against the shared Supabase pooler, never on a save assertion.
 * ⚠⚠ RE-RUN 12 TIMES AFTER IT SHIPPED: **12/12 green, and the retry NEVER
 * FIRED — zero retries logged.** The pooler was simply healthy in that window.
 * ⚠⚠⚠ SO THE 12 GREEN RUNS ARE NOT EVIDENCE THE RETRY WORKS. They are evidence
 * the fault did not occur. Crediting a fix for an absent symptom is how a
 * placebo gets believed, so the mechanism is proved HERE, by injection,
 * instead of being inferred from a quiet afternoon.
 *
 * ⚠ NO DATABASE AND NO NETWORK. Injected errors only.
 */
import { withPoolRetry, isPoolConnectionError, poolRetryLog } from "../e2e-shell/_pool-retry";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/** The three signatures Scott named, as they actually arrive from Prisma. */
const POOLER_ERRORS = [
  "Database error. Code: `08006`. Message: `(EAUTHTIMEOUT) timeout while waiting for message`",
  "Error in PostgreSQL connection: Error { kind: Closed, cause: None } 08006",
  "timeout while waiting for message",
  "EAUTHTIMEOUT",
];

/*
  ⚠ WRAPPED IN `main()` BECAUSE THE HARNESS EMITS CJS, and top-level await
    is not available there. The assertions are unchanged.
*/
async function main() {
  /* ═══ 1 · IT RECOGNISES A POOLER FAULT ════════════════════════════════════ */
  for (const msg of POOLER_ERRORS) {
    check(`1 — recognised as a connection fault: ${msg.slice(0, 44)}…`, isPoolConnectionError(new Error(msg)));
  }

  /* ═══ 2 · ⚠⚠⚠ AND IT REFUSES EVERYTHING ELSE ══════════════════════════════
     ⚠ These are the errors that MUST reach the reader unretried. A retry here
     would turn a real defect into a green run, which is the rule
     `playwright.config.ts` records and this must not break. */
  {
    check("2 — a unique-constraint violation is NOT a connection fault",
      !isPoolConnectionError(new Error("Unique constraint failed on the fields: (`email`)")));
    check("2 — a missing record is NOT a connection fault",
      !isPoolConnectionError(new Error("An operation failed because it depends on one or more records that were required but not found")));
    check("2 — an unknown-field error is NOT a connection fault",
      !isPoolConnectionError(new Error("Unknown field `provider_profile` for select statement on model `Person`")));
    /* ⚠⚠ A QUERY TIMEOUT IS A FINDING, NOT A BLIP — the database was reached and
       the work was too slow. A bare /timeout/ signature would have swallowed it. */
    check("2 — a plain query timeout is NOT a connection fault",
      !isPoolConnectionError(new Error("Timed out fetching a new connection from the query engine pool")));
    /*
      ⚠⚠⚠ THE LOAD-BEARING ONE. Playwright attaches `matcherResult` to every
      `expect()` failure. This proves an assertion is refused EVEN WHEN ITS TEXT
      MATCHES A SIGNATURE — so the guard is structural, not a matter of wording.
    */
    const assertionError = Object.assign(
      new Error("expected 1 row but got 0 — timeout while waiting for message"),
      { matcherResult: { pass: false } }
    );
    check("2 — ⚠⚠⚠ an assertion failure is refused even when its text matches a signature",
      !isPoolConnectionError(assertionError));
  }

  /* ═══ 3 · IT ACTUALLY RETRIES, AND ONLY AS FAR AS IT SAYS ═════════════════ */
  {
    const before = poolRetryLog.length;
    let calls = 0;
    const value = await withPoolRetry("probe.recovers", async () => {
      calls += 1;
      if (calls < 3) throw new Error("Database error. Code: `08006`. Message: `(EAUTHTIMEOUT) timeout while waiting for message`");
      return "recovered";
    });
    check("3 — a call that fails twice on the pooler then succeeds RECOVERS", value === "recovered" && calls === 3, `calls=${calls}`);
    /* ⚠ EVERY RETRY IS LOGGED. A retry nobody can see is how a real defect hides
       behind an environmental one. */
    check("3 — both retries were recorded", poolRetryLog.length - before === 2, `logged ${poolRetryLog.length - before}`);
  }
  {
    let calls = 0;
    let thrown: unknown = null;
    try {
      await withPoolRetry("probe.exhausts", async () => { calls += 1; throw new Error("EAUTHTIMEOUT"); });
    } catch (e) { thrown = e; }
    /* ⚠⚠ IT GIVES UP AND RETHROWS. A retry that never stops is an outage that
       never reports. */
    check("3 — it stops at the attempt limit and rethrows", calls === 3 && thrown instanceof Error, `calls=${calls}`);
  }
  {
    /* ⚠⚠⚠ AND AN ASSERTION FAILS ON THE FIRST ATTEMPT. ALWAYS. */
    let calls = 0;
    try {
      await withPoolRetry("probe.assertion", async () => {
        calls += 1;
        throw Object.assign(new Error("expected 3 rows, got 2"), { matcherResult: { pass: false } });
      });
    } catch { /* expected */ }
    check("3 — ⚠⚠⚠ an assertion failure is NOT retried: exactly one attempt", calls === 1, `calls=${calls}`);
  }
  {
    /* ⚠ And a non-pooler error is not retried either. */
    let calls = 0;
    try {
      await withPoolRetry("probe.other", async () => { calls += 1; throw new Error("Unique constraint failed"); });
    } catch { /* expected */ }
    check("3 — an ordinary error is not retried: exactly one attempt", calls === 1, `calls=${calls}`);
  }
}

main().then(report).catch((e) => { console.error(e); process.exit(1); });

function report() {
if (failures.length) {
  console.error(`\ncheck:pool-retry — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:pool-retry — ${pass}/${pass} passed`);
}
