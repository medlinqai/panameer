/**
 * `/buy-services`'s FIVE STEPS (`P1-J2-E003`).
 *
 * ⚠ THE STRINGS LIVE HERE, NOT IN THE COMPONENT, for the reason `spine-steps.ts`,
 * `learn-steps.ts`, `talent-steps.ts` and `work-steps.ts` all give: `check:ui` can
 * assert the rendered rows against their SOURCE without importing React. Fifth
 * spine, fifth file, same shape.
 *
 * ── ⚠⚠ IT CONFIRMS SCOTT'S OWN LOCKED FINDING, WHICH IS WORTH SAYING OUT LOUD ─
 *
 * `decisions-01.md` 2026-08-21: *"THE VARIABLE IS NOT THE PIPELINE — IT IS HOW THE
 * PRICE GETS AGREED."* Work BIDS the price (`Create Work Request -> Accept
 * Proposal`); Shop OFFERS against a published one (`Shop Service Products -> Make
 * Offer to Buy`). ⚠ AND BOTH SPINES END ON `Pay Panameer`, which is the finding
 * rendered rather than restated — two acquisition steps, one settlement pipeline.
 *
 * The locked table's columns 2 and 3 (Deliverable, Deployable) read
 * `Shop and Offer -> Accept Offer -> Create Work Order -> Create Settlement
 * Request -> Panameer Auto-Creates Invoice -> Panameer Creates Payment`. Scott's
 * spine spends three steps on the acquisition where the table spends two, and the
 * extra one is the buyer's side of the SAME slot — `Create Work Order` is step 3
 * in ALL THREE locked columns, and step 3 here is what the buyer does to it.
 *
 * ── ⚠⚠ TWO STRINGS DISAGREE WITH `/find-work`'s SPINE. NEITHER IS CHANGED ────
 *
 * ⚠ STEP 3 — Shop says `Accept Work Order`, Work says `Release Work Order`. THIS
 * ONE IS COHERENT AND IS RECORDED SO NOBODY "ALIGNS" IT: on Shop the provider is
 * selling a published thing, so the buyer ACCEPTS what comes back; on Work the
 * buyer is commissioning, so the buyer RELEASES it. Same object, two sides.
 *
 * ⚠⚠ STEP 4 — Shop says `Approve Payment Request`, Work says `Approve Settlement
 * Request`. TWO NOUNS FOR ONE OBJECT, and the locked table calls it a SETTLEMENT
 * REQUEST in all three columns. ⚠ PROBABLY A SLIP, STILL SCOTT'S, SHIPPED AS
 * TYPED — this is the one to reconcile, and the description below deliberately
 * says "the claim" rather than committing to either noun.
 *
 * ⚠ ALL FIVE ARE WITHIN THE 3-4 WORD RULE (`P1-J0-E286`): 3 / 4 / 3 / 3 / 2.
 */

export type ShopStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. ⚠ SCOTT'S, VERBATIM. */
  summary: string;
  /**
   * ⚠⚠ THE PANEL'S ONE-SENTENCE DESCRIPTION — CC's DRAFT, NOT SCOTT'S
   * (`P1-J2-E004`).
   *
   * ⚠ ZERO OF FIVE STEPS ARE BUILT — see `SHOP_BUILD_STATE`. So every sentence
   * describes **what the step IS in the pipeline**, never what a user will
   * experience clicking it: no "you'll see", no "we'll notify you", no verb that
   * implies a screen exists.
   *
   * ⚠ AND THEY DO NOT HEDGE WITH "COMING SOON" EITHER. Same rule `work-steps.ts`
   * records: a page that labels its own steps unbuilt is not honest, it is
   * apologetic. The mechanism is stated plainly and the pre-launch list carries
   * the gap.
   *
   * ⚠ THEY ARE DRAWN FROM THE LOCKED PIPELINE (`decisions-01.md` 2026-08-21), NOT
   * FROM IMAGINATION — and NONE of them repeats the hero's `guarantee delivery at
   * a price`, which is a legal commitment nothing in the schema backs.
   */
  description: string;
};

