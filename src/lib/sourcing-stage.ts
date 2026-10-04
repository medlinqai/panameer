import { prisma } from "@/lib/prisma";

export const SOURCING_STAGES = [
  "ASSIGNED",
  "DECLINED",
  "SHORTLISTED",
  "INTERVIEWED",
  "TESTED",
  "PROPOSED",
  "INVITED",
] as const;

export type SourcingStage = (typeof SOURCING_STAGES)[number];

export const SOURCING_STAGE_LABEL: Record<SourcingStage, string> = {
  ASSIGNED: "This work is assigned to you",
  DECLINED: "This one was declined",
  SHORTLISTED: "You are on the shortlist",
  INTERVIEWED: "Your interview is done",
  TESTED: "Your work test is done",
  PROPOSED: "Your proposal is in",
  INVITED: "You were invited to propose",
};

export type SourcingEvidence = {
  /** An ITB was issued to this provider. */
  invited: boolean;
  /** A bid was SUBMITTED — a DRAFT bid the provider never sent is not a bid. */
  proposal: boolean;
  /** A test response reached COMPLETED. */
  tested: boolean;
  /** An interview request reached COMPLETED. */
  interviewed: boolean;
  /** A shortlist line names this provider. */
  shortlisted: boolean;
  /** A work order exists against this work request for this provider. */
  assigned: boolean;
  declined: boolean;
};

export function sourcingStage(e: SourcingEvidence): SourcingStage | null {
  if (e.assigned) return "ASSIGNED";
  if (e.declined) return "DECLINED";
  if (e.shortlisted) return "SHORTLISTED";
  if (e.interviewed) return "INTERVIEWED";
  if (e.tested) return "TESTED";
  if (e.proposal) return "PROPOSED";
  if (e.invited) return "INVITED";
  return null;
}

/** Sort position for a grid — 0 is furthest along. */
export function stageRank(stage: SourcingStage): number {
  return SOURCING_STAGES.indexOf(stage);
}

const EMPTY: SourcingEvidence = {
  invited: false,
  proposal: false,
  tested: false,
  interviewed: false,
  shortlisted: false,
  assigned: false,
  declined: false,
};

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
    /* 1 */ prisma.proposalRequest.findMany({
      where: { work_request_id: workRequestId },
      select: { id: true, provider_person_id: true, status: true },
    }),
    /* 2 */ prisma.proposal.findMany({
      where: { proposalRequest: { work_request_id: workRequestId } },
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
    if (b.submitted_at != null && b.status !== "DRAFT") e.proposal = true;
    if (b.status === "DECLINED") e.declined = true;
  }
  for (const t of tests) at(t.provider_person_id).tested = true;
  for (const i of interviews) at(i.provider_person_id).interviewed = true;
  for (const s of shortlisted) at(s.provider_person_id).shortlisted = true;
  for (const o of orders) at(o.provider_person_id).assigned = true;

  return out;
}

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

export async function sourcingStageForProvider(
  workRequestId: string,
  providerPersonId: string
): Promise<SourcingStage | null> {
  const stages = await sourcingStagesForWorkRequest(workRequestId);
  return stages.get(providerPersonId) ?? null;
}
