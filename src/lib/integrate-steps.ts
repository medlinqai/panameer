/**
 * `/integrate`'s FIVE STEPS (`P1-J0-E328`) — the sixth spine.
 *
 * ⚠ THE STRINGS LIVE HERE, NOT IN THE COMPONENT, for the reason `spine-steps.ts`,
 * `learn-steps.ts`, `talent-steps.ts`, `work-steps.ts` and `shop-steps.ts` all
 * give: `check:ui` can assert the rendered rows against their SOURCE without
 * importing React. Sixth spine, sixth file, same shape.
 *
 * ── ⚠⚠ THE SHAPE IS LOAD-BEARING AND IS NOT DRIFT ──────────────────────────
 *
 * **1-2 are the punchout story. 3-4 are the network play. 5 is the payoff.**
 * ⚠ DO NOT REORDER, AND DO NOT MERGE 3 AND 4 — they read as one idea and they are
 * two: capturing every PO is the buyer's side, transmitting to any supplier is the
 * supplier's, and collapsing them hides that the second is a product of its own.
 *
 * ── ⚠⚠ A DELIBERATE WIDENING OF WHAT THIS PAGE CLAIMS, AND IT IS DECIDED ───
 *
 * Scott, 2026-08-25: *"we also want to get ALL the POs...we can auto-transmit them
 * to suppliers AND once we have their data, we can do agents against it."*
 * Punchout alone puts only Panameer's own transactions in the AIP; routing every PO
 * puts the buyer's whole outbound spend there, which is what makes the agents worth
 * anything.
 *
 * ⚠ CHAT RAISED THREE OBJECTIONS — that steps 3-4 are a far larger ask than step 2,
 * that supplier-side transmission is an unscoped product, and that the data claim is
 * a counsel item. ⚠ SCOTT: *"we have answered all those objections among the team."*
 * RECORDED AS ANSWERED. DO NOT RE-RAISE THEM.
 */

export type IntegrateStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. ⚠ SCOTT'S, VERBATIM. */
  summary: string;
  /**
   * ⚠⚠ THE PANEL'S ONE-SENTENCE DESCRIPTION — CC's DRAFT, NOT SCOTT'S.
   *
   * ⚠ ZERO OF FIVE STEPS ARE BUILT — see `INTEGRATE_BUILD_STATE`. So every sentence
   * describes **what the step IS**, never what a user will experience clicking it.
   * ⚠ AND NONE HEDGES WITH "COMING SOON": a page that labels its own steps unbuilt
   * is not honest, it is apologetic. The pre-launch list carries the gap.
   */
  description: string;
};

export const INTEGRATE_STEPS: IntegrateStepLabel[] = [
  {
    n: 1,
    summary: "Connect Your ERP",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `Integration` model, no
      connector, no cXML handler.

      ⚠ IT NAMES THE SAME THREE TECHNOLOGIES THE HERO'S SUB-COPY NAMES, which is
      `INTEGRATION_METHODS` in `lib/integrate-hero.ts` — the constant the hero's
      counter tile counts. The two must not disagree about what Panameer speaks.

      ⚠⚠ `Minutes, not months` IS A TESTABLE CLAIM WITH NOTHING BEHIND IT and it
      carries Scott's own `in minutes` from the hero forward. PRE-LAUNCH LIST.
    */
    description:
      "cXML, APIs or email — the technologies your procurement team already runs. Minutes, not months.",
  },
  {
    n: 2,
    summary: "Punch Out for Talent & Services",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: there is no punchout endpoint.

      ⚠ `system of record` IS THE PRODUCT'S OWN FRAMING, not a new claim — CLAUDE.md
      opens with it: buyers *"search, request, order and settle services without
      leaving their system of record."* This step is that sentence, scoped to the
      requisition.
    */
    description:
      "Buy talent and services from inside a requisition, without leaving your system of record.",
  },
  {
    n: 3,
    summary: "Route Every PO Through Panameer",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: nothing captures a PO.

      ⚠ `Not just Panameer's` IS THE LOAD-BEARING HALF and it is deliberately first.
      The widening only makes sense if the reader understands this covers spend that
      has nothing to do with Panameer — that is the whole argument for step 5.
    */
    description:
      "Not just Panameer's. Every purchase order you raise, through one channel.",
  },
  {
    n: 4,
    summary: "We Transmit to Any Supplier",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: there is no transmission path,
      and this is the largest unbuilt claim of the five — a supplier-side product in
      one sentence.

      ⚠⚠ `no integration of their own required` IS TESTABLE AND UNPROVEN. It is also
      the sentence that makes step 3 acceptable to a buyer, so it is not softened.
      PRE-LAUNCH LIST.
    */
    description:
      "Your suppliers receive them however they already work — no integration of their own required.",
  },
  {
    n: 5,
    summary: "Agents Run on Your Own Data",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no agent runs on buyer data.

      ⚠⚠ A DELIBERATE FRAMING CHOICE, REPORTED SO SCOTT CAN OVERRULE IT. It is
      written as what the BUYER GETS FROM THEIR OWN DATA, not what Panameer gets
      from it. Same capability either way — but the second framing invites the data
      -ownership question in the largest text on a public page, and that is a
      counsel conversation rather than a copy one. ⚠ NOT A SOFTENING: the sentence
      still says the agents run on the buyer's transaction history.
    */
    description:
      "Analytics, deployable assets and process agents, running on your own transaction history.",
  },
];

