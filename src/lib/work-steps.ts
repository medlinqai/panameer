/**
 * `/find-work`'s FIVE STEPS — THE LABELS ONLY (`P1-J4-E006`).
 *
 * Scott, 2026-08-24: *"let me clean up work and give it just from the service buyers
 * POV."*
 *
 * ⚠ THE STRINGS LIVE HERE, NOT IN THE COMPONENT, for the reason `spine-steps.ts`,
 * `learn-steps.ts` and `talent-steps.ts` all give: `check:ui` can assert the rendered
 * rows against their SOURCE without importing React.
 *
 * ── ⚠⚠ EVERY VERB IS THE BUYER'S OWN ACTION ────────────────────────────────
 *
 * Create · Accept · Release · Approve · Pay. That is what makes this one person's
 * journey rather than a system diagram, and it is the audience flip (`P1-J4-E002`)
 * applied consistently. ⚠ DO NOT INTRODUCE A STEP WHOSE VERB BELONGS TO THE PROVIDER
 * OR TO PANAMEER.
 *
 * ⚠ ALL FIVE ARE WITHIN SCOTT'S 3-4 WORD RULE (`P1-J0-E286`): 3 / 2 / 3 / 3 / 2.
 *
 * ── ⚠ IT DERIVES FROM A LOCKED DECISION, AND STEP 2 DEPARTS FROM IT ────────
 *
 * `decisions-01.md` 2026-08-21 locked the three-column pathway table Scott wrote
 * himself. Column 1 (*Expert's hours*) reads:
 *
 *     Create Work Request -> Negotiate Rate -> Create Work Order ->
 *     Create Settlement Request -> Panameer Auto-Creates Invoice ->
 *     Panameer Creates Payment
 *
 * ⚠⚠ STEP 2 HERE IS `Accept Proposal`, NOT `Negotiate Rate`. His locked finding was
 * that the pipeline is ONE and the variable is HOW THE PRICE GETS AGREED — bid it, or
 * offer against a published price. `Accept Proposal` picks the OFFER shape for the
 * column the table gave the BID shape. That may be deliberate; it is a change either
 * way, and it is reported rather than silently reconciled.
 *
 * ⚠ `Proposal` IS A NOUN THE SCHEMA DOES NOT HAVE. No `Proposal` and no `Offer`
 * model exists. (⚠ `model Offering` DOES exist and is NOT that — it is a catalog
 * taxonomy node, Pillar -> Offering -> Application. One letter from misleading.)
 *
 * ⚠ `Pay Panameer` IS THE RIGHT CALL AND SHOULD BE SAID SO: it NAMES THE
 * INTERMEDIARY instead of hiding it, and it matches the locked pipeline's
 * `Panameer Creates Payment` exactly.
 */

export type WorkStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. ⚠ SCOTT'S, VERBATIM. */
  summary: string;
};

export const WORK_STEPS: WorkStepLabel[] = [
  /* ⚠ THE ONLY ONE THAT IS REAL. See `WORK_BUILD_STATE` below. */
  { n: 1, summary: "Create Work Request" },
  { n: 2, summary: "Accept Proposal" },
  { n: 3, summary: "Release Work Order" },
  { n: 4, summary: "Approve Settlement Request" },
  { n: 5, summary: "Pay Panameer" },
];

/**
 * ── ⚠⚠ BUILD STATE: ONE OF FIVE. THE LEAST-BUILT SPINE ON THE SITE ─────────
 *
 * Verified 2026-08-24. ⚠ REPRODUCED VERBATIM AND NOT SOFTENED — Learn shipped 2 of 5
 * real and Talent 2 of 5; this is 1 of 5.
 *
 *   1 Create Work Request      ✅ REAL — `/create-work`, a 10-section
 *                                 save-as-you-go wizard writing real `DRAFT` rows
 *                                 via `createDraft` (`lib/work-request.ts:168`),
 *                                 plus a POSTED transition
 *   2 Accept Proposal          ❌ no `Proposal`, no `Offer` model
 *   3 Release Work Order       ❌ no `WorkOrder` model
 *   4 Approve Settlement Req.  ❌ no `SettlementRequest` model
 *   5 Pay Panameer             ❌ no `Invoice`, no `Payment` model
 *
 * ⚠ `WorkRequest.status` HAS EXACTLY TWO VALUES — `DRAFT` AND `POSTED` — AND NOTHING
 * IN THE CODE TRANSITIONS PAST `POSTED`.
 *
 * ⚠ SHIPPED ANYWAY — `decisions-01.md` 2026-08-24: outstanding parts gate PROMOTION,
 * not the BUILD. ⚠ STEPS 2 THROUGH 5 GO ON THE PRE-LAUNCH LIST AS A BLOCK, not as
 * four separate rows: they are one unbuilt pipeline, and shipping any one of them
 * without the others would not make the page true.
 */
export const WORK_SPINE_HEADING = "Here's How It Works";
