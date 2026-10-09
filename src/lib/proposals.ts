import { PROPOSAL_LABEL } from "@/lib/oracle-status";
import type { ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SourcingError, inviteIsOpen } from "@/lib/sourcing";
import { notify } from "@/lib/notifications";
import { loadOwned, resolveBuyer } from "@/lib/work-request";
import type { Viewer } from "@/lib/access";

export type ProposalDraft = {
  workRequestId: string;
  coverNote?: string | null;
  validUntil?: string | null;
  rate?: {
    unitPriceCents: number;
    uom?: string | null;
    basis?: "RATE" | "AMOUNT";
  } | null;
};

async function writeRate(
  proposalId: string,
  rate: NonNullable<ProposalDraft["rate"]> | null
): Promise<void> {
  if (!rate) return;
  if (!Number.isInteger(rate.unitPriceCents) || rate.unitPriceCents <= 0) {
    throw new SourcingError("Enter your rate.", "BAD_RATE");
  }
  await prisma.$transaction([
    prisma.proposalLine.deleteMany({ where: { proposal_id: proposalId } }),
    prisma.proposalLine.create({
      data: {
        proposal_id: proposalId,
        line_number: 1,
        proposal_request_line_id: null,
        basis: rate.basis ?? "RATE",
        uom: rate.uom ?? "HOUR",
        quantity: null,
        unit_price_cents: rate.unitPriceCents,
        amount_cents: null,
      },
    }),
  ]);
}

const PROPOSAL_IS_DECIDED: Record<ProposalStatus, boolean> = {
  DRAFT: false,
  SUBMITTED: false,
  SHORTLISTED: false,
  WITHDRAWN: true,
  DECLINED: true,
  AWARDED: true,
  NOT_SELECTED: true,
};

export type ProposalRate = {
  unitPriceCents: number;
  uom: string | null;
  basis: "RATE" | "AMOUNT";
};

export type ExistingProposal = {
  id: string;
  status: ProposalStatus;
  coverNote: string | null;
  validUntil: Date | null;
  submittedAt: Date | null;
  rate: ProposalRate | null;
  editable: boolean;
};

export type ProposeVerdict =
  | {
      can: true;
      request: { id: string; title: string; buyerPersonId: string };
      inviteId: string | null;
      existing: ExistingProposal | null;
    }
  | { can: false; code: string; message: string; existing: ExistingProposal | null };

