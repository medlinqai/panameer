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
  const wr = await prisma.job.findUnique({
    where: { id: workRequestId },
    select: { id: true, buyer_person_id: true, title: true },
  });
  if (!wr) throw new SourcingError("That service requisition isn't available.", "NOT_FOUND");
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
    /** IW-E004: Open Times flow — the provider books one of the buyer's slots of this length. */
    slotMinutes?: number | null;
  }
): Promise<{ id: string; created: boolean }> {
  const me = await ownPerson(viewer);
  const wr = await assertIsBuyer(input.workRequestId, me.id);

  const proposal = await prisma.proposal.findUnique({
    where: {
      job_id_provider_person_id: {
        job_id: wr.id,
        provider_person_id: input.providerPersonId,
      },
    },
    select: { id: true, status: true },
  });
  if (!proposal || proposal.status === "WITHDRAWN") {
    throw new SourcingError(
      "That provider hasn't responded on this service requisition.",
      "NO_PROPOSAL"
    );
  }

  const open = await prisma.interviewRequest.findFirst({
    where: {
      job_id: wr.id,
      provider_person_id: input.providerPersonId,
      status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] },
    },
    select: { id: true },
  });
  if (open) return { id: open.id, created: false };

  const created = await prisma.interviewRequest.create({
    data: {
      request_number: `IV-${Date.now().toString(36).toUpperCase()}-${input.providerPersonId.slice(0, 4)}`,
      job_id: wr.id,
      provider_person_id: input.providerPersonId,
      requested_by_person_id: me.id,
      status: "REQUESTED",
      mode: input.mode ?? null,
      duration_minutes: input.slotMinutes ?? input.durationMinutes ?? 30,
      ...(input.slotMinutes ? { slot_minutes: input.slotMinutes, gap_minutes: 5 } : {}),
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
    vars: { requestId: wr.id, requestTitle: wr.title, ...(input.slotMinutes ? { pick: "1", minutes: String(input.slotMinutes), buyerName: await buyerName(me.id) } : {}) },
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
  // DB-E008: the buyer picks one (provider number only).
  const ivJob = await prisma.interviewRequest.findUnique({ where: { id: iv.id }, select: { job_id: true } });
  const job = ivJob ? await prisma.job.findUnique({ where: { id: ivJob.job_id }, select: { id: true, title: true } }) : null;
  await notify({ event: "work.interview_slots_offered", personId: iv.requested_by_person_id, entityType: "interview_request", entityId: iv.id, dedupeKey: `work.interview_slots_offered:${iv.id}`, vars: { requestId: job?.id ?? "", workTitle: job?.title ?? "", providerLabel: await providerLabelFor(me.id) } });
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
    select: { id: true, status: true, job_id: true, provider_person_id: true },
  });
  if (!iv) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  await assertIsBuyer(iv.job_id, me.id);
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
  await afterConfirm(iv.id, line.starts_at);

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
    select: { id: true, status: true, job_id: true },
  });
  if (!iv) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  await assertIsBuyer(iv.job_id, me.id);
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
      job_id: true,
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
    await assertIsBuyer(iv.job_id, me.id);
  }

  if (iv.status === "COMPLETED" || iv.status === "DECLINED" || iv.status === "CANCELLED") {
    throw new SourcingError("That interview is already finished.", "ALREADY_CLOSED");
  }

  await prisma.interviewRequest.update({
    where: { id: iv.id },
    data: { status: how },
  });
  // IW-E006: a booked interview called off — the other side is told; the slot is free again.
  if (iv.status === "SCHEDULED") {
    const job = await prisma.job.findUnique({ where: { id: iv.job_id }, select: { title: true, buyer_person_id: true } });
    const other = how === "CANCELLED" ? iv.provider_person_id : job?.buyer_person_id;
    if (other) await notify({ event: "work.interview_cancelled", personId: other, entityType: "interview_request", entityId: iv.id, dedupeKey: `work.interview_cancelled:${iv.id}`, vars: { workTitle: job?.title ?? "", href: how === "CANCELLED" ? `/find-work/${iv.job_id}#interview` : `/work-requests/${iv.job_id}#interviews` } });
  }

  /* Whoever owed something no longer does. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.interview_requested:${iv.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}


// ── DB-E008–E010: rooms, notices and lists — the buyer sees the provider number only until a Work Order is Released ──
async function providerLabelFor(personId: string) {
  const { providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const p = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  return providerLabel(p ? (await providerNumbers([p.id])).get(p.id) : null);
}

async function buyerName(personId: string) {
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { first_name: true, last_name: true } });
  return `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "A Buyer";
}

async function buyerCompanyName(personId: string) {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company: { select: { name: true } } } });
  return m?.company.name ?? "Buyer";
}

export const interviewWhen = (d: Date, tz = "America/New_York") => d.toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

/** IW-E005: a provider booked an Open Time — room, notices ("P-1126 Booked Tue Oct 27, 2:00 PM"), the invite answered. */
export async function afterBooked(interviewId: string, startsAt: Date) {
  await afterConfirm(interviewId, startsAt, true);
  await prisma.notification.updateMany({ where: { dedupe_key: `work.interview_requested:${interviewId}`, resolved_at: null }, data: { resolved_at: new Date() } }).catch(() => {});
}

