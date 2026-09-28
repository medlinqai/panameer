import { prisma } from "@/lib/prisma";
import { buildBuyerIdentity, type BuyerIdentity } from "@/lib/work-request-identity";
import { pretty, workBudgetLabel } from "@/lib/work-feed";
import {
  SOURCING_STAGE_LABEL,
  sourcingStageForProvider,
  type SourcingStage,
} from "@/lib/sourcing-stage";
import { relativeDay } from "@/lib/relative-day";

/**
 * ── ⚠⚠⚠ THE PROVIDER'S VIEW OF ONE WORK REQUEST (`P2-A8-E664`) ────────────
 *
 * ⚠⚠ THE ONE READ BEHIND `/find-work/[id]`. The feed's card title has linked to a
 * detail route since `E025` and **that route did not exist** — `WorkFeed.tsx`
 * recorded the 404 twice and handed it on, and no brief picked it up. This is the
 * read; the route is one file and reads nothing else.
 *
 * ⚠ RULING 24 IS WHY IT CAN BE BUILT AGAINST AN EMPTY TABLE: *"an empty table is
 * not a reason to defer a page, a form, a route or a control."* **Measured
 * 2026-09-26: `work_requests` holds 0 rows**, so nothing renders anywhere today
 * and the page's first real state is its expected one.
 *
 * ── ⚠⚠⚠ WHAT IT DELIBERATELY DOES NOT DO ─────────────────────────────────
 *
 * ⚠⚠ **NO WRITER. NO FORM. NO PROPOSE ACTION.** `lib/proposals.ts:222` already
 * holds `prisma.proposal.create` (`E621` WS-A) — ⚠⚠⚠ **and NOTHING IN `src/`
 * IMPORTS IT.** Measured 2026-09-26: the only importers of `@/lib/proposals` are
 * `scripts/check-proposals.ts`, `scripts/check-interviews.ts` and
 * `scripts/check-selection.ts`. **The writer exists and is unreachable**, so
 * there is no route to link a button at, and `E579` is unambiguous: *a control
 * whose handler refuses is a door onto a wall.* ⚠ The entry point is the work
 * chain's to build, not this page's to invent.
 *
 * ⚠⚠ **NO INVENTED SIGNALS** — no trust score, no stars, no match percentage, no
 * count of other proposals, no shortlist position, no net-of-fee figure. The
 * card's own rule, and its reason still holds: there is nothing to derive them
 * from. ⚠ A proposal COUNT is also a pricing signal in both directions and
 * nothing rules it (reported as a stop).
 *
 * ── ⚠⚠⚠ RATES — RULING 9, AND WHY `canSeeRate()` IS NOT CALLED HERE ───────
 *
 * ⚠⚠ **NO PROVIDER RATE REACHES THIS MODULE.** The select below takes no
 * `ProviderProfile`, no `hourly_rate_cents`, no `onsite_rate_cents`, no
 * `remote_rate_cents`, no `ProposalLine` and no `SettlementLine` — so there
 * is nothing for the predicate to govern, and calling `canSeeRate()` on a value
 * that is not a rate would state a rule about the wrong thing.
 * ⚠⚠⚠ **`canSeeRate()` IN `src/lib/rate-visibility.ts` IS THE ONE RULE, AND ANY
 * FUTURE RATE ON THIS PAGE GOES THROUGH IT — IMPORTED, NEVER RESTATED.** That
 * sentence is here so the next person adding one knows where the rule lives;
 * `E616` is what happens when a second predicate gets written instead.
 *
 * ⚠ **AND THE DISTINCTION THAT MUST NOT BLUR:** `WorkRequest.budget_*` IS the
 * buyer's own figure and has rendered to providers since the feed shipped. It is
 * not a provider rate and ruling 9 does not touch it.
 *
 * ── ⚠⚠⚠ THE REDACTION — ONE PLACE, REUSED ────────────────────────────────
 *
 * ⚠⚠ `buildBuyerIdentity` is the rule and **the raw company row never leaves
 * this function.** A CONFIDENTIAL request's real name is dropped on the server
 * before the view model is built, so it cannot reach the RSC payload the way
 * `client_domain` once did.
 */

