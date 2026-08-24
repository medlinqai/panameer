/**
 * `/hire-talent`'s FIVE STEPS — THE LABELS, AND ONLY THE LABELS (`P1-J1-E012`).
 *
 * Settled with Scott across three exchanges on 2026-08-24. ⚠ THESE ARE HIS FINAL
 * LABELS AND THEY SUPERSEDE AN EARLIER DRAFT IN THE SAME WORK STREAM.
 *
 * ⚠ THE STRINGS LIVE HERE, NOT IN THE COMPONENT, for the reason `spine-steps.ts`
 * and `learn-steps.ts` both give: `check:ui` can assert the rendered summaries
 * against their SOURCE without importing React. A guard comparing the page to a
 * literal it typed itself proves only that somebody typed the same thing twice.
 *
 * ── ⚠ HE NARROWED TWO OF THEM, AND BOTH NARROWINGS POINT THE SAME WAY ───────
 *
 *   chat proposed `Connect with Experts and Buyers`  -> `and Buyers` DROPPED
 *   chat proposed `Create Service Products or Job Requests` -> `or Job Requests` DROPPED
 *
 * Both cuts remove the BUYER half, which is consistent with `/hire-talent`
 * becoming the seller-side page (`P1-J1-E013`).
 *
 * ⚠ HIS SYMMETRY ARGUMENT STILL HOLDS AS A PRODUCT FACT — *"Sellers CREATE service
 * products...Buyers create job requests. Both parties create rev adjacent
 * transactions, no?"* — it simply is not what THIS page says. ⚠ DO NOT RESTORE THE
 * BUYER HALF citing that earlier exchange.
 *
 * ── ⚠ WHY `SELL` AND NOT `SEARCH`, WHICH IS THE POINT OF THE WHOLE PAGE ─────
 *
 * Scott: *"Linkedin makes me searchable...but i cant offer ANYTHING to ANY
 * CLIENT."* Ending the spine at `Search` is the LinkedIn ending — it stops one
 * step before the thing that makes this different. ⚠ SEARCH IS HOW YOU GET FOUND,
 * INSIDE STEP 5, NOT THE DESTINATION.
 *
 * ── ⚠ `CONNECT` IS A REAL STEP, AND A CHAT ERROR NEARLY DELETED IT ──────────
 *
 * Scott: *"You join panameer...that does not make you connected to anyone...just
 * like linkedin."* ⚠ CHAT MISREAD `connection_model_decision.md` AND DELETED THE
 * `Connection` MODEL FROM `messaging_model_spec.md`. He was rejecting FOLLOWS, not
 * connections — LinkedIn has both and he deletes the follows. The model is
 * restored. What survives from that decision is the part that was right: NOBODY
 * GATES CONNECTING — no credits, no acceptance chore.
 *
 * ⚠ `INVITE` IS NOT IN ANY LABEL. His draft said *"CONNECT/INVITE your
 * colleagues"*; no invite, share or referral model exists anywhere in the schema.
 * And `with Experts` rather than `your colleagues` because colleagues you already
 * know add no marketplace value — the value is the expert who can teach you.
 */

export type TalentStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. */
  summary: string;
};

export const TALENT_STEPS: TalentStepLabel[] = [
  { n: 1, summary: "Join Panameer" },
  { n: 2, summary: "Learn New Skills" },
  /* ⚠ NOT BUILT — there is no `Connection` model, only a spec. See the file note. */
  { n: 3, summary: "Connect with Experts" },
  /*
    ⚠ `CREATE` IS SCOTT'S AND HIS ARGUMENT WON. Chat objected that it collided with
    the hero lockup's `Learn. Connect. Create. Settle.` — WRONG, that is the SAME
    meaning, not a collision. Objection withdrawn and recorded so it is not raised
    again.
  */
  { n: 4, summary: "Create Service Products" },
  /*
    ⚠⚠ THE SHARPEST AUDIENCE DEFINITION ON THE SITE, and the first public surface
    to commit to ORACLE by name. It names the buyer precisely and it is checkable.

    ⚠ IT COLLIDES WITH `BRAND_ERP_TAGLINE` — *"Automating the space between the
    modern ERPs"* — which is PLURAL and VENDOR-NEUTRAL. `positioning_decision.md`
    records the Oracle-vs-ERP-general fork as OPEN and needing Scott. This step
    ships Oracle-explicit; the collision is reported, not resolved.

    ⚠ FIVE WORDS, against Scott's own 3-4 word rule (`P1-J0-E286`). Shipped as
    typed — the precision is worth the word — and reported.
  */
  { n: 5, summary: "Sell Direct to Oracle Licensees" },
];

/**
 * ⚠⚠ WHAT IS ACTUALLY BUILT BEHIND EACH STEP. Verified 2026-08-24; do not soften.
 *
 *     1 JOIN     ✅ onboarding exists
 *     2 LEARN    ✅
 *     3 CONNECT  ❌ NO `Connection` model — spec only
 *     4 CREATE   ⚠ HALF — providers publish products (`/settings/packages`);
 *                  `WorkRequest` create exists (`/create-work`)
 *     5 SELL     ⚠ SELLER HALF ONLY — no buyer can browse or offer.
 *                  `(app)/packages`, `(app)/services/offers`, `(app)/hire` and
 *                  `(app)/search` are ALL `ComingSoon`; there is NO `Offer` model.
 *
 * ⚠ THE SHELF EXISTS; THE SHOP FLOOR DOES NOT. Two of five steps are real, two are
 * half, one is absent. ⚠ STEPS 3 AND 5 BELONG ON THE PRE-LAUNCH LIST.
 *
 * ⚠ SHIPPED ANYWAY — `decisions-01.md` 2026-08-24: outstanding parts gate
 * PROMOTION, not the BUILD.
 */
export const TALENT_SPINE_HEADING = "Here's How It Works";
