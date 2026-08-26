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

import { CATALOG_COUNTS } from "@/lib/learn-catalog-counts";

/**
 * ⚠ THE CATALOG NUMBERS ARE DERIVED, NEVER RETYPED (`chat_kickoff.md`).
 *
 * Step 2's sentence quotes three counts. They come from
 * `learn-catalog-counts.ts`, which carries `CATALOG_COUNTS_MEASURED_ON` and the
 * exact `prisma` queries and is asserted by `check:learn` GUARD 3c — so this page
 * cannot drift from `/learn`'s hero cards, and re-measuring is one edit in one
 * file.
 *
 * ⚠ IT LOOKS UP BY LABEL RATHER THAN BY INDEX. Reordering that array would
 * silently swap "54 learning paths" in here; a missing label throws at module load
 * instead, which is the failure you want.
 */
const count = (label: string): string => {
  const hit = CATALOG_COUNTS.find((c) => c.label === label);
  if (!hit)
    throw new Error(`talent-steps: no catalog count labelled "${label}"`);
  return hit.value;
};

/**
 * ── ⚠⚠ ONE SOURCE OF TRUTH FOR THE CTA LABEL (`P1-J1-E033`) ────────────────
 *
 * `/talent`'s hero button AND its right-column sentence both print this. ⚠ THE
 * SENTENCE QUOTES THE BUTTON BY NAME, so two copies of the string would drift —
 * and there is a LIVE EXAMPLE OF EXACTLY THAT on the page this copy was modelled
 * on: `/find-work`'s button says `Create a Work Request` while its sub-copy quotes
 * `Create Work Request`. Both are Scott's, the mismatch shipped, and this constant
 * exists so it is not repeated.
 *
 * ⚠ IT LIVES HERE because this file already holds this page's strings — the brief
 * is explicit that a new `lib/` file per string is not wanted.
 *
 * ⚠ AND SPINE STEP 1 REUSES IT (`P1-J1-E034`). Its summary IS this label, by
 * design — the same words on the hero button and on the first step. Reused rather
 * than retyped because the constant is defined in this very file, so there is no
 * awkward import to weigh.
 */
export const TALENT_CTA_LABEL = "Create My Panameer Profile";

export type TalentStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. ⚠ SCOTT'S, VERBATIM. */
  summary: string;
  /**
   * ⚠⚠ THE PANEL'S ONE-SENTENCE DESCRIPTION — CC's DRAFT, NOT SCOTT'S.
   *
   * Scott gave the five LABELS and nothing else (`P1-J1-E016`). Every string below
   * is marked `⚠ DRAFT — CC's words, not Scott's` at its site, in the same style as
   * the `⚠ PLACEHOLDER — chat's words` markers that used to sit in
   * `LearnPublic.tsx`, and all five were reported verbatim so he can overwrite them
   * in one message.
   *
   * ⚠ ONE SENTENCE EACH, matching `/optimize`'s panel-headline shape
   * (`SPINE_STEPS[].title`). ⚠ NO BODY PARAGRAPH — `/learn`'s were deleted in
   * `brief_learn_walk3` and must not come back through this door.
   *
   * ⚠ EVERY SENTENCE IS EITHER BACKED BY SOMETHING IN THIS REPO OR MARKED UNBACKED
   * AT ITS SITE. No invented numbers, no savings figures, no count that is not a
   * live DB read, and no present-tense claim for anything unbuilt.
   */
  description: string;
};

