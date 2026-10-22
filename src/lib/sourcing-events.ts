import { prisma } from "@/lib/prisma";
import { resolveProposalsReceived, resolveRequestToPropose } from "@/lib/work-resolve";
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

// ── SE-E004: the provider's side ─────────────────────────────────────────────────────────────────────────────
async function myPerson(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!p) throw new WorkRequestError("No person for this account.", "NOT_FOUND");
  return p.id;
}

/** The provider's request in a Sourcing Event on this Job (null when they were not asked in one). */
export async function providerEventView(providerPersonId: string, jobId: string) {
  const req = await prisma.proposalRequest.findFirst({
    where: { job_id: jobId, provider_person_id: providerPersonId, sourcing_event_id: { not: null } },
    select: { id: true, status: true, decline_reason: true, sourcingEvent: { select: { id: true, event_number: true, status: true, deadline_at: true, deadline_hours: true } }, bid: { select: { status: true, submitted_at: true, cover_note: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, available_from: true } } } } },
  });
  if (!req?.sourcingEvent) return null;
  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId }, select: { budget_type: true, budget_min_cents: true, budget_max_cents: true, worksite: true } }),
    prisma.providerProfile.findUnique({ where: { person_id: providerPersonId }, select: { onsite_rate_cents: true, remote_rate_cents: true } }),
  ]);
  const ev = req.sourcingEvent;
  const line = req.bid?.lines[0];
  return {
    eventNumber: ev.event_number, deadlineAt: ev.deadline_at.toISOString(), hours: ev.deadline_hours,
    open: ev.status === "OPEN" && ev.deadline_at.getTime() > Date.now(),
    declined: req.status === "DECLINED", declineReason: req.decline_reason,
    proposed: req.bid?.status === "SUBMITTED" || req.bid?.status === "SHORTLISTED" || req.bid?.status === "AWARDED" ? { rateCents: line?.unit_price_cents ?? null, start: line?.available_from?.toISOString().slice(0, 10) ?? null, note: req.bid?.cover_note ?? null } : null,
    range: { type: job?.budget_type ?? "HOURLY", minCents: job?.budget_min_cents ?? null, maxCents: job?.budget_max_cents ?? null },
    rateCardCents: (job?.worksite === "OFFSITE" ? profile?.remote_rate_cents ?? profile?.onsite_rate_cents : profile?.onsite_rate_cents ?? profile?.remote_rate_cents) ?? null,
  };
}

async function openRequestFor(viewer: Viewer, jobId: string) {
  const me = await myPerson(viewer);
  const req = await prisma.proposalRequest.findFirst({ where: { job_id: jobId, provider_person_id: me, sourcing_event_id: { not: null } }, select: { id: true, status: true, sourcingEvent: { select: { status: true, deadline_at: true } } } });
  if (!req?.sourcingEvent) throw new WorkRequestError("You weren't asked to propose on this job.", "NOT_FOUND");
  if (req.sourcingEvent.status !== "OPEN" || req.sourcingEvent.deadline_at.getTime() <= Date.now()) throw new WorkRequestError("This Sourcing Event is closed.", "INVALID");
  return req;
}

/** Submit Proposal: rate, earliest start, note — before the deadline. */
export async function proposeInEvent(viewer: Viewer, jobId: string, input: { rateCents: number; start?: string | null; note?: string | null }) {
  const req = await openRequestFor(viewer, jobId);
  if (!Number.isFinite(input.rateCents) || input.rateCents <= 0) throw new WorkRequestError("Enter your rate.", "INVALID");
  const { submitProposal } = await import("@/lib/proposals");
  const out = await submitProposal(viewer, { workRequestId: jobId, coverNote: input.note ?? null, rate: { unitPriceCents: Math.round(input.rateCents), basis: "RATE" } });
  const start = input.start && /^\d{4}-\d{2}-\d{2}$/.test(input.start) ? new Date(input.start) : null;
  await prisma.proposalLine.updateMany({ where: { proposal_id: out.id }, data: { available_from: start } });
  await prisma.proposalRequest.update({ where: { id: req.id }, data: { status: "RESPONDED", declined_at: null, decline_reason: null } });
  return out;
}

