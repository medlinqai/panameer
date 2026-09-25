import { prisma } from "@/lib/prisma";
import { SourcingError, assertInterviewSlot } from "@/lib/sourcing";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";
import type { InterviewMode } from "@prisma/client";

/**
 * ── ⚠⚠⚠ INTERVIEWS (`P2-A8-E621` WS-B) ──────────────────────────────────
 *
 * ⚠⚠ `InterviewRequest` HAS EXISTED SINCE `E388` WITH ZERO ROWS, and
 * `statistics.ts` still carries the sentence *"no `interviewRequest.create`
 * EXISTS ANYWHERE"*. ⚠⚠⚠ RULING 24: that is true **because nobody built the
 * writer**, and it is the circularity this brief exists to end.
 *
 * ── ⚠⚠ THE SIX STATES, AND WHO REACHES EACH ─────────────────────────────
 *
 * ⚠ WS-B item 1: *"build only the ones something can reach."* All six are
 * reachable once these writers exist, and each has exactly one actor:
 *
 * | state | who moves it |
 * |---|---|
 * | `REQUESTED` | the BUYER asks |
 * | `SLOTS_OFFERED` | the PROVIDER offers times |
 * | `SCHEDULED` | the BUYER confirms one of them |
 * | `COMPLETED` | the BUYER records that it happened |
 * | `DECLINED` | the PROVIDER says no |
 * | `CANCELLED` | the BUYER calls it off |
 *
 * ⚠⚠⚠ **NO CALENDAR INTEGRATION** (WS-B item 2). A time is a `DateTime` and a
 * time zone, offered by the provider and picked by the buyer. Nothing syncs,
 * nothing invites, nothing holds a slot — **scheduling is not built here.**
 *
 * ⚠⚠ AND THIS FILE NEVER TOUCHES `InterviewNote`. The notes are the BUYER's
 * private document; `check:sourcing` asserts a provider surface cannot reach
 * one, and *"a candidate reading 'weak on OTBI' is the failure mode."*
 */

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

/** ⚠ The buyer who owns the work request this interview hangs off. */
async function assertIsBuyer(workRequestId: string, personId: string) {
  const wr = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: { id: true, buyer_person_id: true, title: true },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  if (wr.buyer_person_id !== personId) {
    throw new SourcingError("Only the buyer can do that.", "NOT_BUYER");
  }
  return wr;
}

/**
 * The buyer asks a provider to interview.
 *
 * ⚠⚠ AGAINST A PROPOSAL, NOT A STRANGER — the provider must have proposed, so
 * an interview cannot be requested of somebody who never applied.
 * ⚠ IDEMPOTENT: one open interview per provider per request. Asking twice
 * returns the one already open rather than stacking two.
 */
export async function requestInterview(
  viewer: Viewer,
  input: {
    workRequestId: string;
    providerPersonId: string;
    mode?: InterviewMode | null;
    durationMinutes?: number;
  }
): Promise<{ id: string; created: boolean }> {
  const me = await ownPerson(viewer);
  const wr = await assertIsBuyer(input.workRequestId, me.id);

  const proposal = await prisma.providerBid.findUnique({
    where: {
      work_request_id_provider_person_id: {
        work_request_id: wr.id,
        provider_person_id: input.providerPersonId,
      },
    },
    select: { id: true, status: true },
  });
  if (!proposal || proposal.status === "WITHDRAWN") {
    throw new SourcingError(
      "That provider hasn't proposed on this work request.",
      "NO_PROPOSAL"
    );
  }

  /* ⚠⚠ AN OPEN ONE ALREADY? `DECLINED` and `CANCELLED` are finished, so a
     buyer may ask again after either — asking again after a no is a product
     decision the states already allow, and refusing it here would be inventing
     a rule nobody made. */
  const open = await prisma.interviewRequest.findFirst({
    where: {
      work_request_id: wr.id,
      provider_person_id: input.providerPersonId,
      status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] },
    },
    select: { id: true },
  });
  if (open) return { id: open.id, created: false };

  const created = await prisma.interviewRequest.create({
    data: {
      request_number: `IV-${Date.now().toString(36).toUpperCase()}-${input.providerPersonId.slice(0, 4)}`,
      work_request_id: wr.id,
      provider_person_id: input.providerPersonId,
      requested_by_person_id: me.id,
      status: "REQUESTED",
      mode: input.mode ?? null,
      duration_minutes: input.durationMinutes ?? 30,
    },
    select: { id: true },
  });

  /* ⚠⚠ A WORKLIST ITEM FOR THE PROVIDER — they owe times. ⚠ Through `E620`'s
     one writer, which catches its own failures and never rethrows, so a
     notification outage cannot fail the request. */
  await notify({
    event: "work.interview_requested",
    personId: input.providerPersonId,
    entityType: "interview_request",
    entityId: created.id,
    dedupeKey: `work.interview_requested:${created.id}`,
    vars: { requestId: wr.id, requestTitle: wr.title },
  });

  return { id: created.id, created: true };
}

