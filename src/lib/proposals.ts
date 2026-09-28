import type { ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SourcingError, inviteIsOpen } from "@/lib/sourcing";
import { notify } from "@/lib/notifications";
import { loadOwned, resolveBuyer } from "@/lib/work-request";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ A PROVIDER PROPOSES (`P2-A8-E621` WS-A) ─────────────────────────
 *
 * ⚠⚠ **THE FIRST MISSING WRITER, AND EVERYTHING DOWNSTREAM WAITED ON IT.**
 * `Proposal` has existed since `E388` with zero rows, and Statistics said
 * *"Proposals aren't recorded yet — nothing creates one"*. ⚠⚠⚠ RULING 24: that
 * sentence was true **because nobody built the form that creates one**, and
 * citing it as the reason not to build the writer is circular — the rule then
 * proves itself forever. This is that writer.
 *
 * ── ⚠⚠ WHO MAY PROPOSE — RULING 14, AND IT IS THE REQUEST'S OWN SWITCH ───
 *
 * ⚠ SCOTT, 2026-09-24: **"The buyer picks, per request."**
 * · `INVITE_ONLY` → the provider must hold an OPEN `ProposalRequest`.
 * · `OPEN` → any provider may propose, invited or not.
 * ⚠⚠ THE SWITCH IS READ FROM THE REQUEST, NEVER INFERRED from whether an
 * invite happens to exist — inferring it would silently make every request
 * invite-only the moment somebody was invited to it.
 *
 * ── ⚠⚠ WHAT THIS FILE DELIBERATELY DOES NOT DO ──────────────────────────
 *
 * ⚠⚠⚠ **IT NEVER READS OR WRITES AN ESTIMATED-SAVINGS FIGURE.** The roadmap's
 * number is Panameer's estimate of what a fix is worth, and any provider who
 * sees it prices against it. ⚠ MEASURED AT `E621`'s PREMISE CHECK: there is no
 * savings or roadmap field in the schema at all, so the constraint is a rule to
 * PRESERVE rather than a leak to close — and `check:proposals` asserts this
 * module cannot grow one.
 * ⚠ It moves no money and touches no `Payment` (ruling 25).
 */

/** What a provider sends. ⚠ Their price lives on the LINES, not here. */
export type ProposalDraft = {
  workRequestId: string;
  coverNote?: string | null;
  validUntil?: string | null;
  /**
   * ⚠⚠⚠ THEIR RATE (WS-A item 1: *"their rate, their pitch"*), ADDED IN WS-C
   * BECAUSE WS-C IS WHERE ITS ABSENCE BIT.
   *
   * ⚠ MEASURED 2026-09-25: `ProposalLine.proposal_request_line_id` was **NOT
   * NULL**, and **nothing in `src/` creates a `ProposalRequestLine`** — 0 rows, 0
   * writers. ⚠⚠ So a proposal line was unwritable by EVERY route, and a
   * proposal could carry no price at all. WS-C then had nothing to multiply the
   * buyer's hours by. ⚠⚠⚠ The column is now nullable (one `DROP NOT NULL`, zero
   * rows, zero readers — the diff was printed before it was pushed).
   *
   * ⚠ Optional, because a provider may pitch before pricing; **selection
   * REFUSES a proposal with no rate** rather than inventing one.
   */
  rate?: {
    unitPriceCents: number;
    /** ⚠ Defaults to `HOUR`. A rate without a unit is a number, not a price. */
    uom?: string | null;
    /** ⚠ `RATE` is hours at a price; `AMOUNT` is a fixed fee for the whole job. */
    basis?: "RATE" | "AMOUNT";
  } | null;
};

/**
 * ⚠⚠⚠ ONE RATE LINE, REPLACED RATHER THAN APPENDED.
 *
 * ⚠ A provider revising their price must end with ONE rate, not a history of
 * them — two priced lines on one proposal is two prices, and the buyer's screen
 * would have to pick. ⚠⚠ `deleteMany` then `create`, inside a transaction, so a
 * failure cannot leave the proposal priceless between the two statements.
 *
 * ⚠ `quantity` IS DELIBERATELY NULL. **The provider states a rate; the buyer's
 * dates decide how many hours.** A provider-supplied quantity would be a second
 * source for the number WS-C computes from the dates.
 */
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
        /* ⚠⚠ NULL ON AN OPEN REQUEST — see `ProposalDraft.rate`. This is the
           half that the NOT NULL made unreachable for every route. */
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

/**
 * ── ⚠⚠⚠ IS THIS PROPOSAL STILL THE PROVIDER'S TO CHANGE? ──────────────────
 *
 * ⚠⚠ **A `Record`, SO AN EIGHTH `ProposalStatus` IS A COMPILE ERROR** rather
 * than silently inheriting `false` and becoming editable after a decision.
 * ⚠ It reproduces the inline list it replaced, value for value — ⚠ SUPERSEDED,
 * quoted not deleted (`E164`):
 * //   const decided = ["AWARDED", "NOT_SELECTED", "DECLINED", "WITHDRAWN"];
 *
 * ⚠⚠ `SHORTLISTED` IS DELIBERATELY *NOT* DECIDED — being on a shortlist is not
 * an answer, and a provider may still revise their price while they are on one.
 * ⚠ `WITHDRAWN` is decided because the provider themselves ended it.
 */
const PROPOSAL_IS_DECIDED: Record<ProposalStatus, boolean> = {
  DRAFT: false,
  SUBMITTED: false,
  SHORTLISTED: false,
  WITHDRAWN: true,
  DECLINED: true,
  AWARDED: true,
  NOT_SELECTED: true,
};

/** ⚠ The one rate line, as the page reads it back. */
export type ProposalRate = {
  unitPriceCents: number;
  uom: string | null;
  basis: "RATE" | "AMOUNT";
};

