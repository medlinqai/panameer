
import { getCatalogCounts } from "@/lib/learn-catalog-counts";

const countIn = (counts: { key: string; value: string }[], key: string): string => {
  const hit = counts.find((c) => c.key === key);
  if (!hit) throw new Error(`talent-steps: no catalog count keyed "${key}"`);
  return hit.value;
};

export const TALENT_CTA_LABEL = "Create My Profile";

export type TalentStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  summary: string;
  description: string;
};

export async function talentSteps(): Promise<TalentStepLabel[]> {
  const counts = await getCatalogCounts();
  const count = (label: string) => countIn(counts, label);
  return [
  {
    n: 1,
    summary: TALENT_CTA_LABEL,
    description:
      "Create a free account and your profile builds itself from your work history — the systems you ran, how deep, how recently.",
  },
  {
    n: 2,
    summary: "Learn New Skills",
    description: `Work through the catalog for free — ${count("paths")} paths you can start today, ${count("courses")} courses with video and ${count("lessons")} lessons you can watch, taught by the people who implement this software.`,
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
}

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