/**
 * The provider offers times. ⚠⚠ `REQUESTED` → `SLOTS_OFFERED`.
 *
 * ⚠ EACH SLOT IS VALIDATED BY THE SPINE'S `assertInterviewSlot`, imported
 * rather than restated: a slot needs a start instant AND a time zone, because
 * *"2pm"* without one is not a time anybody can turn up to.
 */
export async function offerSlots(
  viewer: Viewer,
  interviewId: string,
  slots: { starts_at: Date; time_zone: string }[]
): Promise<void> {
  const me = await ownPerson(viewer);
  if (slots.length === 0) {
    throw new SourcingError("Offer at least one time.", "NO_SLOTS");
  }
  for (const s of slots) assertInterviewSlot(s);

  const iv = await prisma.interviewRequest.findFirst({
    where: { id: interviewId, provider_person_id: me.id },
    select: { id: true, status: true, requested_by_person_id: true },
  });
  if (!iv) throw new SourcingError("That interview isn't yours.", "NOT_FOUND");
  /* ⚠⚠ RE-OFFERING IS ALLOWED WHILE IT IS STILL OPEN — a provider whose times
     no longer work replaces them. ⚠ Not after `SCHEDULED`: the buyer has
     picked, and moving the times under them is a different act. */
  if (iv.status !== "REQUESTED" && iv.status !== "SLOTS_OFFERED") {
    throw new SourcingError("That interview isn't waiting on times.", "NOT_OPEN");
  }

  await prisma.$transaction(async (tx) => {
    /* ⚠ The response row is the provider's; `@unique` on the interview makes
       re-offering replace rather than duplicate. */
    const response = await tx.interviewResponse.upsert({
      where: { interview_request_id: iv.id },
      create: {
        interview_request_id: iv.id,
        provider_person_id: me.id,
        submitted_at: new Date(),
      },
      update: { submitted_at: new Date() },
      select: { id: true },
    });
    /* ⚠⚠ THE OLD SLOTS GO, because they are an OFFER and the offer is being
       replaced — not a record of anything that happened. ⚠ Scoped to this
       response, which is scoped to this provider's own interview. */
    await tx.interviewResponseLine.deleteMany({
      where: { interview_response_id: response.id },
    });
    await tx.interviewResponseLine.createMany({
      data: slots.map((s, i) => ({
        interview_response_id: response.id,
        line_number: i + 1,
        starts_at: s.starts_at,
        time_zone: s.time_zone,
      })),
    });
    await tx.interviewRequest.update({
      where: { id: iv.id },
      data: { status: "SLOTS_OFFERED" },
    });
  });
}

/**
 * The buyer confirms one of the offered times. ⚠⚠ `SLOTS_OFFERED` → `SCHEDULED`.
 *
 * ⚠⚠⚠ THE SLOT MUST BE ONE THIS PROVIDER ACTUALLY OFFERED. Confirming an
 * arbitrary id would let a buyer schedule a time nobody agreed to.
 */
