import { LineBasis } from "@prisma/client";
import { assertLineShape, type LineShape } from "@/lib/transaction-spine";

/**
 * THE SOURCING DOCUMENTS' RULES (`P1-J4-E395`).
 *
 * invite → bid · ask for a test → sit it · ask for times → offer them · shortlist.
 *
 * ⚠⚠ THE RULES LIVE HERE, NOT IN THE ROUTES, so `check:sourcing` can test the
 * BEHAVIOUR rather than grep for a shape. Same arrangement as
 * `lib/transaction-spine.ts`, and for the same reason: every function below is
 * one of the brief's "assert" rules and each has a mutation test behind it.
 *
 * ⚠ THIS BRIEF IS MODELS, ASSERTIONS AND GATES. NO UI. Nothing here renders,
 * fetches or writes; the screens are their own brief.
 *
 * ── ⚠⚠ FLAGGED FOR THE SOURCING-SCREENS BRIEF, NOT BUILT HERE ───────────────
 *
 * When a provider bids $150 the bid screen MUST show BOTH numbers — *"you bid
 * $150, you receive $127.50"* at a 14.9% fee. **A provider who believes they
 * receive what they typed does not bid twice.** The arithmetic already exists and
 * is already asserted — `feeSplit()` in `lib/transaction-spine.ts`, which reuses
 * `rateBreakdown()` — so the screen has nothing to invent and nothing to
 * re-derive. ⚠ THE DECISION THAT IS UNSETTLED IS THE COPY AND THE PLACEMENT, not
 * the maths, and it is REPORTED rather than guessed at here.
 */

export class SourcingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SourcingError";
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-1 · THE BID
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ THE PRICING SHAPE `ProviderBidLine` AND `WorkOrderLine` BOTH CARRY.
 *
 * **AWARDING IS A COPY, FIELD FOR FIELD.** If the two models drift, the award
 * stops being a copy and becomes a TRANSLATION — and a translation is where a
 * rate silently changes between what was bid and what was ordered. Nobody
 * reviewing the diff that adds a column to one model is thinking about the other.
 *
 * ⚠ SO THIS LIST IS THE CONTRACT, AND `check:sourcing` READS BOTH MODELS OUT OF
 * `schema.prisma` AND COMPARES THEM AGAINST IT — three-way, so adding a pricing
 * column to both models and forgetting this list also fails. The comparison is
 * mutation-tested in both directions.
 */
export const PRICING_SHAPE_FIELDS = [
  "amount_cents",
  "basis",
  "quantity",
  "supplier_part_id",
  "unit_price_cents",
  "uom",
] as const;

export type ShapeDiff = {
  ok: boolean;
  missingFromBid: string[];
  missingFromOrder: string[];
};

/**
 * Compare two field lists against the contract above.
 *
 * ⚠ SET COMPARISON, NOT ORDER — declaration order in a Prisma model is
 * cosmetic and a formatter may change it. What must not change is WHICH fields
 * are present.
 */
export function pricingShapeDiff(bidFields: string[], orderFields: string[]): ShapeDiff {
  const bid = new Set(bidFields);
  const order = new Set(orderFields);
  const missingFromBid = PRICING_SHAPE_FIELDS.filter((f) => !bid.has(f));
  const missingFromOrder = PRICING_SHAPE_FIELDS.filter((f) => !order.has(f));
  return {
    ok: missingFromBid.length === 0 && missingFromOrder.length === 0,
    missingFromBid,
    missingFromOrder,
  };
}

export function assertPricingShapesAgree(bidFields: string[], orderFields: string[]): void {
  const d = pricingShapeDiff(bidFields, orderFields);
  if (!d.ok)
    throw new SourcingError(
      `ProviderBidLine and WorkOrderLine have drifted — missing from the bid line: [${d.missingFromBid.join(", ")}]; missing from the order line: [${d.missingFromOrder.join(", ")}]`,
      "PRICING_SHAPE_DRIFT"
    );
}

/**
 * ⚠⚠ `basis` ON A BID LINE MUST MATCH ITS WORK-REQUEST LINE.
 *
 * A provider cannot answer an hourly request with a lump sum. Not because the
 * number would be wrong but because the two are not comparable: a shortlist that
 * ranks $150/hr beside $18,000 is ranking nothing, and the buyer cannot see that
 * from the grid.
 *
 * ⚠ IF THE PRODUCT EVER NEEDS THAT, IT IS A COUNTER-OFFER AND A DIFFERENT
 * FEATURE — a second document with its own status, not a relaxed check here. The
 * error code says so, so the day someone hits it the next step is legible.
 */