export const SHOP_STEPS: ShopStepLabel[] = [
  {
    n: 1,
    summary: "Shop Service Products",
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ UNBACKED AS A SURFACE, BACKED AS A MECHANISM, and the sentence is written to
      be the second and not the first. There is NO public listing of `Package` rows
      anywhere in the app — `listPublishedPackages` (`lib/packages.ts:407`) has ONE
      caller, `provider-profile-view.ts`, and the page it feeds is `(app)/providers/
      [id]`, which 307s an anonymous visitor to `/login`. So nothing here may say
      "browse the shelf".

      ⚠ WHAT IS REAL IS THE SHAPE OF THE THING: a `Package` is a fixed scope
      (`summary`, `deliverables`, `duration_weeks`) at a published price
      (`price_cents`, `pricing_type`), owned by a provider — `provider_profile_id`
      is NOT NULL, which `decisions-01.md` 2026-08-21 locked deliberately.

      ⚠ AND IT LEADS WITH THE PRICE BEING SETTLED FIRST because that is the actual
      difference between this spine and `/find-work`'s, per the locked finding.
    */
    description:
      "A service product is a fixed scope at a price its expert has already published, so the number is settled before the conversation starts.",
  },
  {
    n: 2,
    summary: "Make Offer to Buy",
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠⚠ UNBACKED, AND THIS IS THE SITE'S CENTRAL UNBUILT VERB. There is no `Offer`
      model anywhere in `schema.prisma` — no table, no enum, no status. (⚠ `model
      Offering` EXISTS AND IS NOT THIS: a catalog taxonomy node, Pillar -> Offering
      -> Application. One letter from misleading, which is why it is named here.)

      ⚠ THE SENTENCE IS THE LOCKED DECISION ALMOST WORD FOR WORD — *"bid it, or
      offer against a published price"* — so it is true of the DESIGN whether or not
      the model exists, and it is the one line on this page that explains why Shop
      and Work are two spines rather than one.
    */
    description:
      "You offer against that published price instead of bidding for it, which is the whole of what separates buying a product from commissioning work.",
  },
  {
    n: 3,
    summary: "Accept Work Order",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `WorkOrder` model.

      ⚠ THE HINGE, AND THE LOCKED TABLE IS WHY: `Create Work Order` is step 3 in ALL
      THREE columns — the one step identical across every pathway. This spine names
      the BUYER's side of it (`Accept`) where `/find-work` names theirs (`Release`);
      the object is the same object.
    */
    description:
      "The accepted offer becomes the work order — the one agreement every pathway on Panameer converges on, however the price was reached.",
  },
  {
    n: 4,
    summary: "Approve Payment Request",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `SettlementRequest` and no
      `PaymentRequest` model.

      ⚠⚠ DELIBERATELY NOUN-NEUTRAL. The label says `Payment Request`, `/find-work`
      says `Settlement Request`, and the locked table says SETTLEMENT REQUEST in all
      three columns. Rather than cement a probable slip in the largest text of the
      panel, the sentence says "the claim" — so whichever noun Scott settles on, this
      line does not have to be rewritten and does not contradict the other page.

      ⚠ WHAT IT DOES ASSERT IS THE APPROVAL GATE, which is a real design decision:
      `decisions-01.md` 2026-08-21 notes the recurring-SOW charge is *"the only money
      event with no approval step in front of it, by design"* — so an approval in
      front of everything else is the rule, not an aspiration.
    */
    description:
      "Delivered work is claimed against that order, and nothing is invoiced until you approve the claim.",
  },
  {
    n: 5,
    summary: "Pay Panameer",
    /*
      ⚠ DRAFT — CC's words, not Scott's. ⚠ UNBACKED: no `Invoice` and no `Payment`
      model. The locked table calls it `Panameer Auto-Creates Invoice` ->
      `Panameer Creates Payment`, and `decisions-01.md` 2026-08-24 lists the invoice
      half as DESIGNED AS AUTO with no model yet.

      ⚠ THE STEP IS IDENTICAL TO `/find-work`'s STEP 5 AND THE SENTENCE SAYS SO
      RATHER THAN PARAPHRASING AROUND IT. Two spines ending on the same step is the
      locked finding made visible; writing two different-sounding sentences for one
      pipeline would hide it.

      ⚠ NO FIGURE, NO FEE, NO RATE. Nothing in the schema prices this.
    */
    description:
      "One approved claim becomes one invoice from Panameer — the same settlement the bid pathway ends on, because there is only one.",
  },
];

