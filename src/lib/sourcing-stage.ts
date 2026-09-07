import { prisma } from "@/lib/prisma";

/**
 * ⚠⚠ WHERE A PROVIDER IS IN A SOURCING PROCESS — DERIVED, IN EXACTLY ONE
 * FUNCTION, AND ONLY ONE (`P1-J4-E395` WS-4).
 *
 * ── WHY IT IS DERIVED AND NOT STORED ────────────────────────────────────────
 *
 * Chat proposed a `Candidacy` umbrella row carrying the stage. ⚠ **SCOTT'S
 * JOURNEY DOC DOES NOT HAVE ONE**, and it is quoted here rather than imposed. So
 * the stage is DERIVED FROM WHICH DOCUMENTS EXIST. That also means it cannot go
 * stale: a stored stage is a second fact about the same thing, and the day a bid
 * is withdrawn without the writer remembering to update it, the grid is lying at
 * the exact moment a buyer is choosing who to hire.
 *
 * ── ⚠⚠ AND WHY THERE IS ONE FUNCTION ────────────────────────────────────────
 *
 * **Two screens computing a stage independently WILL disagree, and the shortlist
 * is where a buyer decides who to hire.** This codebase already runs the pattern
 * twice and says why: `create-work/page.tsx` reads `missingIdentityForPerson` so
 * the page and the API cannot disagree, and `provider-rates.ts` calls
 * `rateDisplay` — *"one rule, one place, asserted once."* `check:sourcing`
 * asserts there is no second implementation.
 *
 * ── ⚠ THE COST, MEASURED AND REPORTED ───────────────────────────────────────
 *
 * **`sourcingStagesForWorkRequest` costs SIX QUERIES FOR THE WHOLE WORK REQUEST,
 * NOT SIX PER PROVIDER** — a fixed six whether one provider was invited or two
 * hundred, so the marginal cost per provider is ZERO queries. That is the number
 * the brief asked for, and it is the reason the umbrella row is not needed to
 * make this affordable.
 *
 * ⚠ IT IS FIXED BECAUSE EVERY QUERY IS SCOPED TO THE WORK REQUEST AND FANNED OUT
 * IN MEMORY, never called inside a loop over providers. A per-provider caller
 * (`sourcingStageForProvider`) exists for the single-row case and is DELIBERATELY
 * built on the same six — one provider is the cheap case, not a different
 * algorithm.
 */

/**
 * ⚠ ORDER IS PRECEDENCE, HIGHEST FIRST. `stageRank` reads this array, so the
 * ordering is the rule rather than a comment about it.
 */
export const SOURCING_STAGES = [
  "ASSIGNED",
  "DECLINED",
  "SHORTLISTED",
  "INTERVIEWED",
  "TESTED",
  "BID",
  "INVITED",
] as const;

export type SourcingStage = (typeof SOURCING_STAGES)[number];

/**
 * The documents that exist for ONE provider on ONE work request. Booleans, not
 * rows: the stage is a question about EXISTENCE, and passing rows in would
 * tempt a caller into deriving something else from them here.
 */
export type SourcingEvidence = {
  /** An ITB was issued to this provider. */
  invited: boolean;
  /** A bid was SUBMITTED — a DRAFT bid the provider never sent is not a bid. */
  bid: boolean;
  /** A test response reached COMPLETED. */
  tested: boolean;
  /** An interview request reached COMPLETED. */
  interviewed: boolean;
  /** A shortlist line names this provider. */
  shortlisted: boolean;
  /** A work order exists against this work request for this provider. */
  assigned: boolean;
  /** ⚠ The ITB or the bid was declined — by EITHER side. */
  declined: boolean;
};

/**
 * ⚠⚠ THE ONE FUNCTION. Every caller reads this and nothing re-derives it.
 *
 * ⚠ THE TWO TERMINAL STAGES OUTRANK THE PROGRESS ONES, AND `ASSIGNED` OUTRANKS
 * `DECLINED`. A provider who declined an ITB and was later hired anyway — off a
 * second conversation, which is a marketplace, not a bug — is ASSIGNED. Reading
 * it the other way would show "declined" next to somebody who is currently doing
 * the work.
 *
 * ⚠ `null` MEANS "NOT IN THIS PROCESS AT ALL", which is not the same as INVITED.
 * A grid that renders an un-invited provider as INVITED has invented an invitation.
 */
