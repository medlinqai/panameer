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
      /* ⚠⚠ NULL ON AN OPEN REQUEST. That is the whole reason the column was
         made nullable — ruling 14's open half was unreachable while a proposal
         required an invite. */
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

  /*
    ── ⚠⚠ THE BUYER IS TOLD, THROUGH THE ONE WRITER (`E620`) ───────────────
    ⚠ Ruling 37's finding: all four chain events are registered and uncalled —
    *"call it, do not invent a second."* This is the first of them to fire.
    ⚠⚠ IT IS A WORKLIST ITEM: the buyer OWES a response, and it stays until
    they give one. ⚠⚠⚠ `notify` CATCHES ITS OWN FAILURES AND NEVER RETHROWS, so
    a notification outage cannot turn a submitted proposal into an error the
    provider sees — proved by `check:notify-prefs` §4.
    ⚠ Deduped on the proposal, so a replacement does not tell the buyer twice.
  */
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

/**
 * ⚠⚠⚠ WITHDRAWAL IS RECORDED, NEVER DELETED (WS-A item 3).
 *
 * ⚠ A deleted proposal reads to the buyer as though it was never sent, and to
 * the provider as though nothing happened — the same argument that keeps a
 * declined group request on the books (`E619`). ⚠⚠ The row stays, the status
 * moves, and `submitted_at` is left alone because it records when they sent it,
 * which remains true.
 */
export async function withdrawProposal(
  viewer: Viewer,
  proposalId: string
): Promise<void> {
  const provider = await ownProvider(viewer);
  /* ⚠⚠ OWNER-SCOPED IN THE `where`, so a crafted id cannot withdraw somebody
     else's proposal (load-bearing rule 5). `updateMany` matches nothing rather
     than throwing on a row that was never yours. */
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

  /* ⚠ The buyer's worklist item goes with it — they no longer owe a response to
     a proposal that has been taken back. ⚠⚠ Cleared, never deleted: the
     notification is a record that it happened. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.proposal_received:${proposalId}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-D · THE BUYER READS THE PROPOSALS. ⚠⚠⚠ READ-ONLY — NO DECISION IS TAKEN.
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ **A `Record`, SO AN EIGHTH `ProposalStatus` IS A COMPILE ERROR.** The
 * same call `WORK_REQUEST_STATUS_LABEL` made in WS-A, and for the reason WS-A
 * measured: two pages there turned a five-value enum into copy with a ternary
 * on ONE value, so three states silently read *"Draft"*.
 * ⚠ **THE MODEL'S NAMES ARE NOT THE MEMBER'S NAMES.** A buyer reading
 * `NOT_SELECTED` learns less than one reading *"Not selected"*, and
 * `SHORTLISTED` is the buyer's own earlier act, not a status the provider set.
 */
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SHORTLISTED: "Shortlisted",
  WITHDRAWN: "Withdrawn",
  DECLINED: "Declined",
  AWARDED: "Awarded",
  NOT_SELECTED: "Not selected",
};

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
  /**
   * ⚠⚠⚠ NULL IS A REAL STATE, NOT AN UNCOUNTABLE ONE. `ProposalDraft.rate` is
   * optional — *"a provider may pitch before pricing"* — so a proposal with no
   * rate is a thing that happened, and the page says **"No rate given"** rather
   * than printing a dash. ⚠ Ruling 18: a dash means *we cannot count this*, and
   * this is not that.
   */
  rate: ProposalRate | null;
  /** ⚠ Set when the proposal answers an invitation; null on an open request. */
  invited: boolean;
  /**
   * ── ⚠⚠ THE TWO OPTIONAL STEPS (`E683a` WS-E) ───────────────────────────
   * ⚠ `null` means *"not asked"*, which is a real and common state — **not an
   * uncountable one** (ruling 18). The page says *"Not requested"* rather than
   * printing a dash.
   * ⚠⚠⚠ **NEITHER IS A PRECONDITION OF SELECTION**, and `check:work-chain`
   * fails if `selection.ts` ever reads either table.
   */
  interviewStatus: string | null;
  testStatus: string | null;
};

/**
 * ── ⚠⚠⚠ EVERY PROPOSAL ON ONE WORK REQUEST, FOR ITS BUYER (`E682` WS-D) ───
 *
 * ⚠⚠ **WHY THIS IS READ-ONLY AND MUST STAY SO.** WS-D's line in the brief is
 * *"the requester's view of all bids on one `WorkRequest`. **READ-ONLY — no
 * decision is taken here.**"* ⚠⚠⚠ So this function returns rows and **nothing
 * on the page it feeds may write** — shortlisting, declining and awarding are
 * WS-F's `selectProvider`, which does not yet have a surface. ⚠ Rendering a
 * `Select` button here would be `E579` exactly: a control whose handler does
 * not exist.
 *
 * ── ⚠⚠ OWNER-SCOPED TWICE, DELIBERATELY ─────────────────────────────────
 *
 * ⚠ `resolveBuyer` + `loadOwned` are `invitedOn`'s pattern, and they are what
 * make *"not yours"* and *"does not exist"* the same answer (`loadOwned`
 * throws, the page 404s). ⚠⚠ The page that calls this ALREADY proved ownership
 * through `getWorkRequestDetail`, and this repeats it on purpose: a lib that
 * trusts its caller's earlier check is a lib that leaks the first time somebody
 * calls it from somewhere else (load-bearing rule 5).
 *
 * ── ⚠⚠⚠ `submitted_at IS NOT NULL`, WHICH IS NOT THE SAME AS "not DRAFT" ──
 *
 * ⚠⚠ **A PROVIDER'S UNSENT DRAFT IS NOT A PROPOSAL AND THE BUYER MUST NOT SEE
 * ONE.** `status` defaults to `DRAFT` in the schema, so filtering on the status
 * enum would depend on nothing ever writing a draft row; filtering on
 * `submitted_at` asks the question directly. ⚠ It is also the column *Proposals
 * Sent* already counts, so the compare view and Statistics cannot disagree
 * about what a sent proposal is (`E585`).
 *
 * ⚠⚠ **WITHDRAWN PROPOSALS ARE INCLUDED, AND THAT IS THE POINT OF RECORDING
 * RATHER THAN DELETING THEM.** `withdrawProposal`'s own reason: *"a deleted
 * proposal reads to the buyer as though it was never sent."* Hiding it here
 * would recreate exactly that, one layer up.
 *
 * ⚠ **ARRIVAL ORDER, AND THE PAGE SAYS SO.** Sorting by price would be a
 * ranking, and a ranking is a judgement this read has no business making on a
 * screen whose whole instruction is that no decision is taken.
 */
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
  /*
    ⚠⚠ THE TWO OPTIONAL STEPS, READ ONCE FOR THE WHOLE LIST (`E683a` WS-E).
    ⚠ One query each rather than one per row — 23 proposals would otherwise be
    46 round trips for two columns.
    ⚠⚠⚠ **READ, NEVER WRITTEN HERE.** This function feeds a view; the writers
    are `requestInterview` and `sendTest`, reached through their own routes.
  */
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
  /* ⚠ The NEWEST per provider wins — `orderBy` desc then first-write, because a
     buyer may ask again after a decline and the latest ask is the live one. */
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
      /* ⚠ `invitedOn`'s fallback, for the same reason — a missing name is not a
         blank cell, and "A provider" is true of every row that hits it. */
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
