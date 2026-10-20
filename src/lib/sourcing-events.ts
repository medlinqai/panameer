import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { loadOwned, resolveBuyer, WorkRequestError } from "@/lib/work-request";
import { requisitionForJob } from "@/lib/requisition";
import { ensureFirstLine } from "@/lib/work-request-lines";
import { inviteProviders } from "@/lib/work-request-invite";
import { nextNumber } from "@/lib/numbering";

// SE: a Sourcing Event — shortlist (stars), Request Proposals by a deadline in hours, compare, award.
export const DEFAULT_DEADLINE_HOURS = 48;

async function ownJob(viewer: Viewer, jobId: string) {
  const { personId, pAccountId } = await resolveBuyer(viewer);
  const job = await loadOwned(viewer, jobId, pAccountId);
  return { personId, pAccountId, job };
}

/** SE-E003: star (or unstar) a provider onto the Job's Shortlist. */
export async function setStar(viewer: Viewer, jobId: string, providerPersonId: string, on: boolean) {
  const { personId } = await ownJob(viewer, jobId);
  const sl = (await prisma.shortlist.findFirst({ where: { job_id: jobId }, select: { id: true } }))
    ?? (await prisma.shortlist.create({ data: { shortlist_number: `SL-${Date.now().toString(36).toUpperCase()}-${jobId.slice(0, 4)}`, job_id: jobId, created_by_person_id: personId }, select: { id: true } }));
  if (!on) {
    await prisma.shortlistLine.deleteMany({ where: { shortlist_id: sl.id, provider_person_id: providerPersonId } });
    return;
  }
  const last = await prisma.shortlistLine.findFirst({ where: { shortlist_id: sl.id }, orderBy: { line_number: "desc" }, select: { line_number: true } });
  await prisma.shortlistLine.upsert({
    where: { shortlist_id_provider_person_id: { shortlist_id: sl.id, provider_person_id: providerPersonId } },
    update: { source: "SHORTLISTED" },
    create: { shortlist_id: sl.id, line_number: (last?.line_number ?? 0) + 1, provider_person_id: providerPersonId, source: "SHORTLISTED" },
  });
}

/** SE-E003: Request Proposals from the shortlist → an Open Sourcing Event + one proposal request per provider. */
export async function openSourcingEvent(viewer: Viewer, jobId: string, providerPersonIds: string[], hours: number) {
  const h = Math.round(hours);
  if (!Number.isFinite(h) || h < 1 || h > 720) throw new WorkRequestError("The deadline must be 1 to 720 hours.", "INVALID");
  const { personId, pAccountId } = await ownJob(viewer, jobId);
  const req = await requisitionForJob(jobId);
  await ensureFirstLine(jobId, req.id);
  const line = await prisma.workRequestLine.findFirstOrThrow({ where: { work_request_id: req.id }, orderBy: { line_number: "asc" }, select: { id: true } });
  const deadline = new Date(Date.now() + h * 3_600_000);
  const event = await prisma.sourcingEvent.create({
    data: { event_number: await nextNumber("SE", { pAccountId }), job_id: jobId, created_by_person_id: personId, deadline_hours: h, deadline_at: deadline, status: "OPEN" },
    select: { id: true, event_number: true },
  });
  const res = await inviteProviders(viewer, jobId, { lineId: line.id, providerPersonIds, respondsBy: deadline.toISOString(), sourcingEvent: { id: event.id, hours: h } });
  if (!res.created.length) await prisma.sourcingEvent.update({ where: { id: event.id }, data: { status: "DRAFT" } });
  return { eventId: event.id, eventNumber: event.event_number, ...res };
}

/** The Job's latest Sourcing Event, for links. */
export async function latestEventFor(jobId: string) {
  return prisma.sourcingEvent.findFirst({ where: { job_id: jobId, status: { not: "DRAFT" } }, orderBy: { created_at: "desc" }, select: { id: true, event_number: true, status: true } });
}
