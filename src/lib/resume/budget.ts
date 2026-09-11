/**
 * ── ⚠⚠ THE ROUTE'S CLOCK, IN ONE PLACE (`P1-A1.4-E415` WS-2) ────────────────
 *
 * **THE INVARIANT: no single model call may be granted more time than the route
 * that contains it has left.**
 *
 * ⚠ IT WAS VIOLATED BY TWO LITERALS THAT HAPPENED TO DIFFER. `route.ts` said
 * `maxDuration = 60` and `ai-provider.ts` said `MODEL_TIMEOUT_MS = 55_000`,
 * neither aware of the other — and the résumé read makes **at least two model
 * calls in series**, because the inventory pass must return before the other
 * five can be handed its output. ⚠⚠ SO THE FLOOR WAS ALWAYS
 * `inventory + slowest of the remaining five`, never the maximum of six, and a
 * single call was permitted to spend 55 of the route's 60 seconds on its own.
 *
 * ── ⚠ MEASURED, `E415` WS-1 ─────────────────────────────────────────────────
 *
 *     Scott's CV (scott-p2p-scm-obn.docx, 35,349 chars, 19 tables)
 *       model read alone   44.7s · 53.5s
 *       ⚠⚠ FULL ROUTE      71.7s   — against a 60s ceiling
 *     marelise.docx (8,914 chars — SMALLER)          75.0s  ⚠⚠ OVER
 *     linus.docx    (6,066 chars)                    23.0s
 *     historical, from `profile_imports`             88.5s  ⚠⚠ OVER (Aug 05,
 *                                                    pre-strict — this is older
 *                                                    than `E414`)
 *
 * ⚠⚠ AND THE VARIABLE IS NOT DOCUMENT SIZE. An 8,914-character CV blew the
 * ceiling while a 35,349-character one did not. What latency tracks is OUTPUT
 * TOKENS, and output tokens track HOW MANY SECTIONS THE INVENTORY RETURNS —
 * marelise's inventory returned **121 sections** and took 44.6s by itself.
 * ⚠ THAT IS `E410` WS-2's SEGMENTATION INSTABILITY WEARING A THIRD NAME. This
 * file bounds the damage; it does not fix the cause.
 *
 * ── ⚠ WHY A DEADLINE AND NOT A SMALLER CONSTANT ─────────────────────────────
 *
 * A fixed, smaller `MODEL_TIMEOUT_MS` would have to assume how long the rest of
 * the route takes, and that assumption would be wrong in both directions — it
 * would strand budget on a fast profile and overrun on a slow one. ⚠ SO THE
 * BUDGET IS TRACKED FROM THE MOMENT THE REQUEST STARTS: every call asks how
 * much of the route is actually left and takes the smaller of that and its own
 * per-call ceiling. The invariant then holds by construction rather than by two
 * numbers being kept in agreement by hand.
 */

/**
 * ⚠ THE VALUE `route.ts` EXPORTS AS `maxDuration`, and the only definition of
 * it. `export const maxDuration` must be a literal Next.js can read statically,
 * so the route cannot import this — `check:import-deadline` §2 asserts the two
 * agree instead, which is the part a human would otherwise have to remember.
 */
export const ROUTE_MAX_DURATION_S = 60;
export const ROUTE_BUDGET_MS = ROUTE_MAX_DURATION_S * 1000;

/**
 * ⚠ WHAT THE ROUTE STILL HAS TO DO AFTER THE MODEL READ RETURNS — write the
 * import row, apply every employer, project, certification and skill, recompute
 * completeness and the provider rollup, run `E413`'s supersession purge and
 * build the onboarding state for the response.
 *
 * ⚠ MEASURED, not guessed, and it VARIES WITH WHAT IS APPLIED — which is why
 * it is a reserve and not a constant anybody should trust to the second:
 *
 *     route 55.9s − read 50.3s = tail  5.7s   (nothing much applied)
 *     route 71.7s − read ~53s  = tail ~18s    (118 projects applied)
 *
 * ⚠ 14s SITS ABOVE THE LIGHT CASE AND CLOSE TO THE HEAVY ONE. It is a judgement
 * inside measured bounds, not a derivation — ⚠ and the route now logs
 * `route=…ms` and `read=…ms` on every import precisely so it can be re-derived
 * from real traffic rather than from these two runs.
 *
 * ⚠⚠ THE ARITHMETIC IS EXACT BY CONSTRUCTION: read + tail + response = the
 * route's whole budget. Enlarging this reserve does not buy safety, it moves
 * time from reading to writing. The only way to buy time is `maxDuration`
 * (a plan question) or taking the work off the request path (WS-2, Scott's
 * call).
 */
export const ROUTE_TAIL_RESERVE_MS = 14_000;

/**
 * ⚠ A little room to serialise and send the response after the deadline trips.
 * Without it the app can hit its own deadline and STILL be killed mid-reply.
 */
export const RESPONSE_RESERVE_MS = 2_000;

/**
 * The per-call ceiling, ⚠ DERIVED rather than declared.
 *
 * ⚠⚠ HALF, BECAUSE THE MINIMUM CHAIN IS TWO CALLS. The inventory pass is serial
 * in front of the other five; granting any single call more than half the read
 * budget guarantees the pair cannot fit. ⚠ This is the line that makes
 * `MODEL_TIMEOUT_MS >= maxDuration` unrepresentable.
 */
export const READ_BUDGET_MS =
  ROUTE_BUDGET_MS - ROUTE_TAIL_RESERVE_MS - RESPONSE_RESERVE_MS;
export const MODEL_TIMEOUT_MS = Math.floor(READ_BUDGET_MS / 2);

/**
 * ⚠ BELOW THIS, DO NOT START A CALL AT ALL. A model call given three seconds
 * will spend them and fail, which costs money and time to arrive at the same
 * answer as not calling. Failing before the call is both cheaper and faster,
 * and it is the difference between a report that says "we ran out of time" and
 * one that says "the model errored".
 */
export const MIN_CALL_MS = 4_000;

/** How much of the route is left for reading, from a recorded start time. */
export function readTimeRemaining(startedAt: number, now = Date.now()): number {
  return startedAt + READ_BUDGET_MS - now;
}

/**
 * The timeout one call may be granted right now.
 *
 * ⚠⚠ THIS IS THE INVARIANT, EXPRESSED AS CODE: the smaller of the per-call
 * ceiling and what the route actually has left. It can never exceed
 * `ROUTE_BUDGET_MS`, because `READ_BUDGET_MS` is strictly smaller and the
 * remaining time only shrinks.
 */
export function callTimeoutMs(startedAt: number | null, now = Date.now()): number {
  if (startedAt === null) return MODEL_TIMEOUT_MS;
  return Math.min(MODEL_TIMEOUT_MS, Math.max(0, readTimeRemaining(startedAt, now)));
}