export type WorkDetail = {
  id: string;
  title: string;
  description: string | null;
  /** ⚠ The buyer's figure, through the ONE labeller. Never a provider rate. */
  budgetLabel: string | null;
  experienceLevel: string | null;
  duration: string | null;
  worksite: string | null;
  location: string | null;
  roleType: string | null;
  skills: string[];
  /** ⚠ "3 days ago", through `relativeDay`. Null when the row has no `posted_at`. */
  postedAgo: string | null;
  /** ⚠⚠ Already redacted. Never the raw company row. */
  identity: BuyerIdentity;
  /**
   * ⚠⚠ WHERE THIS PROVIDER STANDS, FROM `sourcingStageForProvider` AND NOTHING
   * ELSE. `check:sourcing` fails the build on a second derivation and that guard
   * is right. ⚠ `null` means *"not in this process at all"* — the function's own
   * words — which is a MEASURED absence, not an uncountable figure: all six of
   * its evidence sources now have writers (`work-request-invite.ts:116`,
   * `proposals.ts:222`, `interviews.ts:110`, `work-tests.ts:137`,
   * `selection.ts`, `work-orders.ts:212`). So it renders as no chip, not a dash.
   */
  stage: SourcingStage | null;
  stageLabel: string | null;
};

/**
 * ⚠⚠ THE STATUSES A PROVIDER MAY OPEN, AND IT IS THE FEED'S OWN RULE.
 *
 * ⚠⚠⚠ **NOT A NEW POLICY — `getWorkFeed` HAS FILTERED TO `POSTED` SINCE IT
 * SHIPPED, AND `submitProposal` REFUSES EVERYTHING ELSE** in as many words:
 * *"a request already `ASSIGNED` or `ORDERED` has its provider — proposing into
 * either is proposing into a decision that is made."* This page agreeing with
 * both of them is the conservative reading, not a choice about product.
 *
 * ⚠ `DRAFT` must never be openable and that is not a question. `CANCELLED` is a
 * withdrawal. ⚠⚠ **`ASSIGNED` AND `ORDERED` ARE A GENUINE OPEN QUESTION** — a
 * provider holding a link to work that has moved on — **and they are reported as
 * a stop rather than decided here.** Today they 404, which tells the provider
 * nothing false; the alternative is a page that has to say what happened, and
 * what it should say is Scott's.
 */
export const PROVIDER_OPENABLE_STATUS = "POSTED" as const;

/**
 * One work request, as the provider who asked for it may see it.
 *
 * ⚠⚠ `null` FOR A REQUEST THIS VIEWER MAY NOT OPEN, AND THE CALLER ANSWERS
 * `notFound()`. The buyer's own detail page sets the precedent and states why:
 * *"telling a stranger that an id EXISTS but belongs to someone else is itself a
 * leak."* ⚠ Here it is weaker than that — the status, not the owner — but the
 * same answer is the right one: a `DRAFT` id and a nonexistent id are the same
 * fact to a provider.
 *
 * ⚠ `providerPersonId` IS RESOLVED FROM THE SESSION BY THE CALLER, never accepted
 * from the request. It is `null` for a viewer with no `Person` row, and the stage
 * is then `null` too rather than a lookup on nothing.
 */