/**
 * ── ⚠⚠ BUILD STATE: ZERO OF FIVE. THE FIRST SPINE ON THE SITE WITH NOTHING ──
 *
 * Verified against `schema.prisma` and the live database 2026-08-24. ⚠ REPRODUCED
 * EXACTLY AND NOT SOFTENED — Learn shipped 2 of 5 real, Talent 2 of 5, Work 1 of 5.
 * THIS IS 0 OF 5.
 *
 *   1 Shop Service Products    ❌ NO PUBLIC PACKAGE LISTING EXISTS.
 *                                 `listPublishedPackages` has one caller, and the
 *                                 page it feeds (`(app)/providers/[id]`) 307s to
 *                                 `/login`. `(app)/packages` and
 *                                 `(app)/services/offers` are BOTH `ComingSoon`
 *                                 AND auth-gated.
 *   2 Make Offer to Buy        ❌ no `Offer` model at all
 *   3 Accept Work Order        ❌ no `WorkOrder` model
 *   4 Approve Payment Request  ❌ no `SettlementRequest`/`PaymentRequest` model
 *   5 Pay Panameer             ❌ no `Invoice`, no `Payment` model
 *
 * ⚠ THE LIVE SHELF, READ 2026-08-24: THREE `Package` ROWS, ONE PUBLISHED —
 * *"Install DocuSign for Oracle Cloud"*, `DELIVERABLE`/`FIXED`, $40,000, 5 weeks,
 * owned by PANAMEER ADMIN. The two drafts belong to John Jones. 85
 * `ProviderProfile` rows exist and 13 are `VALIDATED`.
 *
 * ⚠ SHIPPED ANYWAY — `decisions-01.md` 2026-08-24: outstanding parts gate
 * PROMOTION, not the BUILD. ⚠ ALL FIVE STEPS GO ON THE PRE-LAUNCH LIST AS ONE
 * BLOCK, not five rows: they are a single unbuilt pipeline, and shipping any one
 * of them alone would not make this page true.
 */
export const SHOP_SPINE_HEADING = "Here's How It Works";
/*
  ⚠⚠ `/shop`'s CTA LABEL, DEFINED ONCE (`P1-ALL-E031`, Scott 2026-08-26).
  ⚠ RELABELLED: the control read `Start Shopping Now` with a `Soon` pill.

  ⚠⚠ THE CONTROL IS STILL `aria-disabled` WITH NO `href`, AND THAT IS DELIBERATE.
  Scott named WHAT it opens (2026-08-27: *"shop destination will be the items. IF you
  are not logged in - a subset of them. If you are, all of them."*) but NOT a route,
  and NO SUCH ROUTE EXISTS. `/shop` renders no catalogue; `(app)/packages` is the
  provider's own sellable list behind the app shell and 307s signed out. The public
  item list is a `P1-J2` BUILD, not part of `E031`. ⚠ AN ENABLED, LIVE-LOOKING BUTTON
  WITH NO DESTINATION IS THE FOUR-SECOND DISPROOF AND IS WORSE THAN THE DISABLED
  STATE IT REPLACES (`P1-J2-E010`, still open — as is `P1-J2-E011`, the footer button
  that links to `/shop` from `/shop`. Same missing feature, two rows.)

  ⚠ ONE CONVENTION ACROSS THE PUBLIC PAGES — the exact shape of `TALENT_CTA_LABEL`,
  `WORK_CTA_LABEL` and `LEARN_CTA_LABEL`. It is a constant because the hero's
  APPROVED DESCRIPTION QUOTES IT, and `/work` already shipped that defect for real
  (`P1-J4-E024`: the button said `Create a Work Request` while the sub-copy quoted
  `Create Work Request` — two live strings on one screen).
  ⚠ THE DESCRIPTION INTERPOLATES THIS. NEVER RETYPE IT.
*/

export const SHOP_CTA_LABEL = "Shop Service Products";

/*
  ⚠ SCOTT'S STRING VERBATIM, 2026-08-29 (`P1-J0-E358`), QUESTION MARK INCLUDED:
  *"create a button like what we did on /optimize, but call it 'What are Service
  Products?'"*. Do not sentence-case it, shorten it, or drop the `?`.
  ⚠ ONE LIVE LITERAL. `P1-J4-E024` is the precedent and it is not theoretical —
  `/work` shipped two different strings for one button and they drifted apart.
  ⚠ IT LABELS THE SECOND CONTROL in `/shop`'s hero, which points at
  `/service-products`. It lives beside `SHOP_CTA_LABEL` because this file already
  holds that page's strings.
*/
export const SERVICE_PRODUCTS_EXPLAINED_LABEL = "What are Service Products?";