export function assertBidLineBasis(bidBasis: LineBasis, workRequestLineBasis: LineBasis): void {
  if (bidBasis !== workRequestLineBasis)
    throw new SourcingError(
      `A ${bidBasis} bid cannot answer a ${workRequestLineBasis} request line — that is a counter-offer, which is a different feature`,
      "BID_BASIS_COUNTER_OFFER"
    );
}

/**
 * A bid line is a work-order line waiting to happen, so it is held to the SAME
 * shape rule.
 *
 * ⚠ `assertLineShape` IS IMPORTED, NOT REIMPLEMENTED. A second copy of
 * "RATE needs a quantity, AMOUNT must not carry one" is the drift this whole
 * work stream exists to prevent, one level up.
 */
export function assertBidLine(line: LineShape, workRequestLineBasis: LineBasis): void {
  assertBidLineBasis(line.basis, workRequestLineBasis);
  assertLineShape(line);
}

/**
 * ⚠⚠ A BID WITH NO CLOSING DATE NEVER CLOSES, and a requester cannot shortlist
 * against an open-ended set — there is no moment at which the set is final.
 * DRAFT may be incomplete; ISSUING is what requires the date.
 */
export function assertIssuable(itb: { responds_by?: Date | null }): void {
  if (itb.responds_by == null)
    throw new SourcingError(
      "An ITB cannot be issued without a closing date — a bid with no closing date never closes",
      "ITB_NO_CLOSING_DATE"
    );
}

/**
 * ── ⚠⚠ WHO MAY SEE A DECLINE ────────────────────────────────────────────────
 *
 * `E366`'s rule, unchanged: **the decline shows to the REQUESTER who issued the
 * ITB, never to other buyers, and never as a mark on the provider.** *"A recorded
 * refusal becomes a scarlet letter on a marketplace."*
 *
 * ⚠ THE PROVIDER SEES THEIR OWN — declining and then not being able to see that
 * you declined is a different bug. What nobody sees is ANOTHER provider's, and
 * what does not exist anywhere is a COUNT: no decline count, no decline rate, no
 * responsiveness score. `check:sourcing` asserts that absence across the tree,
 * because the aggregate is the scarlet letter and a single row is not.
 */
