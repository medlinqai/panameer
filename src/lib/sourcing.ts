import { ProposalRequestStatus, LineBasis } from "@prisma/client";
import { assertLineShape, type LineShape } from "@/lib/transaction-spine";

export class SourcingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SourcingError";
  }
}

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
  missingFromProposal: string[];
  missingFromOrder: string[];
};

export function pricingShapeDiff(proposalFields: string[], orderFields: string[]): ShapeDiff {
  const bid = new Set(proposalFields);
  const order = new Set(orderFields);
  const missingFromProposal = PRICING_SHAPE_FIELDS.filter((f) => !bid.has(f));
  const missingFromOrder = PRICING_SHAPE_FIELDS.filter((f) => !order.has(f));
  return {
    ok: missingFromProposal.length === 0 && missingFromOrder.length === 0,
    missingFromProposal,
    missingFromOrder,
  };
}

export function assertPricingShapesAgree(proposalFields: string[], orderFields: string[]): void {
  const d = pricingShapeDiff(proposalFields, orderFields);
  if (!d.ok)
    throw new SourcingError(
      `ProposalLine and WorkOrderLine have drifted — missing from the bid line: [${d.missingFromProposal.join(", ")}]; missing from the order line: [${d.missingFromOrder.join(", ")}]`,
      "PRICING_SHAPE_DRIFT"
    );
}

/** A provider cannot answer an hourly request with a lump sum. Not because the */
export function assertProposalLineBasis(proposalBasis: LineBasis, workRequestLineBasis: LineBasis): void {
  if (proposalBasis !== workRequestLineBasis)
    throw new SourcingError(
      `A ${proposalBasis} bid cannot answer a ${workRequestLineBasis} request line — that is a counter-offer, which is a different feature`,
      "PROPOSAL_BASIS_COUNTER_OFFER"
    );
}

/** A bid line is a work-order line waiting to happen, so it is held to the SAME */
export function assertProposalLine(line: LineShape, workRequestLineBasis: LineBasis): void {
  assertProposalLineBasis(line.basis, workRequestLineBasis);
  assertLineShape(line);
}

/** A BID WITH NO CLOSING DATE NEVER CLOSES, and a requester cannot shortlist */
export function assertIssuable(itb: { responds_by?: Date | null }): void {
  if (itb.responds_by == null)
    throw new SourcingError(
      "An ITB cannot be issued without a closing date — a bid with no closing date never closes",
      "ITB_NO_CLOSING_DATE"
    );
}

/** MAY THIS INVITE STILL BE PROPOSED AGAINST? WS-A) */
export type InviteForProposal = {
  status: ProposalRequestStatus;
  responds_by?: Date | null;
};

export function inviteIsOpen(itb: InviteForProposal, now: Date = new Date()): boolean {
  // Only these two statuses are live. `RESPONDED` is deliberately live too
  const liveStatus =
    itb.status === "ISSUED" || itb.status === "VIEWED" || itb.status === "RESPONDED";
  if (!liveStatus) return false;
  /* A CLOSING DATE THAT HAS PASSED CLOSES IT, whatever the status says. */
  if (itb.responds_by != null && itb.responds_by.getTime() < now.getTime()) return false;
  return true;
}

/** WHO MAY SEE A DECLINE */
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

/** A TEST CAN ONLY BE REQUESTED WHERE THE PATH HAS A PUBLISHED */
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
  /** A pass already exists. THE BUYER SEES IT; THE PROVIDER DOES NOT RE-SIT. */
  | { state: "EXISTING_PASS"; attemptId: string; attemptsUsed: number; attemptsAllowed: number }
  /** Attempts remain and no pass exists — the provider can sit it. */
  | { state: "CAN_SIT"; attemptId: null; attemptsUsed: number; attemptsAllowed: number }
  /** A STATE TO SHOW, NOT A RULE TO BYPASS. */
  | { state: "ATTEMPTS_SPENT"; attemptId: null; attemptsUsed: number; attemptsAllowed: number };

/** WHAT A BUYER'S TEST REQUEST DOES TO A PROVIDER'S ATTEMPTS: NOTHING */
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

/** THE ONLY WRITER OF `TestResponseLine.score` / `.passed`, AND IT REFUSES A */
export function copyResultFromAttempt(
  draft: { score?: number | null; passed?: boolean | null },
  attempt: AttemptRecord
): { certification_attempt_id: string; score: number; passed: boolean; completed_at: Date } {
  if (draft.score != null || draft.passed != null)
    throw new SourcingError(
      "A test result is copied from the attempt, never supplied — a typed score is a second source of truth",
      "TEST_RESULT_SUPPLIED"
    );
  return {
    certification_attempt_id: attempt.id,
    score: attempt.score,
    passed: attempt.passed,
    completed_at: attempt.created_at,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-3 · THE INTERVIEW
   ═════════════════════════════════════════════════════════════════════════ */

export type SlotDraft = { starts_at: Date | null; time_zone?: string | null };

/** A SLOT CARRIES UTC AND THE PROPOSER'S ZONE. */
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

/** THE ONLY PROJECTION OF AN INTERVIEW A PROVIDER SURFACE MAY RENDER — AND */
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

/** NO INTERVIEW SCORE IS COMPUTED, AND THAT IS A DECISION */
