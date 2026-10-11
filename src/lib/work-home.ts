import type { ProposalRequestStatus, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// WS-E003: the provider's Work numbers — real counts only.
export const OPEN_INVITE: ProposalRequestStatus[] = ["ISSUED", "VIEWED"];
export const PROPOSAL_OUT: ProposalStatus[] = ["SUBMITTED", "SHORTLISTED"];

export async function workHome(personId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [invitations, proposalsOut, openOrders, invited30, proposed30, agreed30, working30, newest] = await Promise.all([
    prisma.proposalRequest.count({ where: { provider_person_id: personId, status: { in: OPEN_INVITE } } }),
    prisma.proposal.count({ where: { provider_person_id: personId, status: { in: PROPOSAL_OUT } } }),
    prisma.workOrder.count({ where: { provider_person_id: personId, status: { in: ["RELEASED", "ACTIVE"] } } }),
    prisma.proposalRequest.count({ where: { provider_person_id: personId, issued_at: { gte: since } } }),
    prisma.proposal.count({ where: { provider_person_id: personId, submitted_at: { gte: since } } }),
    prisma.proposal.count({ where: { provider_person_id: personId, status: "AWARDED", updated_at: { gte: since } } }),
    prisma.workOrder.count({ where: { provider_person_id: personId, status: { in: ["RELEASED", "ACTIVE"] }, provider_accepted_at: { gte: since } } }),
    prisma.proposalRequest.findFirst({ where: { provider_person_id: personId, status: { in: OPEN_INVITE } }, orderBy: { issued_at: "desc" }, select: { work_request_id: true, invited_by_person_id: true } }),
  ]);
  let newestLine: { title: string; from: string } | null = null;
  if (newest) {
    const [wr, by] = await Promise.all([
      prisma.workRequest.findUnique({ where: { id: newest.work_request_id }, select: { title: true } }),
      prisma.person.findUnique({ where: { id: newest.invited_by_person_id }, select: { first_name: true, last_name: true } }),
    ]);
    newestLine = { title: wr?.title || "Untitled work request", from: by ? `${by.first_name} ${by.last_name}`.trim() : "a buyer" };
  }
  return { invitations, proposalsOut, openOrders, funnel: { invited: invited30, proposed: proposed30, agreed: agreed30, inWork: working30 }, newest: newestLine };
}

/** Work request ids behind the Invitations and My Proposals tabs. */
export async function myWorkRequestIds(personId: string, tab: "invitations" | "proposals"): Promise<string[]> {
  const rows =
    tab === "invitations"
      ? await prisma.proposalRequest.findMany({ where: { provider_person_id: personId, status: { in: OPEN_INVITE } }, select: { work_request_id: true } })
      : await prisma.proposal.findMany({ where: { provider_person_id: personId, status: { not: "DRAFT" } }, select: { work_request_id: true } });
  return rows.map((r) => r.work_request_id);
}
