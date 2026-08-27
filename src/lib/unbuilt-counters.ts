/**
 * ── ⚠⚠ THE COUNTERS WHOSE MODELS DO NOT EXIST YET (`P1-J1-E041`) ────────────
 *
 * Scott, 2026-08-27: *"And yes, i know we have not created any of these just yet"*
 * and *"settlement has not been built, stub this for now."*
 *
 * ⚠⚠ `Work Orders` IS STUBBED ON **BOTH** `/work` AND `/shop`, WHICH IS THE WHOLE
 * REASON THIS FILE EXISTS. Two hardcoded zeros in two stats modules is two things to
 * remember and one of them will be missed. ⚠ ONE EDIT HERE CLOSES BOTH PAGES.
 *
 * ── ⚠⚠ THESE ZEROS CANCEL THEMSELVES. THAT IS THE DESIGN. ───────────────────
 *
 * A hardcoded `0` still reads `0` the day after `WorkOrder` ships, and nothing about
 * the page would look wrong — which is why a comment alone is not enough. So:
 *   1. every stub lives HERE and nowhere else;
 *   2. each carries the EXACT query that replaces it, below;
 *   3. ⚠ A TRIPWIRE TEST asserts both models are ABSENT from `prisma/schema.prisma`
 *      and FAILS THE BUILD GATE the moment either is added
 *      (`e2e-shell/unbuilt-counters.spec.ts`). A test that fails when the world
 *      improves is the only placeholder that cannot rot.
 *
 * ⚠ `0` IS A TRUE STATEMENT AND IT SHIPS BARE. No caveat, no footnote, no "coming
 * soon", no hiding the tile because the number is unflattering.
 * ⚠ DO NOT CREATE EITHER MODEL HERE. Schema work is its own brief.
 */

/**
 * `WorkOrder` — ⚠ NO MODEL, NO TABLE. Verified absent from `prisma/schema.prisma`
 * at `997112b` and asserted absent by the tripwire.
 *
 * ⚠⚠ WHEN `WorkOrder` LANDS, THIS BECOMES:
 *     `prisma.workOrder.count()`
 * and it must become that in `work-stats.ts` AND `shop-stats.ts` together — both
 * import this one constant, so replacing the export replaces both tiles at once.
 */
export const WORK_ORDERS_STUB = 0;

/**
 * `SettlementRequest` — ⚠ NO MODEL, NO TABLE. Scott: *"settlement has not been
 * built, stub this for now."* Only `/work` prints it today.
 *
 * ⚠⚠ WHEN `SettlementRequest` LANDS, THIS BECOMES:
 *     `prisma.settlementRequest.count()`
 * in `work-stats.ts`.
 */
export const SETTLEMENT_REQUESTS_STUB = 0;