/** Decline (with a reason) — before the deadline. */
export async function declineInEvent(viewer: Viewer, jobId: string, reason: string) {
  const req = await openRequestFor(viewer, jobId);
  await prisma.proposalRequest.update({ where: { id: req.id }, data: { status: "DECLINED", declined_at: new Date(), decline_reason: reason.trim().slice(0, 500) || "No reason given" } });
  await resolveRequestToPropose(jobId, await myPerson(viewer));
}

/** The buyer extends the deadline (hours from now); every open request in the event moves with it. */
export async function extendDeadline(viewer: Viewer, eventId: string, hours: number) {
  const ev = await ownEvent(viewer, eventId);
  const h = Math.round(hours);
  if (!Number.isFinite(h) || h < 1 || h > 720) throw new WorkRequestError("Extend by 1 to 720 hours.", "INVALID");
  if (ev.status !== "OPEN" && ev.status !== "CLOSED") throw new WorkRequestError("This Sourcing Event can't be extended.", "INVALID");
  const at = new Date(Math.max(Date.now(), ev.deadline_at.getTime()) + h * 3_600_000);
  await prisma.$transaction([
    prisma.sourcingEvent.update({ where: { id: ev.id }, data: { deadline_at: at, deadline_hours: ev.deadline_hours + h, status: "OPEN" } }),
    prisma.proposalRequest.updateMany({ where: { sourcing_event_id: ev.id, status: { in: ["ISSUED", "VIEWED", "EXPIRED"] } }, data: { responds_by: at, status: "ISSUED" } }),
  ]);
  return at;
}

async function ownEvent(viewer: Viewer, eventId: string) {
  const ev = await prisma.sourcingEvent.findUnique({ where: { id: eventId }, select: { id: true, job_id: true, status: true, deadline_at: true, deadline_hours: true, event_number: true, awarded_proposal_id: true, work_order_id: true, others_notified_at: true } });
  if (!ev) throw new WorkRequestError("Sourcing Event not found", "NOT_FOUND");
  await ownJob(viewer, ev.job_id);
  return ev;
}

// ── SE-E005: the buyer's Sourcing Event page ─────────────────────────────────────────────────────────────────
export type EventProposal = {
  personId: string; requestStatus: string; declineReason: string | null;
  proposal: { id: string; status: string; rateCents: number | null; start: string | null; note: string | null } | null;
  match: import("@/lib/hire-questionnaire").HireMatch;
};