/** On confirm: a private Daily room (expires 2 h after the slot) and a notice to both sides. */
async function afterConfirm(interviewId: string, startsAt: Date, booked = false) {
  const iv0 = await prisma.interviewRequest.findUniqueOrThrow({ where: { id: interviewId }, select: { id: true, request_number: true, duration_minutes: true, provider_person_id: true, requested_by_person_id: true, job_id: true } });
  const iv = { ...iv0, job: await prisma.job.findUniqueOrThrow({ where: { id: iv0.job_id }, select: { id: true, title: true } }) };
  const { createRoom } = await import("@/lib/daily");
  const exp = new Date(startsAt.getTime() + (iv.duration_minutes + 120) * 60_000);
  const room = await createRoom(`pm-${iv.request_number.toLowerCase().replace(/[^a-z0-9-]/g, "")}`, exp);
  if (room) await prisma.interviewRequest.update({ where: { id: iv.id }, data: { room_name: room.name, room_url: room.url } });
  const [label, company] = await Promise.all([providerLabelFor(iv.provider_person_id), buyerCompanyName(iv.requested_by_person_id)]);
  const when = interviewWhen(startsAt);
  await notify({ event: "work.interview_confirmed", personId: iv.requested_by_person_id, entityType: "interview_request", entityId: iv.id, dedupeKey: `work.interview_confirmed:${iv.id}:buyer`, vars: { when, workTitle: iv.job.title, counterpart: label, href: `/work-requests/${iv.job.id}#interviews`, ...(booked ? { booked: "1" } : {}) } });
  await notify({ event: "work.interview_confirmed", personId: iv.provider_person_id, entityType: "interview_request", entityId: iv.id, dedupeKey: `work.interview_confirmed:${iv.id}:provider`, vars: { when, workTitle: iv.job.title, counterpart: company, href: `/find-work/${iv.job.id}#interview` } });
  await prisma.notification.updateMany({ where: { dedupe_key: `work.interview_slots_offered:${iv.id}`, resolved_at: null }, data: { resolved_at: new Date() } }).catch(() => {});
}

export type InterviewRow = {
  id: string; number: string; status: string; mode: string | null; minutes: number; jobId: string; jobTitle: string;
  startsAt: string | null; slots: { id: string; startsAt: string; timeZone: string }[];
  providerPersonId: string; providerLabel: string; providerPhotoUrl: string | null; providerUserId: string | null; buyerCompany: string; buyerUserId: string | null;
  skills: { id: string; name: string }[]; hasRoom: boolean;
  /** IW-E005: set = Open Times flow (the provider books one of the buyer's slots). */
  slotMinutes: number | null;
  rating: string | null; comment: string | null;
};