export async function confirmSlot(
  viewer: Viewer,
  interviewId: string,
  responseLineId: string
): Promise<void> {
  const me = await ownPerson(viewer);
  const iv = await prisma.interviewRequest.findUnique({
    where: { id: interviewId },
    select: { id: true, status: true, work_request_id: true, provider_person_id: true },
  });
  if (!iv) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  await assertIsBuyer(iv.work_request_id, me.id);
  if (iv.status !== "SLOTS_OFFERED") {
    throw new SourcingError("There are no times to confirm yet.", "NO_SLOTS");
  }

  const line = await prisma.interviewResponseLine.findFirst({
    where: { id: responseLineId, interviewResponse: { interview_request_id: iv.id } },
    select: { id: true, starts_at: true },
  });
  if (!line) {
    throw new SourcingError("That time wasn't offered.", "SLOT_NOT_OFFERED");
  }

  await prisma.interviewRequest.update({
    where: { id: iv.id },
    data: { status: "SCHEDULED", confirmed_line_id: line.id },
  });

  /* ⚠ The provider's worklist item is answered — they offered, it is picked. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.interview_requested:${iv.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}

/**
 * The buyer records that the interview happened. ⚠ `SCHEDULED` → `COMPLETED`.
 *
 * ⚠⚠ A HUMAN SAYS SO. Nothing infers completion from the clock passing — an
 * interview nobody attended is not completed, and a time is not an event.
 */
export async function completeInterview(viewer: Viewer, interviewId: string): Promise<void> {
  const me = await ownPerson(viewer);
  const iv = await prisma.interviewRequest.findUnique({
    where: { id: interviewId },
    select: { id: true, status: true, work_request_id: true },
  });
  if (!iv) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  await assertIsBuyer(iv.work_request_id, me.id);
  if (iv.status !== "SCHEDULED") {
    throw new SourcingError("That interview isn't scheduled.", "NOT_SCHEDULED");
  }
  await prisma.interviewRequest.update({
    where: { id: iv.id },
    data: { status: "COMPLETED", completed_at: new Date() },
  });
}

/**
 * ⚠⚠ THE PROVIDER DECLINES, or the BUYER cancels. Two different facts, two
 * different states, and **neither deletes the row** — a removed interview reads
 * as though it was never asked for, which is the rule `E619`'s group decline
 * and `E621`'s withdrawn proposal both already hold.
 *
 * ⚠⚠⚠ IT IS ONE FUNCTION WITH THE ACTOR CHECKED PER BRANCH, so the two states
 * cannot drift apart in what they clean up.
 */
export async function closeInterview(
  viewer: Viewer,
  interviewId: string,
  how: "DECLINED" | "CANCELLED"
): Promise<void> {
  const me = await ownPerson(viewer);
  const iv = await prisma.interviewRequest.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      status: true,
      work_request_id: true,
      provider_person_id: true,
    },
  });
  if (!iv) throw new SourcingError("That interview isn't available.", "NOT_FOUND");

  if (how === "DECLINED") {
    /* ⚠ Only the provider declines — a buyer "declining" their own request is
       a cancellation, and calling it a decline would put the refusal on the
       wrong person's record. */
    if (iv.provider_person_id !== me.id) {
      throw new SourcingError("Only the provider can decline.", "NOT_PROVIDER");
    }
  } else {
    await assertIsBuyer(iv.work_request_id, me.id);
  }

  if (iv.status === "COMPLETED" || iv.status === "DECLINED" || iv.status === "CANCELLED") {
    throw new SourcingError("That interview is already finished.", "ALREADY_CLOSED");
  }

  await prisma.interviewRequest.update({
    where: { id: iv.id },
    data: { status: how },
  });

  /* ⚠ Whoever owed something no longer does. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.interview_requested:${iv.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}