export async function proposeEligibility(
  providerPersonId: string,
  workRequestId: string,
  now: Date = new Date()
): Promise<ProposeVerdict> {
  const request = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: {
      id: true,
      status: true,
      proposal_access: true,
      buyer_person_id: true,
      title: true,
    },
  });

  const row = await prisma.proposal.findUnique({
    where: {
      work_request_id_provider_person_id: {
        work_request_id: workRequestId,
        provider_person_id: providerPersonId,
      },
    },
    select: {
      id: true,
      status: true,
      cover_note: true,
      valid_until: true,
      submitted_at: true,
      lines: {
        select: { unit_price_cents: true, uom: true, basis: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
  });

  const line = row?.lines[0];
  const existing: ExistingProposal | null = row
    ? {
        id: row.id,
        status: row.status,
        coverNote: row.cover_note,
        validUntil: row.valid_until,
        submittedAt: row.submitted_at,
        rate:
          line && line.unit_price_cents !== null
            ? {
                unitPriceCents: line.unit_price_cents,
                uom: line.uom,
                basis: line.basis,
              }
            : null,
        editable: !PROPOSAL_IS_DECIDED[row.status],
      }
    : null;

  const no = (code: string, message: string): ProposeVerdict => ({
    can: false,
    code,
    message,
    existing,
  });

  if (!request) return no("NOT_FOUND", "That work request isn't available.");

  if (request.status !== "POSTED") {
    return no("REQUEST_NOT_OPEN", "This work request isn't open for proposals.");
  }

  let inviteId: string | null = null;
  if (request.proposal_access === "INVITE_ONLY") {
    const itb = await prisma.proposalRequest.findFirst({
      where: { work_request_id: request.id, provider_person_id: providerPersonId },
      select: { id: true, status: true, responds_by: true },
    });
    if (!itb) {
      return no(
        "NOT_INVITED",
        "This work request is invite only, and you haven't been invited."
      );
    }
    if (!inviteIsOpen(itb, now)) {
      return no("INVITE_CLOSED", "That invitation is closed.");
    }
    inviteId = itb.id;
  }

  if (existing && !existing.editable) {
    return no(
      "ALREADY_DECIDED",
      "This proposal has already been answered and can't be changed."
    );
  }

  return {
    can: true,
    request: {
      id: request.id,
      title: request.title,
      buyerPersonId: request.buyer_person_id,
    },
    inviteId,
    existing,
  };
}

async function ownProvider(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

export async function submitProposal(
  viewer: Viewer,
  draft: ProposalDraft,
  now: Date = new Date()
): Promise<{ id: string; replaced: boolean }> {
  const provider = await ownProvider(viewer);

  const verdict = await proposeEligibility(provider.id, draft.workRequestId, now);
  if (!verdict.can) throw new SourcingError(verdict.message, verdict.code);
  const { request, existing } = verdict;

  const validUntil = draft.validUntil ? new Date(draft.validUntil) : null;
  const coverNote = draft.coverNote?.trim() || null;

  if (existing) {
    await prisma.proposal.update({
      where: { id: existing.id },
      data: {
        cover_note: coverNote,
        valid_until: validUntil,
        status: "SUBMITTED",
        submitted_at: now,
      },
    });
    await writeRate(existing.id, draft.rate ?? null);
    return { id: existing.id, replaced: true };
  }

  const created = await prisma.proposal.create({
    data: {
      proposal_number: `PRO-${now.getTime().toString(36).toUpperCase()}-${provider.id.slice(0, 4)}`,
      work_request_id: request.id,
      // NULL ON AN OPEN REQUEST. That is the whole reason the column was
      proposal_request_id: verdict.inviteId,
      provider_person_id: provider.id,
      cover_note: coverNote,
      valid_until: validUntil,
      status: "SUBMITTED",
      submitted_at: now,
    },
    select: { id: true },
  });

  await writeRate(created.id, draft.rate ?? null);

  // THE BUYER IS TOLD, THROUGH THE ONE WRITER
  await notify({
    event: "work.proposal_received",
    personId: request.buyerPersonId,
    entityType: "proposal",
    entityId: created.id,
    dedupeKey: `work.proposal_received:${created.id}`,
    vars: { requestTitle: request.title, requestId: request.id },
  });

  return { id: created.id, replaced: false };
}

/** WITHDRAWAL IS RECORDED, NEVER DELETED (WS-A item 3). */
export async function withdrawProposal(
  viewer: Viewer,
  proposalId: string
): Promise<void> {
  const provider = await ownProvider(viewer);
  // OWNER-SCOPED IN THE `where`, so a crafted id cannot withdraw somebody
  const res = await prisma.proposal.updateMany({
    where: {
      id: proposalId,
      provider_person_id: provider.id,
      status: { in: ["DRAFT", "SUBMITTED"] },
    },
    data: { status: "WITHDRAWN" },
  });
  if (res.count === 0) {
    throw new SourcingError(
      "That proposal can't be withdrawn.",
      "NOT_WITHDRAWABLE"
    );
  }

  // The buyer's worklist item goes with it — they no longer owe a response to
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.proposal_received:${proposalId}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}

// WS-D · THE BUYER READS THE PROPOSALS. READ-ONLY — NO DECISION IS TAKEN.

/** A `Record`, SO AN EIGHTH `ProposalStatus` IS A COMPILE ERROR. The */
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = PROPOSAL_LABEL;

/** One proposal as the buyer's compare view reads it. */
export type ProposalForBuyer = {
  id: string;
  proposalNumber: string;
  providerPersonId: string;
  providerName: string;
  status: ProposalStatus;
  statusLabel: string;
  submittedAt: Date | null;
  validUntil: Date | null;
  coverNote: string | null;
  /** NULL IS A REAL STATE, NOT AN UNCOUNTABLE ONE. `ProposalDraft.rate` is */
  rate: ProposalRate | null;
  /** Set when the proposal answers an invitation; null on an open request. */
  invited: boolean;
  /** THE TWO OPTIONAL STEPS ( WS-E) */
  interviewStatus: string | null;
  testStatus: string | null;
};

/** EVERY PROPOSAL ON ONE WORK REQUEST, FOR ITS BUYER ( WS-D) */
export async function proposalsOn(
  viewer: Viewer,
  workRequestId: string
): Promise<ProposalForBuyer[]> {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, workRequestId, pAccountId);

  const rows = await prisma.proposal.findMany({
    where: { work_request_id: wr.id, submitted_at: { not: null } },
    select: {
      id: true,
      proposal_number: true,
      provider_person_id: true,
      status: true,
      submitted_at: true,
      valid_until: true,
      cover_note: true,
      proposal_request_id: true,
      lines: {
        select: { unit_price_cents: true, uom: true, basis: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
    orderBy: { submitted_at: "asc" },
  });
  if (rows.length === 0) return [];

  const providerIds = rows.map((r) => r.provider_person_id);
  // THE TWO OPTIONAL STEPS, READ ONCE FOR THE WHOLE LIST ( WS-E).
  const [people, interviews, tests] = await Promise.all([
    prisma.person.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.interviewRequest.findMany({
      where: { work_request_id: wr.id, provider_person_id: { in: providerIds } },
      select: { provider_person_id: true, status: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.testRequest.findMany({
      where: { work_request_id: wr.id, provider_person_id: { in: providerIds } },
      select: { provider_person_id: true, status: true },
      orderBy: { created_at: "desc" },
    }),
  ]);
  // The NEWEST per provider wins — `orderBy` desc then first-write, because a
  const interviewOf = new Map<string, string>();
  for (const i of interviews) if (!interviewOf.has(i.provider_person_id)) interviewOf.set(i.provider_person_id, i.status);
  const testOf = new Map<string, string>();
  for (const t of tests) if (!testOf.has(t.provider_person_id)) testOf.set(t.provider_person_id, t.status);
  const nameOf = new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );

  return rows.map((r) => {
    const line = r.lines[0];
    return {
      id: r.id,
      proposalNumber: r.proposal_number,
      providerPersonId: r.provider_person_id,
      // blank cell, and "A provider" is true of every row that hits it.
      providerName: nameOf.get(r.provider_person_id) || "A provider",
      status: r.status,
      statusLabel: PROPOSAL_STATUS_LABEL[r.status],
      submittedAt: r.submitted_at,
      validUntil: r.valid_until,
      coverNote: r.cover_note,
      rate:
        line && line.unit_price_cents !== null
          ? {
              unitPriceCents: line.unit_price_cents,
              uom: line.uom,
              basis: line.basis,
            }
          : null,
      invited: r.proposal_request_id !== null,
      interviewStatus: interviewOf.get(r.provider_person_id) ?? null,
      testStatus: testOf.get(r.provider_person_id) ?? null,
    };
  });
}
