import { prisma } from "@/lib/prisma";
import { SourcingError, assertInterviewSlot } from "@/lib/sourcing";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";
import type { InterviewMode } from "@prisma/client";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

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

  const proposal = await prisma.proposal.findUnique({
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

  // A WORKLIST ITEM FOR THE PROVIDER — they owe times. Through 's
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

/** The provider offers times. `REQUESTED` → `SLOTS_OFFERED`. */
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
  // RE-OFFERING IS ALLOWED WHILE IT IS STILL OPEN — a provider whose times
  if (iv.status !== "REQUESTED" && iv.status !== "SLOTS_OFFERED") {
    throw new SourcingError("That interview isn't waiting on times.", "NOT_OPEN");
  }

  await prisma.$transaction(async (tx) => {
    // The response row is the provider's; `@unique` on the interview makes
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
    // THE OLD SLOTS GO, because they are an OFFER and the offer is being
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

/** The buyer confirms one of the offered times. `SLOTS_OFFERED` → `SCHEDULED`. */
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

  /* The provider's worklist item is answered — they offered, it is picked. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.interview_requested:${iv.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}

/** The buyer records that the interview happened. `SCHEDULED` → `COMPLETED`. */
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

/** THE PROVIDER DECLINES, or the BUYER cancels. Two different facts, two */
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
    // Only the provider declines — a buyer "declining" their own request is
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

  /* Whoever owed something no longer does. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.interview_requested:${iv.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}
