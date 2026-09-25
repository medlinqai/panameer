import { prisma } from "@/lib/prisma";
import { SourcingError, inviteIsOpen } from "@/lib/sourcing";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ A PROVIDER PROPOSES (`P2-A8-E621` WS-A) ─────────────────────────
 *
 * ⚠⚠ **THE FIRST MISSING WRITER, AND EVERYTHING DOWNSTREAM WAITED ON IT.**
 * `ProviderBid` has existed since `E388` with zero rows, and Statistics said
 * *"Proposals aren't recorded yet — nothing creates one"*. ⚠⚠⚠ RULING 24: that
 * sentence was true **because nobody built the form that creates one**, and
 * citing it as the reason not to build the writer is circular — the rule then
 * proves itself forever. This is that writer.
 *
 * ── ⚠⚠ WHO MAY PROPOSE — RULING 14, AND IT IS THE REQUEST'S OWN SWITCH ───
 *
 * ⚠ SCOTT, 2026-09-24: **"The buyer picks, per request."**
 * · `INVITE_ONLY` → the provider must hold an OPEN `BidRequest`.
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
};

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

  const request = await prisma.workRequest.findUnique({
    where: { id: draft.workRequestId },
    select: {
      id: true,
      status: true,
      proposal_access: true,
      buyer_person_id: true,
      title: true,
    },
  });
  if (!request) throw new SourcingError("That work request isn't available.", "NOT_FOUND");

  /*
    ⚠⚠ ONLY A POSTED REQUEST TAKES PROPOSALS. A `DRAFT` is not public, and a
    request already `ASSIGNED` or `ORDERED` has its provider — proposing into
    either is proposing into a decision that is made.
  */
  if (request.status !== "POSTED") {
    throw new SourcingError(
      "This work request isn't open for proposals.",
      "REQUEST_NOT_OPEN"
    );
  }

  /* ⚠⚠⚠ RULING 14, READ FROM THE REQUEST. */
  let invite: { id: string } | null = null;
  if (request.proposal_access === "INVITE_ONLY") {
    const itb = await prisma.bidRequest.findFirst({
      where: { work_request_id: request.id, provider_person_id: provider.id },
      select: { id: true, status: true, responds_by: true },
    });
    if (!itb) {
      throw new SourcingError(
        "This work request is invite only, and you haven't been invited.",
        "NOT_INVITED"
      );
    }
    /*
      ⚠⚠ THE PREDICATE IS IMPORTED, NOT RESTATED (WS-A item 5). It checks the
      STATUS **and** the closing date, because `responds_by` passing does not
      rewrite the row — an invite can read `ISSUED` and be closed in fact.
    */
    if (!inviteIsOpen(itb, now)) {
      throw new SourcingError(
        "That invitation is closed.",
        "INVITE_CLOSED"
      );
    }
    invite = { id: itb.id };
  }

  const existing = await prisma.providerBid.findUnique({
    where: {
      work_request_id_provider_person_id: {
        work_request_id: request.id,
        provider_person_id: provider.id,
      },
    },
    select: { id: true, status: true },
  });

  const validUntil = draft.validUntil ? new Date(draft.validUntil) : null;
  const coverNote = draft.coverNote?.trim() || null;

  if (existing) {
    /* ⚠⚠⚠ A DECIDED PROPOSAL IS NOT EDITABLE — see the docblock. */
    const decided = ["AWARDED", "NOT_SELECTED", "DECLINED", "WITHDRAWN"];
    if (decided.includes(existing.status)) {
      throw new SourcingError(
        "This proposal has already been answered and can't be changed.",
        "ALREADY_DECIDED"
      );
    }
    await prisma.providerBid.update({
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
    return { id: existing.id, replaced: true };
  }

  const created = await prisma.providerBid.create({
    data: {
      /* ⚠ A readable identifier, not a uuid, because a person says it aloud. */
      bid_number: `PB-${now.getTime().toString(36).toUpperCase()}-${provider.id.slice(0, 4)}`,
      work_request_id: request.id,
      /* ⚠⚠ NULL ON AN OPEN REQUEST. That is the whole reason the column was
         made nullable — ruling 14's open half was unreachable while a proposal
         required an invite. */
      bid_request_id: invite?.id ?? null,
      provider_person_id: provider.id,
      cover_note: coverNote,
      valid_until: validUntil,
      status: "SUBMITTED",
      submitted_at: now,
    },
    select: { id: true },
  });

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
    personId: request.buyer_person_id,
    entityType: "provider_bid",
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
  const res = await prisma.providerBid.updateMany({
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
