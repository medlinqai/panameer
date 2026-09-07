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

/* ── ⚠⚠ BOTH STUBS ARE GONE (`P1-J4-E388`, 2026-09-07) ──────────────────────
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — this file exported two constants:
 *     export const WORK_ORDERS_STUB = 0;         // "WHEN `WorkOrder` LANDS,
 *     export const SETTLEMENT_REQUESTS_STUB = 0; //  THIS BECOMES …count()"
 *
 * `model WorkOrder` and `model SettlementRequest` LANDED in `P1-J4-E388`, so the
 * zeros stopped being true statements and became hardcoded ones. Both are now
 * `prisma.workOrder.count()` / `prisma.settlementRequest.count()` in
 * `work-stats.ts`, and the first of those in `shop-stats.ts` as well.
 *
 * ⚠⚠ THE TRIPWIRE WORKED EXACTLY AS DESIGNED AND THAT IS WORTH RECORDING. It said
 * *"a test that fails when the world improves is the only placeholder that cannot
 * rot"* — and it went red on the same run that added the models, naming the three
 * files to edit and the order to edit them in. This change is that order,
 * followed: counts first, stubs second, assertion third.
 *
 * ⚠ THE FILE IS KEPT, NOT DELETED (`E164`). It is the pattern's home, and the
 * next counter whose model does not exist yet belongs here — with a tripwire.
 */