export async function eventForBuyer(viewer: Viewer, eventId: string) {
  const ev = await ownEvent(viewer, eventId);
  const [{ hireMatches }, { readServiceDescription }, { seesTestAccounts }, { providerLabel, providerNumbers }, { certificationTestForSkill }] = await Promise.all([
    import("@/lib/hire-questionnaire"), import("@/lib/service-description"), import("@/lib/admin/test-accounts"), import("@/lib/provider-number"), import("@/lib/certification-tests"),
  ]);
  const sd = await readServiceDescription(ev.job_id);
  const requests = await prisma.proposalRequest.findMany({
    where: { sourcing_event_id: ev.id }, orderBy: { created_at: "asc" },
    select: { provider_person_id: true, status: true, decline_reason: true, bid: { select: { id: true, status: true, cover_note: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, available_from: true } } } } },
  });
  const matches = sd ? await hireMatches(sd, await seesTestAccounts(viewer), ev.job_id, viewer) : [];
  const byPerson = new Map(matches.map((m) => [m.personId, m]));
  const missing = requests.filter((r) => !byPerson.has(r.provider_person_id));
  if (missing.length) {
    const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: missing.map((r) => r.provider_person_id) } }, select: { id: true, person_id: true, person: { select: { title: true, photo_url: true } } } });
    const nums = await providerNumbers(profiles.map((p) => p.id));
    for (const p of profiles) byPerson.set(p.person_id, { personId: p.person_id, profileId: p.id, name: providerLabel(nums.get(p.id)), company: null, photoUrl: p.person.photo_url ?? null, badges: [], line: p.person.title ?? "", rate: null, matched: [], why: [], fit: 0, inBudget: false, outside: false, hidden: false, starred: false, requested: null, weak: false, detail: { summary: "", role: p.person.title, skillsMatched: "0 of 10", years: null, ocYears: null, ocYearsLabel: null, implementations: null, implementationsLabel: null, certifications: [], location: null, rates: [], products: [] } });
  }
  const proposals: EventProposal[] = requests.filter((r) => byPerson.has(r.provider_person_id)).map((r) => {
    const line = r.bid?.lines[0];
    return {
      personId: r.provider_person_id, requestStatus: r.status, declineReason: r.decline_reason,
      proposal: r.bid && r.bid.status !== "DRAFT" && r.bid.status !== "WITHDRAWN" ? { id: r.bid.id, status: r.bid.status, rateCents: line?.unit_price_cents ?? null, start: line?.available_from?.toISOString().slice(0, 10) ?? null, note: r.bid.cover_note } : null,
      match: byPerson.get(r.provider_person_id)!,
    };
  });
  let testId: string | null = null;
  for (const s of sd?.skills ?? []) { const t = await certificationTestForSkill(s.id); if (t) { testId = t.assessmentId; break; } }
  const job = await prisma.job.findUniqueOrThrow({ where: { id: ev.job_id }, select: { title: true, budget_type: true, budget_min_cents: true, budget_max_cents: true } });
  return {
    id: ev.id, number: ev.event_number, status: ev.status, deadlineAt: ev.deadline_at.toISOString(), hours: ev.deadline_hours, jobId: ev.job_id, job,
    workOrderId: ev.work_order_id, othersNotifiedAt: ev.others_notified_at?.toISOString() ?? null,
    notifyOthers: (await canNotifyOthers(ev.id)) ? { count: await prisma.proposal.count({ where: notAwarded(ev.id) }), message: notAwardedMessage(job.title) } : null,
    counts: { requested: requests.length, proposed: proposals.filter((p) => p.proposal).length, declined: requests.filter((r) => r.status === "DECLINED").length },
    proposals, certificationTestId: testId,
  };
}

/** Shortlist / un-shortlist / Decline one proposal (Decline is silent — the not-awarded notice waits for Released). */
export async function setProposalStatus(viewer: Viewer, eventId: string, proposalId: string, status: "SHORTLISTED" | "SUBMITTED" | "DECLINED") {
  const ev = await ownEvent(viewer, eventId);
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, job_id: ev.job_id, proposalRequest: { sourcing_event_id: ev.id } }, select: { id: true, status: true } });
  if (!p) throw new WorkRequestError("Proposal not found", "NOT_FOUND");
  if (p.status === "AWARDED") throw new WorkRequestError("That proposal is awarded.", "INVALID");
  await prisma.proposal.update({ where: { id: p.id }, data: status === "DECLINED" ? { status, declined_at: new Date() } : { status, declined_at: null } });
  // HP-E001: the buyer acted on this proposal.
  const { resolveNotifications } = await import("@/lib/notifications");
  await resolveNotifications({ event_key: "work.proposal_received", entity_id: p.id });
}

/** Award: Hire at the proposed rate — the proposal's rate for the terms page (null when not in a Sourcing Event). */
export async function proposedRateFor(jobId: string, providerPersonId: string) {
  const p = await prisma.proposal.findFirst({ where: { job_id: jobId, provider_person_id: providerPersonId, status: { in: ["SUBMITTED", "SHORTLISTED"] }, proposalRequest: { sourcing_event_id: { not: null } } }, select: { lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, available_from: true } } } });
  return p?.lines[0] ?? null;
}