export function canSeeDecline(input: {
  viewerPersonId: string;
  invitedByPersonId: string;
  providerPersonId: string;
}): boolean {
  return (
    input.viewerPersonId === input.invitedByPersonId ||
    input.viewerPersonId === input.providerPersonId
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-2 · THE TEST
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ A TEST CAN ONLY BE REQUESTED WHERE THE PATH HAS A **PUBLISHED**
 * ASSESSMENT.
 *
 * Both halves are refusals, and the second is the one that would have been
 * missed: a path with a DRAFT assessment LOOKS testable — the row exists — and
 * `gradeAttempt()` refuses to grade it, so the provider gets an ITB, opens the
 * test and hits a wall they cannot clear.
 *
 * ⚠ MEASURED ON THIS TRUNK, 2026-09-07: **23 learning paths, 8 carry an
 * assessment row, and only 2 of those are PUBLISHED** (Basic Procurement,
 * Advanced Procurement). `E366`'s *"8 of 23"* counted ROWS, before
 * `LearnAssessment.status` existed and defaulted every existing set to DRAFT.
 * **The number that governs this rule today is 2, not 8.**
 */
export function assertTestRequestLine(target: {
  assessment: { id: string; status: string } | null;
}): void {
  if (target.assessment == null)
    throw new SourcingError(
      "That learning path has no assessment — a test cannot be requested against it",
      "TEST_NO_ASSESSMENT"
    );
  if (target.assessment.status !== "PUBLISHED")
    throw new SourcingError(
      "That assessment is not published — nobody can sit it, so requesting it is a dead end",
      "TEST_ASSESSMENT_NOT_PUBLISHED"
    );
}

export type TestRequestOutcome =
  /** A pass already exists. ⚠ THE BUYER SEES IT; THE PROVIDER DOES NOT RE-SIT. */
  | { state: "EXISTING_PASS"; attemptId: string; attemptsUsed: number; attemptsAllowed: number }
  /** Attempts remain and no pass exists — the provider can sit it. */
  | { state: "CAN_SIT"; attemptId: null; attemptsUsed: number; attemptsAllowed: number }
  /** ⚠ A STATE TO SHOW, NOT A RULE TO BYPASS. */
  | { state: "ATTEMPTS_SPENT"; attemptId: null; attemptsUsed: number; attemptsAllowed: number };

/**
 * ── ⚠⚠ WHAT A BUYER'S TEST REQUEST DOES TO A PROVIDER'S ATTEMPTS: NOTHING ───
 *
 * TWO RULES, AND THEY ARE THE SAME RULE SEEN FROM TWO SIDES.
 *
 * ⚠⚠ (2) `max_attempts` IS ALREADY ENFORCED AND A BUYER'S REQUEST DOES NOT RESET
 * IT. `lib/learn-assessment.ts:869` counts `LearnTestAttempt` by
 * `(user_id, learning_path_id)` and refuses past the limit; nothing in this file
 * writes, deletes or filters that count, and `attemptsUsed` is passed in as
 * measured. **Silently granting a fresh attempt devalues every score in the
 * marketplace** — if three buyers can each hand out three tries, the bar is nine
 * tries and the number printed on the certificate means nothing.
 *
 * ⚠⚠ (3) A PASSED SCORE IS THE PROVIDER'S PROPERTY. A second buyer requesting the
 * same test SEES THE EXISTING ATTEMPT; it does not force a retake. **Otherwise
 * the test becomes a toll gate rather than a credential** — the provider pays the
 * cost again for each buyer, and the pass they earned buys them nothing.
 *
 * ⚠ NOTE THE ORDER: the existing pass is checked BEFORE the attempt limit. A
 * provider who passed on their third try is not "spent" — they are DONE, and
 * `gradeAttempt` makes the same carve-out for the same reason.
 */
export function testRequestOutcome(input: {
  attemptsUsed: number;
  attemptsAllowed: number;
  passedAttemptId: string | null;
}): TestRequestOutcome {
  const { attemptsUsed, attemptsAllowed, passedAttemptId } = input;
  if (passedAttemptId)
    return { state: "EXISTING_PASS", attemptId: passedAttemptId, attemptsUsed, attemptsAllowed };
  if (attemptsUsed >= attemptsAllowed)
    return { state: "ATTEMPTS_SPENT", attemptId: null, attemptsUsed, attemptsAllowed };
  return { state: "CAN_SIT", attemptId: null, attemptsUsed, attemptsAllowed };
}

export type AttemptRecord = { id: string; score: number; passed: boolean; created_at: Date };

/**
 * ⚠⚠ THE ONLY WRITER OF `TestResponseLine.score` / `.passed`, AND IT REFUSES A
 * SUPPLIED VALUE.
 *
 * The denormalised pair exists for ONE reason — a shortlist grid that would
 * otherwise join every row to Learn — and the moment a second path can set it,
 * there are two scores for one test and no way to tell which is the real one.
 * `LearnTestAttempt` is the system of record and **the provider's own record must
 * win.**
 *
 * ⚠ SAME SHAPE AS `priceSettlementLine` IN THE SPINE, which refuses a supplied
 * price for the identical reason. One pattern, twice, on purpose.
 */
export function copyResultFromAttempt(
  draft: { score?: number | null; passed?: boolean | null },
  attempt: AttemptRecord
): { learn_test_attempt_id: string; score: number; passed: boolean; completed_at: Date } {
  if (draft.score != null || draft.passed != null)
    throw new SourcingError(
      "A test result is copied from the attempt, never supplied — a typed score is a second source of truth",
      "TEST_RESULT_SUPPLIED"
    );
  return {
    learn_test_attempt_id: attempt.id,
    score: attempt.score,
    passed: attempt.passed,
    completed_at: attempt.created_at,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-3 · THE INTERVIEW
   ═════════════════════════════════════════════════════════════════════════ */

export type SlotDraft = { starts_at: Date | null; time_zone?: string | null };

/**
 * ⚠⚠ A SLOT CARRIES UTC **AND** THE PROPOSER'S ZONE.
 *
 * **Two parties, two timezones — the commonest defect in every scheduling
 * feature ever shipped.** The instant alone cannot render *"3pm your time on
 * Tuesday"* back to the person who offered it, and cannot survive a DST boundary
 * falling between the offer and the interview.
 *
 * ⚠ AND IT MUST BE AN IANA ZONE NAME, NOT AN OFFSET. `-05:00` is a fact about one
 * instant; `America/New_York` is a fact about a place, and only the second one
 * still means the right thing in November. The check is deliberately cheap — a
 * `Region/City` shape — rather than a zone-database lookup, so it holds in a
 * harness with no ICU data.
 */
export function assertInterviewSlot(slot: SlotDraft): void {
  if (slot.starts_at == null)
    throw new SourcingError("A slot needs a start instant", "SLOT_NO_START");
  if (slot.time_zone == null || slot.time_zone.trim() === "")
    throw new SourcingError(
      "A slot needs the proposer's time zone alongside the instant",
      "SLOT_NO_TIME_ZONE"
    );
  if (/^(UTC|GMT)?[+-]\d/.test(slot.time_zone.trim()))
    throw new SourcingError(
      "A slot's time zone is an IANA name, never an offset — an offset does not survive DST",
      "SLOT_TIME_ZONE_IS_OFFSET"
    );
  if (!/^[A-Za-z]+\/[A-Za-z_+-]+(\/[A-Za-z_+-]+)?$|^UTC$/.test(slot.time_zone.trim()))
    throw new SourcingError(
      "A slot's time zone must be an IANA zone name such as America/New_York",
      "SLOT_TIME_ZONE_NOT_IANA"
    );
}

export type ProviderFacingInterview = {
  id: string;
  status: string;
  mode: string | null;
  duration_minutes: number;
  confirmed_line_id: string | null;
  completed_at: Date | null;
  slots: { id: string; line_number: number; starts_at: Date; time_zone: string }[];
};

/**
 * ⚠⚠ THE ONLY PROJECTION OF AN INTERVIEW A PROVIDER SURFACE MAY RENDER — AND
 * `InterviewNote` IS NOT IN IT.
 *
 * **A candidate reading *"weak on OTBI"* is the failure mode**, and it is never
 * a styling accident: it is ONE careless `include`. Three things stop it, and
 * `check:sourcing` asserts all three:
 *
 *   1. the `notes` relation exists on `InterviewRequest` — the BUYER's document —
 *      and NOT on `InterviewResponse`, which is what a provider reads back, so
 *      there is no edge to traverse from the provider's own row;
 *   2. this function returns a CLOSED object literal, so a note cannot arrive by
 *      spread from a wider row that happened to be loaded;
 *   3. no file under a provider-facing path references `InterviewNote` at all.
 *
 * ⚠ IT TAKES THE WHOLE ROW ON PURPOSE. A projection that accepted a pre-narrowed
 * object would be trusting the caller to have narrowed it, which is exactly the
 * thing that fails.
 */
export function providerFacingInterview(row: {
  id: string;
  status: string;
  mode: string | null;
  duration_minutes: number;
  confirmed_line_id: string | null;
  completed_at: Date | null;
  notes?: unknown;
  response?: {
    lines?: { id: string; line_number: number; starts_at: Date; time_zone: string }[];
  } | null;
}): ProviderFacingInterview {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    duration_minutes: row.duration_minutes,
    confirmed_line_id: row.confirmed_line_id,
    completed_at: row.completed_at,
    slots: (row.response?.lines ?? []).map((l) => ({
      id: l.id,
      line_number: l.line_number,
      starts_at: l.starts_at,
      time_zone: l.time_zone,
    })),
  };
}

/**
 * ── ⚠⚠ NO INTERVIEW SCORE IS COMPUTED, AND THAT IS A DECISION ───────────────
 *
 * PeopleSoft sPro averages completed interview ratings into a score. `E395`
 * STORES the ratings and does NOT average them. **A score built from two
 * interviews is not a score** — it is two opinions with a decimal point on them,
 * and it will be sorted on, filtered by and eventually shown to somebody.
 *
 * ⚠ THERE IS DELIBERATELY NO FUNCTION HERE. `InterviewRating` has no numeric
 * mapping anywhere in the tree and `check:sourcing` fails the build if one
 * appears — a constant like `{ EXCELLENT: 4, GOOD: 3 }` is the whole feature, and
 * it would arrive looking like a display helper. **Flagged, not built.**
 */