/** Interviews for a buyer (requested_by) or a provider, optionally one job / a time window. Buyer side shows the provider number. */
export async function listInterviews(input: { buyerPersonId?: string; providerPersonId?: string; jobId?: string; from?: Date; to?: Date }): Promise<InterviewRow[]> {
  const rows = await prisma.interviewRequest.findMany({
    where: { ...(input.buyerPersonId ? { requested_by_person_id: input.buyerPersonId } : {}), ...(input.providerPersonId ? { provider_person_id: input.providerPersonId } : {}), ...(input.jobId ? { job_id: input.jobId } : {}) },
    orderBy: { created_at: "asc" },
    select: {
      id: true, request_number: true, status: true, mode: true, duration_minutes: true, slot_minutes: true, confirmed_line_id: true, room_url: true, provider_person_id: true, requested_by_person_id: true,
      job_id: true,
      response: { select: { lines: { orderBy: { line_number: "asc" }, select: { id: true, starts_at: true, time_zone: true } } } },
      notes: { orderBy: { created_at: "desc" }, take: 1, select: { body: true, rating: true } },
    },
  });
  const jobs = new Map((await prisma.job.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.job_id))] } }, select: { id: true, title: true, skills: { take: 6, select: { skill: { select: { id: true, name: true } } } } } })).map((j) => [j.id, j]));
  const persons = await prisma.person.findMany({ where: { id: { in: [...new Set(rows.flatMap((r) => [r.provider_person_id, r.requested_by_person_id]))] } }, select: { id: true, user_id: true, photo_url: true } });
  const photoOf = new Map(persons.map((p) => [p.id, p.photo_url]));
  const userOf = new Map(persons.map((p) => [p.id, p.user_id]));
  const labels = new Map<string, string>();
  const companies = new Map<string, string>();
  for (const r of rows) {
    if (!labels.has(r.provider_person_id)) labels.set(r.provider_person_id, await providerLabelFor(r.provider_person_id));
    if (!companies.has(r.requested_by_person_id)) companies.set(r.requested_by_person_id, await buyerCompanyName(r.requested_by_person_id));
  }
  const out: InterviewRow[] = rows.map((r) => {
    const job = jobs.get(r.job_id) ?? { id: r.job_id, title: "", skills: [] };
    const confirmed = r.response?.lines.find((l) => l.id === r.confirmed_line_id) ?? null;
    return {
      id: r.id, number: r.request_number, status: r.status, mode: r.mode, minutes: r.duration_minutes, jobId: job.id, jobTitle: job.title,
      startsAt: confirmed?.starts_at.toISOString() ?? null,
      slots: r.status === "SLOTS_OFFERED" ? (r.response?.lines ?? []).map((l) => ({ id: l.id, startsAt: l.starts_at.toISOString(), timeZone: l.time_zone })) : [],
      providerPersonId: r.provider_person_id, providerLabel: labels.get(r.provider_person_id)!, providerPhotoUrl: photoOf.get(r.provider_person_id) ?? null, providerUserId: userOf.get(r.provider_person_id) ?? null,
      buyerCompany: companies.get(r.requested_by_person_id)!, buyerUserId: userOf.get(r.requested_by_person_id) ?? null,
      skills: job.skills.map((s) => s.skill), hasRoom: !!r.room_url, slotMinutes: r.slot_minutes,
      rating: input.buyerPersonId ? r.notes[0]?.rating ?? null : null, comment: input.buyerPersonId ? r.notes[0]?.body ?? null : null,
    };
  });
  return out.filter((r) => (!input.from || (r.startsAt && r.startsAt >= input.from.toISOString())) && (!input.to || (r.startsAt && r.startsAt < input.to.toISOString())));
}