/**
 * ── ⚠⚠ BUILD STATE: ZERO OF FIVE, AND SCOTT SAID SO HIMSELF ────────────────
 *
 * *"Yes, it is not built, but it will be before this is released."*
 *
 *   1 Connect Your ERP        ❌ no `Integration` model, no connector, no cXML
 *   2 Punch Out for Talent    ❌ no punchout endpoint
 *   3 Route Every PO          ❌ nothing captures a purchase order
 *   4 We Transmit to Supplier ❌ no transmission path; a supplier-side product
 *   5 Agents on Your Data     ❌ no agent runs against buyer transactions
 *
 * ⚠ SAME STANDING AS `/shop`, WHICH IS ALSO 0 OF 5. Outstanding parts gate
 * PROMOTION, not the build (`decisions-01.md` 2026-08-24). ⚠ ALL FIVE GO ON THE
 * PRE-LAUNCH LIST AS ONE BLOCK — they are one unbuilt pipeline, and shipping any
 * one alone would not make this page true.
 */
export const INTEGRATE_SPINE_HEADING = "Here's How It Works";
/*
  ⚠⚠ `/integrate`'s CTA LABEL, DEFINED ONCE (`P1-ALL-E031`, Scott 2026-08-26).
  ⚠ RELABELLED from `See How Punchout Works`.
  ⚠⚠ SUPERSEDED, quoted not deleted: *"THE `href="#punchout"` DOES NOT CHANGE — only
  the label. That anchor is this hero's ONLY control and it has already been re-homed
  once (`P1-J0-E333`)."* ⚠ `P1-J0-E359` CHANGED THE href AND NOT THE LABEL — the exact
  inverse. It is `/erp-integration` now, a page link rather than a same-page anchor,
  because the section moved off `/integrate`.
  ⚠⚠ THIS EDIT IS A COMMENT ONLY. `INTEGRATE_CTA_LABEL` BELOW IS BYTE-IDENTICAL and
  `E359` diffed this file to prove it. The hero's approved description interpolates
  that constant, and `P1-J4-E024` is the precedent for what happens when two strings
  describe one control.

  ⚠ ONE CONVENTION ACROSS THE PUBLIC PAGES — the exact shape of `TALENT_CTA_LABEL`,
  `WORK_CTA_LABEL` and `LEARN_CTA_LABEL`. It is a constant because the hero's
  APPROVED DESCRIPTION QUOTES IT, and `/work` already shipped that defect for real
  (`P1-J4-E024`: the button said `Create a Work Request` while the sub-copy quoted
  `Create Work Request` — two live strings on one screen).
  ⚠ THE DESCRIPTION INTERPOLATES THIS. NEVER RETYPE IT.
*/

export const INTEGRATE_CTA_LABEL = "How We Integrate";
