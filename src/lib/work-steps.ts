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
  /**
   * ⚠⚠ THE PANEL'S ONE-SENTENCE DESCRIPTION — CC's DRAFT, NOT SCOTT'S
   * (`P1-J4-E014`).
   *
   * Scott, 2026-08-24, screenshotting an open step 1 with an eyebrow and nothing
   * else: *"you did not create suggested graphics and text for each step."* Correct
   * — `brief_work_walk1` shipped LABELS ONLY. Every string below is marked
   * `⚠ DRAFT — CC's words, not Scott's` at its site and reported verbatim so he can
   * overwrite them in one message.
   *
   * ⚠ ONE SENTENCE EACH, matching `/optimize`'s panel-headline shape. ⚠ NO BODY
   * PARAGRAPH — `/learn`'s five were deleted in `brief_learn_walk3`.
   *
   * ── ⚠⚠ THE RULE THAT SHAPED STEPS 2-5 ─────────────────────────────────────
   *
   * ONE of five steps is built. So steps 2-5 describe **what the step IS in the
   * pipeline**, never what the user will experience clicking it — no "you'll see",
   * no "we'll notify you", no verb that implies a screen exists.
   *
   * ⚠ AND THEY DO NOT HEDGE WITH "COMING SOON" EITHER. That is a different defect:
   * a page that labels its own steps as unbuilt is not honest, it is apologetic.
   * The mechanism is stated plainly and the pre-launch list carries the gap.
   *
   * ⚠ THEY ARE DRAWN FROM THE LOCKED PIPELINE (`decisions-01.md` 2026-08-21):
   * `Work Order -> Settlement Request -> Invoice -> Payment`, with a `basis` of
   * `TIMESHEET` / `DELIVERABLE_OR_MILESTONE` / `RECURRING_SOW`. NOT from imagination.
   */
  description: string;
};

export const WORK_STEPS: WorkStepLabel[] = [
  {
    n: 1,
    summary: "Create Work Request",
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠⚠ BACKED, AND IT IS THE ONLY FULLY-BACKED STEP IN THIS SPINE. `/create-work`
      is a 10-section save-as-you-go wizard writing real `DRAFT` rows via
      `createDraft` (`lib/work-request.ts:168`), with a real `POSTED` transition. Step
      1 opens on three doors and `Paste your JD` is FIRST, badged `Fastest`: it posts
      to `POST /api/work-requests/import`, which AI-parses the JD and fills
      description + title, start/end dates, budget type and min/max, and location
      country + worksite. Skills are returned but deliberately NOT saved — they cannot
      be validated until a role and domain exist.

      ⚠ THE SENTENCE CARRIES THE AI PARSE ON PURPOSE. `decisions-01.md` 2026-08-24
      makes calling out real auto-creation a standing rule, and this is one of only
      two things on the list that are actually BUILT.

      ⚠ `or answer seven short questions` IS THE MANUAL DOOR, NAMED IN ITS OWN WORDS
      from the wizard. Saying only "paste a JD" would hide the path a buyer without
      one has to take.
    */
    description:
      "Paste a job description and the AIP drafts the request for you — title, dates, budget and location — or answer seven short questions instead.",
  },
  {
    n: 2,
    summary: "Accept Proposal",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `Proposal` and no `Offer`
      model exists. (⚠ `model Offering` DOES exist and is NOT that — a catalog
      taxonomy node, Pillar -> Offering -> Application.)

      ⚠ IT DESCRIBES WHAT THE STEP IS, NOT A SCREEN. `decisions-01.md` 2026-08-21:
      the pipeline is ONE and the variable is HOW THE PRICE GETS AGREED — bid it, or
      offer against a published price. That is exactly what this sentence says, and
      it is true of the DESIGN whether or not the model is built.

      ⚠ NO "COMING SOON" HEDGE, deliberately — see the type's note.
    */
    description:
      "Experts respond with a price, either bid against your request or offered from a published rate, and you accept one.",
  },
  {
    n: 3,
    summary: "Release Work Order",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `WorkOrder` model.

      ⚠ FROM THE LOCKED TABLE, WHICH MAKES THIS THE HINGE: `Create Work Order` is
      step 3 in ALL THREE columns — the one step identical across every pathway. It
      is where the agreement stops being a negotiation and becomes the thing work and
      money both hang off.
    */
    description:
      "The accepted price becomes the work order — the single agreement every timesheet, deliverable and payment is measured against.",
  },
  {
    n: 4,
    summary: "Approve Settlement Request",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `SettlementRequest` model.

      ⚠ THE THREE BASES ARE THE LOCKED ONES, NAMED: `TIMESHEET` /
      `DELIVERABLE_OR_MILESTONE` / `RECURRING_SOW` (`decisions-01.md` 2026-08-21).
      That is the whole reason ONE pipeline serves three pathways, so the sentence
      says it rather than describing three flows that were deliberately not built.
    */
    description:
      "Work is claimed against that order on one of three bases — hours on a timesheet, a delivered milestone, or a recurring SOW — and you approve it.",
  },
  {
    n: 5,
    summary: "Pay Panameer",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `Invoice` and no `Payment`
      model. The locked table calls the invoice half *"Panameer Auto-Creates Invoice"*
      and `decisions-01.md` 2026-08-24 lists it as DESIGNED AS AUTO with no model yet.

      ⚠ THE LABEL IS THE RIGHT CALL AND THE SENTENCE BACKS IT: `Pay Panameer` NAMES
      THE INTERMEDIARY instead of hiding it, and it matches the locked pipeline's
      `Panameer Creates Payment` exactly. One approved request, one invoice, one
      counterparty — that is the buyer-side benefit and it is what the step is FOR.

      ⚠ NO FIGURE, NO FEE, NO RATE. Nothing in the schema prices this.
    */
    description:
      "An approved request becomes one invoice from Panameer, whoever did the work and however many of them there were.",
  },
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