/** After the Work Order is created from an awarded proposal: proposal → Awarded, event → Awarded (with the WO). */
export async function markAwarded(jobId: string, providerPersonId: string, workOrderId: string | null) {
  const p = await prisma.proposal.findFirst({ where: { job_id: jobId, provider_person_id: providerPersonId, proposalRequest: { sourcing_event_id: { not: null } } }, select: { id: true, proposalRequest: { select: { sourcing_event_id: true } } } });
  const eventId = p?.proposalRequest?.sourcing_event_id;
  if (!p || !eventId) return;
  await prisma.$transaction([
    prisma.proposal.update({ where: { id: p.id }, data: { status: "AWARDED" } }),
    prisma.sourcingEvent.update({ where: { id: eventId }, data: { status: "AWARDED", awarded_proposal_id: p.id, work_order_id: workOrderId } }),
  ]);
  await resolveProposalsReceived(jobId);
}

// ── SE-E006: the other candidates hear only once the Work Order is Released ──────────────────────────────────
const RELEASED_OR_LATER = ["RELEASED", "ACTIVE", "CLOSED", "FINALLY_CLOSED"] as const;
const notAwarded = (eventId: string) => ({ proposalRequest: { sourcing_event_id: eventId }, status: { in: ["SUBMITTED" as const, "SHORTLISTED" as const, "DECLINED" as const] } });

/** Called when a Work Order is Released: its Sourcing Event's buyer gets the worklist item. */
export async function sourcingOnReleased(orderId: string) {
  const ev = await prisma.sourcingEvent.findFirst({ where: { work_order_id: orderId, others_notified_at: null }, select: { id: true, type: true, created_by_person_id: true, job: { select: { title: true } } } });
  if (!ev) return;
  if (ev.type === "ESTIMATES") return estimatesNotSelected(ev.id, ev.job.title);
  const count = await prisma.proposal.count({ where: notAwarded(ev.id) });
  if (!count) { await prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "CLOSED", others_notified_at: new Date() } }); return; }
  const { notify } = await import("@/lib/notifications");
  await notify({ event: "buyer.sourcing.notify_others", personId: ev.created_by_person_id, entityType: "SourcingEvent", entityId: ev.id, dedupeKey: `sourcing.notify_others:${ev.id}`, vars: { eventId: ev.id, workTitle: ev.job.title, count: String(count) } });
}

export const notAwardedMessage = (title: string) => `Thank you for your proposal on “${title}”. We've filled this role with another provider, so we won't be going ahead with your proposal this time. We'd be glad to work with you on a future job.`;

/** Whether the buyer may send the not-awarded notice now (the WO is Released and nobody was told yet). */
export async function canNotifyOthers(eventId: string) {
  const ev = await prisma.sourcingEvent.findUnique({ where: { id: eventId }, select: { work_order_id: true, others_notified_at: true } });
  if (!ev?.work_order_id || ev.others_notified_at) return false;
  const wo = await prisma.workOrder.findUnique({ where: { id: ev.work_order_id }, select: { status: true } });
  return !!wo && (RELEASED_OR_LATER as readonly string[]).includes(wo.status);
}