export function sourcingStage(e: SourcingEvidence): SourcingStage | null {
  if (e.assigned) return "ASSIGNED";
  if (e.declined) return "DECLINED";
  if (e.shortlisted) return "SHORTLISTED";
  if (e.interviewed) return "INTERVIEWED";
  if (e.tested) return "TESTED";
  if (e.bid) return "BID";
  if (e.invited) return "INVITED";
  return null;
}

/** Sort position for a grid — 0 is furthest along. */
export function stageRank(stage: SourcingStage): number {
  return SOURCING_STAGES.indexOf(stage);
}

const EMPTY: SourcingEvidence = {
  invited: false,
  bid: false,
  tested: false,
  interviewed: false,
  shortlisted: false,
  assigned: false,
  declined: false,
};

/**
 * Load the evidence for every provider on one work request — ⚠ SIX QUERIES,
 * FIXED, regardless of how many providers are involved.
 *
 * ⚠ EACH QUERY SELECTS ONLY `provider_person_id` AND WHAT THE PREDICATE NEEDS.
 * Nothing here loads a bid's lines or an interview's notes; this is a stage, and
 * a stage is seven booleans.
 */
export async function sourcingEvidenceForWorkRequest(
  workRequestId: string
): Promise<Map<string, SourcingEvidence>> {
  const out = new Map<string, SourcingEvidence>();
  const at = (personId: string): SourcingEvidence => {
    let row = out.get(personId);
    if (!row) {
      row = { ...EMPTY };
      out.set(personId, row);
    }
    return row;
  };

  const [itbs, bids, tests, interviews, shortlisted, orders] = await Promise.all([
    /* 1 */ prisma.bidRequest.findMany({
      where: { work_request_id: workRequestId },
      select: { id: true, provider_person_id: true, status: true },
    }),
    /* 2 */ prisma.providerBid.findMany({
      where: { bidRequest: { work_request_id: workRequestId } },
      select: { provider_person_id: true, status: true, submitted_at: true },
    }),
    /* 3 */ prisma.testResponse.findMany({
      where: { testRequest: { work_request_id: workRequestId }, status: "COMPLETED" },
      select: { provider_person_id: true },
    }),
    /* 4 */ prisma.interviewRequest.findMany({
      where: { work_request_id: workRequestId, status: "COMPLETED" },
      select: { provider_person_id: true },
    }),
    /* 5 */ prisma.shortlistLine.findMany({
      where: { shortlist: { work_request_id: workRequestId } },
      select: { provider_person_id: true },
    }),
    /* 6 */ prisma.workOrder.findMany({
      where: { work_request_id: workRequestId },
      select: { provider_person_id: true },
    }),
  ]);

  for (const r of itbs) {
    const e = at(r.provider_person_id);
    e.invited = true;
    if (r.status === "DECLINED") e.declined = true;
  }
  for (const b of bids) {
    const e = at(b.provider_person_id);
    /* ⚠ A DRAFT BID IS NOT A BID. The provider has not sent it, and showing the
       buyer "BID" for a draft nobody submitted is an invented response. */
    if (b.submitted_at != null && b.status !== "DRAFT") e.bid = true;
    if (b.status === "DECLINED") e.declined = true;
  }
  for (const t of tests) at(t.provider_person_id).tested = true;
  for (const i of interviews) at(i.provider_person_id).interviewed = true;
  for (const s of shortlisted) at(s.provider_person_id).shortlisted = true;
  for (const o of orders) at(o.provider_person_id).assigned = true;

  return out;
}

/** The stage for every provider on one work request. ⚠ Six queries, total. */
export async function sourcingStagesForWorkRequest(
  workRequestId: string
): Promise<Map<string, SourcingStage>> {
  const evidence = await sourcingEvidenceForWorkRequest(workRequestId);
  const out = new Map<string, SourcingStage>();
  for (const [personId, e] of evidence) {
    const stage = sourcingStage(e);
    if (stage) out.set(personId, stage);
  }
  return out;
}

/**
 * One provider's stage.
 *
 * ⚠ BUILT ON THE SAME SIX QUERIES ON PURPOSE. It would be cheaper to write seven
 * narrow `count()`s here — and that would be a SECOND derivation, which is the
 * one thing this file exists to prevent. ⚠⚠ NEVER CALL THIS IN A LOOP OVER
 * PROVIDERS; that is the shape that turns a fixed six into six per provider. Use
 * `sourcingStagesForWorkRequest` and read the map.
 */
export async function sourcingStageForProvider(
  workRequestId: string,
  providerPersonId: string
): Promise<SourcingStage | null> {
  const stages = await sourcingStagesForWorkRequest(workRequestId);
  return stages.get(providerPersonId) ?? null;
}