export const TALENT_STEPS: TalentStepLabel[] = [
  {
    n: 1,
    /* ⚠ WAS `Join Panameer` (`P1-J1-E034`). It is the hero's CTA label now, reused
       from the constant above rather than retyped. ⚠ `description` UNCHANGED. */
    summary: TALENT_CTA_LABEL,
    /*
      ⚠ DRAFT — CC's words, not Scott's. He gave the label only.

      ⚠ BACKED. Provider onboarding is shipped: `app/join/provider/` with `start`
      and `preview`, plus `join/requester/` and `join/buyer/`. The résumé parser is
      live (Anthropic API), `ProviderSkill.weight` is derived from dated jobs, and
      `rate_min_cents`/`rate_max_cents` hold a rate RANGE. ⚠ NO PAYMENT GATE EXISTS
      anywhere in `join/` or `settings/packages` — grepped for stripe/checkout/
      paywall and found none — so `free` is a checkable statement, not a promise.

      ⚠ IT SAYS `builds itself from your work history` BECAUSE THAT IS THE REAL
      MECHANISM and it is the one thing a résumé upload elsewhere does not do.
      `PROFILE_VIZ_COPY` in `brand.ts` already describes it the same way, so the
      two surfaces agree.
    */
    description:
      "Create a free account and your profile builds itself from your work history — the systems you ran, how deep, how recently.",
  },
  {
    n: 2,
    summary: "Learn New Skills",
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ BACKED, AND THE THREE NUMBERS ARE A LIVE DB READ. They come from
      `lib/learn-catalog-counts.ts`, which carries `CATALOG_COUNTS_MEASURED_ON =
      "2026-08-24"` and the exact queries, and which `check:learn` GUARD 3c asserts.
      ⚠ THEY ARE NOT RETYPED HERE — `TalentSpine` reads that module, so this
      sentence cannot drift from `/learn`'s hero cards.

      ⚠⚠ IT DOES NOT PROMISE CERTIFICATION. `P1-J3-E030`: 0 of 23 paths have a
      sittable test, so `and earn a certificate` would be false for every path
      today. The sentence stops at the training, which is entirely free and entirely
      real. ⚠ DO NOT ADD THE CERTIFICATE CLAUSE until a path can actually be sat.
    */
    description: `Work through the catalog for free — ${count("Learning Paths")} learning paths, ${count("Courses")} courses and ${count("Lessons")} lessons, taught by the people who implement this software.`,
  },
  {
    n: 3,
    summary: "Connect with Experts",
    /*
      ⚠⚠ DRAFT — CC's words, not Scott's — AND **UNBACKED**. THIS IS THE MOST
      DANGEROUS SENTENCE ON THE PAGE.

      ⚠ NOTHING IS BUILT. There is no `Connection`, `Conversation`, `Message` or
      `Thread` model in the schema — not a thin one, none — and `/messages` ships a
      `disabled` composer reading "Messaging isn't available yet" (`P1-J3-E014`).

      ⚠ `connection_model_decision.md` (as corrected 2026-08-24) says connecting is
      FREE AND UNGATED — no credits, no acceptance chore. ⚠ THAT IS A DECISION, NOT
      A FEATURE. A decision to allow connection is not a connection.

      ⚠ SO THE SENTENCE DESCRIBES THE RELATIONSHIP, NOT A BUTTON. It deliberately
      avoids `message`, `chat`, `DM`, `request` and `accept` — every verb that would
      imply a control exists. `no credits, no approval queue` states what will NOT
      gate it, which is the decision's actual content and is true of a thing that
      does not exist yet.

      ⚠ IT IS STILL A FUTURE CLAIM IN THE PRESENT TENSE AND IT IS FLAGGED FOR THE
      PRE-LAUNCH LIST. If Scott wants it honest today it needs a `soon` marker, and
      that is his call — `E306`'s tier list on `/learn` solves the same problem that
      way.
    */
    description:
      "Follow the experts who teach the software you work in — connection here is free and open to everyone, with no credits and no approval queue.",
  },
  /*
    ⚠ `CREATE` IS SCOTT'S AND HIS ARGUMENT WON. Chat objected that it collided with
    the hero lockup's `Learn. Connect. Create. Settle.` — WRONG, that is the SAME
    meaning, not a collision. Objection withdrawn and recorded so it is not raised
    again.
  */
  {
    n: 4,
    summary: "Create Service Products",
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ BACKED, AND IT IS THE STRONGEST OF THE FIVE. `/settings/packages` publishes
      a real `Package`. `PackageKind` has exactly the three values named:
      `HOURS` (a named person's time, `HOURLY` or `RECURRING` for a retainer),
      `DELIVERABLE` (a defined scope, `FIXED`, lump sum or milestones) and
      `DEPLOYABLE` (an agent under a standing SOW, `RECURRING`, no end date). The
      pricing shapes are `PackagePricingType` + `BillingPeriod`, and `status`
      carries the DRAFT/PUBLISHED gate.

      ⚠ THE SENTENCE NAMES WHAT YOU PUBLISH, NEVER A SALE. `E015`'s live count
      is ONE published `Package` across the whole database, so any phrasing implying
      a market for them would be ahead of the build. This one stops at the shelf.
    */
    description:
      "Package what you do into something sellable — your hours, a fixed-scope deliverable, or an agent that runs on its own.",
  },
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
  {
    n: 5,
    summary: "Sell Direct to Oracle Licensees",
    /*
      ⚠⚠ DRAFT — CC's words, not Scott's — AND **HALF-UNBACKED**. THE SHELF EXISTS;
      THE SHOP FLOOR DOES NOT.

      ⚠ WHAT IS BACKED: a provider CAN publish (`/settings/packages`, a real
      `Package` with a scope and a price), and `/explore` is a WORKING public browse
      — measured 2026-08-24, `GET /explore?mode=hire&q=oracle` returns 200 signed
      out with 22 real experts. `work-request-match.ts` ranks providers against a
      `WorkRequest` by weighted depth and recency. So "your work is discoverable" is
      true today.

      ⚠ WHAT IS **NOT** BACKED: NO BUYER CAN BROWSE OR BUY A PACKAGE.
      `(app)/packages`, `(app)/services/offers`, `(app)/hire` and `(app)/search` are
      ALL `ComingSoon` — verified, all four — and there is NO `Offer` model.
      (⚠ `model Offering` exists and is NOT that: it is a catalog taxonomy node,
      Pillar -> Offering -> Application. The name is one letter from misleading.)

      ⚠ SO THE SENTENCE IS WRITTEN AS WHAT YOU **PUT IN FRONT OF** A BUYER, NEVER AS
      A COMPLETED SALE. It has no `buy`, `purchase`, `order`, `checkout` or `hire`
      in it, and `Oracle licensees` names the audience — which is the precision
      Scott's own label committed to and the reason `BRAND_ERP_TAGLINE` moved to
      Oracle in the same commit (`P1-J0-E315`).

      ⚠ FLAGGED FOR THE PRE-LAUNCH LIST. The moment a buyer can transact, this
      sentence gets stronger; until then it must not.
    */
    description:
      "Put your products in front of the organizations running Oracle — searchable by the systems you actually know, without a recruiter in between.",
  },
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