/** Send: one bell + email to every non-awarded proposer; the event closes. */
export async function notifyOthers(viewer: Viewer, eventId: string, message: string) {
  const ev = await ownEvent(viewer, eventId);
  if (!(await canNotifyOthers(ev.id))) throw new WorkRequestError("The other candidates can be told once the Work Order is Released.", "INVALID");
  const job = await prisma.job.findUniqueOrThrow({ where: { id: ev.job_id }, select: { title: true } });
  const text = message.trim().slice(0, 2000) || notAwardedMessage(job.title);
  const others = await prisma.proposal.findMany({ where: notAwarded(ev.id), select: { id: true, provider_person_id: true } });
  const { notify } = await import("@/lib/notifications");
  for (const p of others) {
    await notify({ event: "work.not_awarded", personId: p.provider_person_id, entityType: "Proposal", entityId: p.id, dedupeKey: `work.not_awarded:${ev.id}:${p.provider_person_id}`, vars: { workTitle: job.title, message: text } });
  }
  await prisma.$transaction([
    prisma.proposal.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "NOT_SELECTED" } }),
    prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "CLOSED", others_notified_at: new Date() } }),
    prisma.notification.updateMany({ where: { dedupe_key: `sourcing.notify_others:${ev.id}`, resolved_at: null }, data: { resolved_at: new Date() } }),
  ]);
  await resolveProposalsReceived(ev.job_id);
  return { sent: others.length };
}

/** ES-E005: on Release, every other estimate in the event is told "not selected" and closed; the event closes. */
async function estimatesNotSelected(eventId: string, title: string) {
  const reqs = await prisma.estimateRequest.findMany({ where: { sourcing_event_id: eventId, cost_estimate_id: { not: null } }, select: { provider_person_id: true, cost_estimate_id: true } });
  const others = await prisma.estimate.findMany({ where: { id: { in: reqs.map((r) => r.cost_estimate_id!) }, status: { in: ["SENT", "CHANGES_REQUESTED", "DECLINED"] } }, select: { id: true, provider_person_id: true } });
  const { notify } = await import("@/lib/notifications");
  for (const e of others) {
    await notify({ event: "work.not_awarded", personId: e.provider_person_id, entityType: "cost_estimate", entityId: e.id, dedupeKey: `work.not_awarded:${eventId}:${e.provider_person_id}`, vars: { workTitle: title, message: `Thank you for your estimate on “${title}”. The buyer went with another provider this time.` } });
  }
  await prisma.$transaction([
    prisma.estimate.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "DECLINED", decided_at: new Date() } }),
    prisma.sourcingEvent.update({ where: { id: eventId }, data: { status: "CLOSED", others_notified_at: new Date() } }),
  ]);
}

// ── HB-E009: act from the Overview — Shortlist / Decline any proposal (invited or applied), Close an event ─────
export async function decideProposals(viewer: Viewer, proposalIds: string[], decision: "SHORTLISTED" | "DECLINED", reason?: string | null) {
  const me = await myPerson(viewer);
  const props = await prisma.proposal.findMany({ where: { id: { in: proposalIds }, job: { buyer_person_id: me }, status: { in: ["SUBMITTED", "SHORTLISTED"] } }, select: { id: true } });
  if (!props.length) throw new WorkRequestError("Those proposals aren't waiting on you any more.", "NOT_FOUND");
  // Declined providers are told only when the Work Order is Released (the Sourcing Event rule) — nothing is sent now.
  await prisma.proposal.updateMany({ where: { id: { in: props.map((p) => p.id) } }, data: decision === "DECLINED" ? { status: "DECLINED", declined_at: new Date(), decline_reason: reason?.trim().slice(0, 500) || null } : { status: "SHORTLISTED" } });
  const { resolveNotifications } = await import("@/lib/notifications");
  await resolveNotifications({ event_key: "work.proposal_received", entity_id: { in: props.map((p) => p.id) } });
  return { updated: props.length };
}

/** Close a Sourcing Event without an award (no one is told until a Work Order is Released). */
export async function closeEvent(viewer: Viewer, eventId: string) {
  const ev = await ownEvent(viewer, eventId);
  if (ev.status !== "OPEN") throw new WorkRequestError("This Sourcing Event is already closed.", "INVALID");
  await prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "CLOSED", deadline_at: new Date(Math.min(Date.now(), ev.deadline_at.getTime())) } });
  await prisma.proposalRequest.updateMany({ where: { sourcing_event_id: ev.id, status: { in: ["ISSUED", "VIEWED"] } }, data: { status: "EXPIRED" } });
  await resolveProposalsReceived(ev.job_id);
}
