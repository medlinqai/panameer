/**
 * ── ⚠⚠⚠ RETRY THE CONNECTION, NEVER THE ASSERTION (`P2-A2-E597` WS-D) ─────
 *
 * ⚠ SCOTT, 2026-09-21: *"add a retry only for connection errors from the shared
 * pooler (08006, EAUTHTIMEOUT, timeout waiting for a message). Never retry an
 * assertion failure. Log every retry."*
 *
 * ── ⚠⚠ WHY THIS EXISTS, MEASURED AT `E597` WS-C's GATE ────────────────────
 *
 * ⚠ `check:wizard-contract` failed roughly 4 of 12 back-to-back runs, and NOT
 * ONCE on a save assertion. Every failure was
 * `PrismaClientKnownRequestError … Code: 08006 … (EAUTHTIMEOUT) timeout while
 * waiting for message` against the SHARED Supabase pooler — one database behind
 * localhost, every preview and production — or a sign-in that could not
 * complete because the same pooler was unreachable.
 * ⚠⚠ THAT IS AN ENVIRONMENT FAULT WEARING A TEST FAILURE'S CLOTHES, and it
 * costs exactly what a flaky gate always costs: the next red run gets assumed
 * to be this one.
 *
 * ── ⚠⚠⚠ THE LINE THIS MUST NOT CROSS ─────────────────────────────────────
 *
 * ⚠ `playwright.config.ts` records WS-3's rule: *"A retry turns a real
 * intermittent defect into a green run… the suite has to stay trustworthy or it
 * stops being read."* ⚠⚠ THAT RULE IS RIGHT AND THIS DOES NOT WEAKEN IT,
 * because the retry is not on the TEST — it is on ONE DATABASE CALL, and only
 * when the database said it could not be reached.
 * ⚠⚠⚠ AN ASSERTION FAILURE IS RETHROWN ON THE FIRST ATTEMPT, ALWAYS. Two
 * independent guards enforce it: the error must MATCH a connection signature,
 * and it must NOT carry Playwright's `matcherResult` — so a hypothetical future
 * assertion whose message happened to contain the word "timeout" still cannot
 * be retried.
 * ⚠ EVERY RETRY PRINTS. A retry nobody can see is how a real defect hides
 * behind an environmental one.
 */

/**
 * ⚠⚠ THE THREE SIGNATURES SCOTT NAMED, AND NOTHING WIDER. Each is a statement
 * that the CONNECTION failed, not that a QUERY was wrong:
 *   · `08006` — the SQLSTATE class for "connection exception / failure".
 *   · `EAUTHTIMEOUT` — the pooler accepted the socket and never authenticated.
 *   · "timeout while waiting for message" — the driver's own wording for it.
 * ⚠⚠⚠ DO NOT ADD A BARE `/timeout/` HERE. A query timeout means the database
 * was reached and the work was too slow, which is a finding, not a blip.
 */
const CONNECTION_SIGNATURES: readonly RegExp[] = [
  /\b08006\b/,
  /EAUTHTIMEOUT/i,
  /timeout while waiting for message/i,
];

/** Every retry taken in this process, so a run can report its own honesty. */
export const poolRetryLog: { label: string; attempt: number; signature: string }[] = [];

function describe(e: unknown): string {
  if (e instanceof Error) return `${e.message}${"code" in e ? ` [code=${String((e as { code?: unknown }).code)}]` : ""}`;
  return String(e);
}

/**
 * ⚠⚠ TRUE ONLY FOR A POOLER CONNECTION FAULT.
 * ⚠⚠⚠ THE `matcherResult` GUARD IS THE LOAD-BEARING HALF: Playwright attaches
 * it to every `expect()` failure, so this returns false for an assertion even
 * if its text matched — which is the one thing this module must never get
 * wrong.
 */
export function isPoolConnectionError(e: unknown): boolean {
  if (e && typeof e === "object" && "matcherResult" in e) return false;
  const text = describe(e);
  return CONNECTION_SIGNATURES.some((re) => re.test(text));
}

/**
 * Run `fn`, retrying ONLY a pooler connection fault.
 *
 * ⚠ `attempts` is the TOTAL number of tries, so the default takes at most two
 * retries. ⚠⚠ The backoff is deliberate and not merely polite: an
 * `EAUTHTIMEOUT` means the pooler is saturated, and retrying instantly is
 * asking the same overloaded thing the same question.
 */
export async function withPoolRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      /* ⚠⚠ RETHROW UNCHANGED on the last attempt or on anything that is not a
         connection fault — including every assertion failure. The original
         error is what carries the stack the reader needs. */
      if (attempt >= attempts || !isPoolConnectionError(e)) throw e;
      const signature = describe(e).slice(0, 140);
      poolRetryLog.push({ label, attempt, signature });
      console.log(
        `⚠ POOL RETRY  ${label}  attempt ${attempt}/${attempts - 1} failed on a shared-pooler ` +
          `connection fault, retrying — ${signature}`
      );
      await new Promise((r) => setTimeout(r, 750 * attempt));
    }
  }
}