/** ⚠ What this provider has already sent, if anything. */
export type ExistingProposal = {
  id: string;
  status: ProposalStatus;
  coverNote: string | null;
  validUntil: Date | null;
  submittedAt: Date | null;
  rate: ProposalRate | null;
  /** ⚠⚠ Computed HERE, from `PROPOSAL_IS_DECIDED`, so no caller re-decides it. */
  editable: boolean;
};

export type ProposeVerdict =
  | {
      can: true;
      request: { id: string; title: string; buyerPersonId: string };
      /** ⚠ The open invite this proposal answers; null on an `OPEN` request. */
      inviteId: string | null;
      existing: ExistingProposal | null;
    }
  | { can: false; code: string; message: string; existing: ExistingProposal | null };

/**
 * ── ⚠⚠⚠ ONE DEFINITION OF "MAY THIS PROVIDER PROPOSE" (`E585`) ────────────
 *
 * ⚠⚠⚠ **WS-C EXISTS BECAUSE THE WRITER WAS UNREACHABLE, AND THE OBVIOUS WAY TO
 * REACH IT WAS THE WRONG ONE.** A form has to decide whether to render at all,
 * and the cheapest way to decide that is to ask the same four questions the
 * writer asks — status, ruling 14's switch, the invite's date, the decision —
 * **in the page**. ⚠⚠ That is two definitions of one rule, and
 * `decisions_2026-09-23.md` §13 says exactly where they surface: *"TWO
 * DEFINITIONS OF ONE THING WILL DISAGREE IN PUBLIC"* — here, as a form that
 * renders and then refuses, or one that hides work a provider could have won.
 *
 * ⚠ **SO THE REFUSAL AND THE RENDER READ THE SAME FUNCTION.** `submitProposal`
 * throws `verdict.message` / `verdict.code`; the page renders the form only on
 * `can: true` and prints that same message when it is false. ⚠⚠ A provider can
 * therefore never be shown a control whose handler would refuse it (`E579`).
 *
 * ⚠⚠ **THE ORDER OF THE CHECKS IS PART OF THE ANSWER** and is unchanged from the
 * writer: missing → not posted → not invited → invite closed → already decided.
 * ⚠ Every message and code is byte-identical to the ones `submitProposal` threw
 * before this extraction, which is what keeps `check:proposals` honest about it.
 *
 * ⚠ `providerPersonId` IS RESOLVED FROM THE SESSION BY BOTH CALLERS and is never
 * accepted from a request body (load-bearing rule 5).
 */
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

  /* ⚠⚠ READ FIRST, SO A REFUSAL CAN STILL SHOW THE PROVIDER WHAT THEY SENT. A
     proposal that can no longer be changed is still theirs to READ, and a page
     that hides it on refusal would read as though it had been thrown away. */
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
        /* ⚠ `writeRate` keeps exactly one line and replaces it, so this is the
           rate — not the first of several prices. */
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

  /*
    ⚠⚠ ONLY A POSTED REQUEST TAKES PROPOSALS. A `DRAFT` is not public, and a
    request already `ASSIGNED` or `ORDERED` has its provider — proposing into
    either is proposing into a decision that is made.
  */
  if (request.status !== "POSTED") {
    return no("REQUEST_NOT_OPEN", "This work request isn't open for proposals.");
  }

  /* ⚠⚠⚠ RULING 14, READ FROM THE REQUEST. */
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
    /*
      ⚠⚠ THE PREDICATE IS IMPORTED, NOT RESTATED (WS-A item 5). It checks the
      STATUS **and** the closing date, because `responds_by` passing does not
      rewrite the row — an invite can read `ISSUED` and be closed in fact.
    */
    if (!inviteIsOpen(itb, now)) {
      return no("INVITE_CLOSED", "That invitation is closed.");
    }
    inviteId = itb.id;
  }

  /* ⚠⚠⚠ A DECIDED PROPOSAL IS NOT EDITABLE. */
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

/**
 * Submit a proposal, or replace the one you already sent.
 *
 * ⚠⚠ IDEMPOTENT BY CONSTRUCTION. `@@unique([work_request_id,
 * provider_person_id])` means the DATABASE refuses a second row rather than
 * this function remembering to check — the call `GroupMembership` made, for the
 * same reason. ⚠ WS-A item 3: *"editing before a decision replaces rather than
 * duplicates."*
 *
 * ⚠⚠⚠ REPLACING IS REFUSED ONCE A DECISION EXISTS. A proposal that has been
 * `AWARDED`, `NOT_SELECTED` or `DECLINED` is part of a decision the buyer has
 * already made; letting a provider rewrite it afterwards would change the
 * record the buyer acted on.
 */
export async function submitProposal(
  viewer: Viewer,
  draft: ProposalDraft,
  now: Date = new Date()
): Promise<{ id: string; replaced: boolean }> {
  const provider = await ownProvider(viewer);

  /*
    ⚠⚠⚠ THE REFUSAL IS THE SAME FUNCTION THE FORM ASKED (`E585`). Every check
    this writer used to make inline now lives in `proposeEligibility`, with its
    message and code unchanged — see that function's docblock for why a page
    deciding this for itself is the defect WS-C exists to avoid.
  */
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
        /* ⚠⚠ `submitted_at` IS THE COLUMN *Proposals Sent* COUNTS (WS-A item
           1). ⚠ It is re-stamped on a replacement because the proposal the
           buyer will read is the one sent NOW. */
        submitted_at: now,
      },
    });
    await writeRate(existing.id, draft.rate ?? null);
    return { id: existing.id, replaced: true };
  }

  const created = await prisma.proposal.create({
    data: {
      /* ⚠ A readable identifier, not a uuid, because a person says it aloud. */
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