export async function getWorkDetailForProvider(input: {
  id: string;
  providerPersonId: string | null;
}): Promise<WorkDetail | null> {
  const w = await prisma.workRequest.findFirst({
    where: { id: input.id, status: PROVIDER_OPENABLE_STATUS },
    select: {
      id: true,
      title: true,
      description: true,
      budget_type: true,
      budget_amount_cents: true,
      budget_min_cents: true,
      budget_max_cents: true,
      currency: true,
      experience_level: true,
      duration: true,
      location_country: true,
      worksite: true,
      posted_at: true,
      roleType: { select: { display: true, name: true } },
      /* ⚠ THE IDENTITY'S INPUTS, AND THE SAME SET THE CARD TAKES. */
      company_visibility: true,
      company_code_name: true,
      p_account_id: true,
      buyer: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          company: {
            select: {
              id: true,
              name: true,
              country: true,
              vertical: true,
              logo_url: true,
              tin: true,
              /* ⚠⚠ REQUIRED BY `P1-ALL-E282`. `entityVerificationState` reads
                 this; a select that omits it silently returns "unverified" and
                 the original bug survives while looking fixed. */
              entity_validated_at: true,
            },
          },
          user: { select: { email_verified: true } },
        },
      },
      skills: { select: { skill: { select: { name: true } } } },
    },
  });
  if (!w) return null;

  /*
    ⚠ STANDING — THE SAME TWO FACTS THE CARD CARRIES, for ONE account rather than
    forty, so a `groupBy` would be a round trip to group a single key.
    ⚠⚠ THE POSTED COUNT IS A REAL COUNT OF POSTED ROWS, seeded rows included —
    Scott's counters rule, 2026-08-27. Nothing is filtered out to flatter it, and
    it includes this request, which `BuyerStanding` says in its own comment.
  */
  const [postedCount, account] = await Promise.all([
    prisma.workRequest.count({
      where: { p_account_id: w.p_account_id, status: PROVIDER_OPENABLE_STATUS },
    }),
    prisma.pAccount.findUnique({
      where: { id: w.p_account_id },
      select: { created_at: true },
    }),
  ]);

  /*
    ⚠⚠⚠ THE VIEWER FLAGS ARE THE FEED'S, VERBATIM, AND ITS REASON TRANSFERS.
    Quoted from `work-feed.ts` because it is the argument, not a note:

    //  THE FEED IS A PROVIDER SURFACE, so the viewer is never the owner, never an
    //  admin, and Plus is not plumbed into this read. `clientNameVisibility` is
    //  given the honest answer — all three false — which means CONFIDENTIAL and
    //  PLUS_ONLY both redact here. ⚠ THAT IS STRICTER THAN THE PROJECT RULE, NOT
    //  LOOSER: the failure this brief exists to prevent is a name LEAKING, and a
    //  Plus buyer seeing a code name they were entitled to read is a lesser fault
    //  than the reverse. Flagged at `E025` — plumbing Plus through is a follow-up.

    ⚠⚠ IT IS STRICTER HERE FOR ONE EXTRA REASON: this route is gated on
    `canProvideServices`, so a DUAL-ROLE member who posted this request could
    open it as a provider. `isOwner: false` under-claims for them and the page
    redacts a name they are entitled to — ⚠ which is the safe direction, and the
    same follow-up `E025` already owns.
  */
  const identity = buildBuyerIdentity({
    person: w.buyer,
    companyVisibility: w.company_visibility,
    companyCodeName: w.company_code_name,
    standing: {
      memberSince: account?.created_at?.toISOString() ?? null,
      postedCount,
    },
    viewer: { isOwner: false, isAdmin: false, isPlus: false },
  });

  /*
    ⚠⚠ SIX QUERIES, FIXED, AND THEY ARE NOT AVOIDABLE BY BEING CLEVER.
    `sourcingStageForProvider` is built on `sourcingStagesForWorkRequest` on
    purpose — *"one provider is the cheap case, not a different algorithm"* — and
    `check:sourcing` asserts the loader issues exactly six. ⚠ Skipped entirely
    when there is no person to ask about.
  */
  const stage = input.providerPersonId
    ? await sourcingStageForProvider(w.id, input.providerPersonId)
    : null;

  return {
    id: w.id,
    title: w.title || "Untitled work request",
    description: w.description,
    budgetLabel: workBudgetLabel({
      amountCents: w.budget_amount_cents,
      minCents: w.budget_min_cents,
      maxCents: w.budget_max_cents,
      currency: w.currency,
      budgetType: w.budget_type,
    }),
    experienceLevel: pretty(w.experience_level),
    duration: pretty(w.duration),
    worksite: pretty(w.worksite),
    location: w.location_country,
    roleType: w.roleType?.display ?? w.roleType?.name ?? null,
    skills: w.skills.map((s) => s.skill.name),
    postedAgo: w.posted_at ? relativeDay(w.posted_at.toISOString()) : null,
    identity,
    stage,
    stageLabel: stage ? SOURCING_STAGE_LABEL[stage] : null,
  };
}
