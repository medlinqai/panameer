import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify, resolveNotifications } from "@/lib/notifications";
import { SourcingError } from "@/lib/sourcing";

// JS-E003/E004: the buyer's job actions — Close (with reason), Put On Hold / Resume, Reopen, Duplicate — each logged (JobEvent)
// and, where providers were asked, told to everyone asked right away (no Order, so nothing waits for a Release).
export const CLOSE_REASONS = ["No Longer Needed", "Filled Elsewhere", "Budget", "Other"] as const;

async function ownJob(viewer: Viewer, jobId: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true, status: true, buyer_person_id: true } });
  if (!me || !job || job.buyer_person_id !== me.id) throw new SourcingError("Only the buyer can do that.", "NOT_BUYER");
  return { me: me.id, job };
}

/** Everyone asked on this job (availability requests and responses), once each. */
async function askedProviders(jobId: string) {
  const [reqs, props] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { job_id: jobId }, select: { provider_person_id: true } }),
    prisma.proposal.findMany({ where: { job_id: jobId, status: { notIn: ["DRAFT", "WITHDRAWN"] } }, select: { provider_person_id: true } }),
  ]);
  return [...new Set([...reqs, ...props].map((r) => r.provider_person_id))];
}
async function tellAsked(jobId: string, title: string, kind: string, message: string, label: string) {
  for (const personId of await askedProviders(jobId)) {
    await notify({ event: "work.job_update", personId, entityType: "job", entityId: jobId, dedupeKey: `work.job_update:${jobId}:${kind}:${personId}:${Date.now()}`, vars: { workTitle: title, message, jobId, label } });
  }
}
const log = (jobId: string, kind: string, note: string | null, by: string) => prisma.jobEvent.create({ data: { job_id: jobId, kind, note, created_by_person_id: by } });

export async function closeJob(viewer: Viewer, jobId: string, reason: string, note?: string | null) {
  const { me, job } = await ownJob(viewer, jobId);
  if (["CLOSED", "CANCELED", "FILLED"].includes(job.status)) throw new SourcingError("This job is already finished.", "INVALID");
  if (await prisma.workOrder.count({ where: { workRequest: { job_id: jobId }, status: { not: "CANCELLED" } } })) throw new SourcingError("This job has an Order — manage it in Orders.", "INVALID");
  const r = (CLOSE_REASONS as readonly string[]).includes(reason) ? reason : "Other";
  const text = r === "Other" && note?.trim() ? `Other: ${note.trim().slice(0, 300)}` : note?.trim() ? `${r} — ${note.trim().slice(0, 300)}` : r;
  await prisma.$transaction([
    prisma.job.update({ where: { id: jobId }, data: { status: "CLOSED", closed_reason: text } }),
    prisma.sourcingEvent.updateMany({ where: { job_id: jobId, status: { in: ["OPEN", "DRAFT"] } }, data: { status: "CLOSED" } }),
    prisma.interviewRequest.updateMany({ where: { job_id: jobId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } }, data: { status: "CANCELLED" } }),
  ]);
  // Open questions expire: their "Answer" worklist rows clear.
  const open = await prisma.questionAnswer.findMany({ where: { questionSet: { job_id: jobId }, submitted_at: null }, select: { id: true } });
  for (const q of open) await resolveNotifications({ dedupe_key: `work.questions_asked:${q.id}` });
  await log(jobId, "CLOSED", text, me);
  await tellAsked(jobId, job.title, "closed", `${job.title} was closed by the buyer — thank you.`, "Job Closed");
}

export async function holdJob(viewer: Viewer, jobId: string, until?: string | null) {
  const { me, job } = await ownJob(viewer, jobId);
  if (!["OPEN"].includes(job.status)) throw new SourcingError("Only an open job can be put on hold.", "INVALID");
  const ev = await prisma.sourcingEvent.findFirst({ where: { job_id: jobId, status: "OPEN" }, orderBy: { created_at: "desc" }, select: { id: true, deadline_at: true } });
  await prisma.$transaction([
    prisma.job.update({ where: { id: jobId }, data: { status: "ON_HOLD", hold_until: until && Date.parse(until) > Date.now() ? new Date(until) : null } }),
    ...(ev ? [prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "CLOSED", paused_remaining_seconds: Math.max(0, Math.round((ev.deadline_at.getTime() - Date.now()) / 1000)) } })] : []),
  ]);
  await log(jobId, "ON_HOLD", until ? `until ${until.slice(0, 10)}` : null, me);
  await tellAsked(jobId, job.title, "hold", `${job.title} is On Hold — the buyer paused it. Booked interviews stay booked unless they cancel.`, "Job On Hold");
}

export async function resumeJob(viewer: Viewer, jobId: string) {
  const { me, job } = await ownJob(viewer, jobId);
  if (job.status !== "ON_HOLD") throw new SourcingError("This job isn't on hold.", "INVALID");
  const ev = await prisma.sourcingEvent.findFirst({ where: { job_id: jobId, paused_remaining_seconds: { not: null } }, orderBy: { created_at: "desc" }, select: { id: true, paused_remaining_seconds: true } });
  const at = ev ? new Date(Date.now() + Math.max(ev.paused_remaining_seconds ?? 0, 3600) * 1000) : null;
  await prisma.$transaction([
    prisma.job.update({ where: { id: jobId }, data: { status: "OPEN", hold_until: null } }),
    ...(ev && at ? [
      prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "OPEN", deadline_at: at, paused_remaining_seconds: null } }),
      prisma.proposalRequest.updateMany({ where: { sourcing_event_id: ev.id, status: { in: ["ISSUED", "VIEWED", "EXPIRED"] } }, data: { responds_by: at, status: "ISSUED" } }),
    ] : []),
  ]);
  await log(jobId, "RESUMED", at ? `answers due ${at.toISOString().slice(0, 16).replace("T", " ")} UTC` : null, me);
  await tellAsked(jobId, job.title, "resume", `${job.title} is Back Open.`, "Job Back Open");
}

export async function reopenJob(viewer: Viewer, jobId: string) {
  const { me, job } = await ownJob(viewer, jobId);
  if (job.status !== "CLOSED") throw new SourcingError("Only a closed job can be reopened.", "INVALID");
  await prisma.job.update({ where: { id: jobId }, data: { status: "OPEN", closed_reason: null } });
  await log(jobId, "REOPENED", null, me);
}

/** Duplicate → a new Draft with the same Service Description. */
export async function duplicateJob(viewer: Viewer, jobId: string): Promise<string> {
  await ownJob(viewer, jobId);
  const { readServiceDescription } = await import("@/lib/service-description");
  const { saveHireJob } = await import("@/lib/hire-questionnaire");
  const sd = await readServiceDescription(jobId);
  if (!sd) throw new SourcingError("That job has nothing to copy yet.", "INVALID");
  return saveHireJob(viewer, null, { ...sd, title: `${sd.title} (Copy)`.slice(0, 140) });
}

/** Extend Deadline from the menu, logged. */
export async function logExtend(jobId: string, hours: number, by: string) { await log(jobId, "EXTENDED", `+${hours} h`, by); }

// ── JS-E005: Edit while Comparing = an Amendment (fair sourcing) ───────────────────────────────────────────────
export const AMEND_FIELDS = [
  ["title", "Title"], ["summary", "Description"], ["budgetMin", "Rate From"], ["budgetMax", "Rate To"],
  ["startDate", "Start Date"], ["endDate", "End Date"], ["worksite", "Worksite"], ["city", "City"], ["state", "State"],
  ["required", "Must Have"], ["niceToHave", "Nice to Have"],
] as const;
type AmendKey = (typeof AMEND_FIELDS)[number][0];
export type AmendChange = { field: AmendKey; label: string; before: string; after: string };
const show = (v: unknown) => (v == null ? "" : String(v));

/** Save the changes, number the Amendment, ask everyone who answered to re-confirm, and give them at least 24 h. */
export async function amendJob(viewer: Viewer, jobId: string, patch: Partial<Record<AmendKey, unknown>>, reason: string) {
  const { me, job } = await ownJob(viewer, jobId);
  if (job.status !== "OPEN") throw new SourcingError("Only an open job can be amended.", "INVALID");
  if (!reason.trim()) throw new SourcingError("Say why you're changing the job.", "INVALID");
  const { readServiceDescription, writeServiceDescription } = await import("@/lib/service-description");
  const sd = await readServiceDescription(jobId);
  if (!sd) throw new SourcingError("This job has no description to amend.", "INVALID");
  const next = { ...sd } as Record<string, unknown>;
  const changes: AmendChange[] = [];
  for (const [field, label] of AMEND_FIELDS) {
    if (!(field in patch)) continue;
    const raw = patch[field];
    const v = field === "budgetMin" || field === "budgetMax" ? (raw === "" || raw == null ? null : Number(raw)) : field === "worksite" ? (raw || null) : String(raw ?? "");
    if (show(v) === show((sd as Record<string, unknown>)[field])) continue;
    changes.push({ field, label, before: show((sd as Record<string, unknown>)[field]), after: show(v) });
    next[field] = v;
  }
  if (!changes.length) throw new SourcingError("Nothing changed.", "INVALID");
  await writeServiceDescription(jobId, next as typeof sd);
  const number = (await prisma.jobAmendment.count({ where: { job_id: jobId } })) + 1;
  const now = new Date(), floor = new Date(Date.now() + 24 * 3_600_000);
  await prisma.$transaction([
    prisma.jobAmendment.create({ data: { job_id: jobId, number, changes, reason: reason.trim().slice(0, 500), created_by_person_id: me } }),
    prisma.proposal.updateMany({ where: { job_id: jobId, status: { in: ["SUBMITTED", "SHORTLISTED"] } }, data: { reconfirm_needed_at: now, reconfirmed_at: null } }),
    prisma.sourcingEvent.updateMany({ where: { job_id: jobId, status: "OPEN", deadline_at: { lt: floor } }, data: { deadline_at: floor } }),
    prisma.proposalRequest.updateMany({ where: { job_id: jobId, status: { in: ["ISSUED", "VIEWED"] }, responds_by: { lt: floor } }, data: { responds_by: floor } }),
  ]);
  await log(jobId, "AMENDED", `Amendment ${number}: ${reason.trim().slice(0, 200)}`, me);
  for (const personId of await askedProviders(jobId)) {
    await notify({ event: "work.job_amended", personId, entityType: "job", entityId: jobId, dedupeKey: `work.job_amended:${jobId}:${number}:${personId}`, vars: { workTitle: job.title, number: String(number), jobId } });
  }
  return { number };
}

/** The provider keeps their rate and answers after reviewing the Amendment. */
export async function reconfirmAnswer(viewer: Viewer, jobId: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) throw new SourcingError("No person for this account.", "NOT_FOUND");
  const r = await prisma.proposal.updateMany({ where: { job_id: jobId, provider_person_id: me.id, reconfirm_needed_at: { not: null } }, data: { reconfirmed_at: new Date() } });
  if (!r.count) throw new SourcingError("There's nothing to re-confirm.", "INVALID");
  await resolveNotifications({ event_key: "work.job_amended", entity_id: jobId, person: { user_id: viewer.userId } });
}

export async function amendmentsFor(jobId: string) {
  const rows = await prisma.jobAmendment.findMany({ where: { job_id: jobId }, orderBy: { number: "desc" }, select: { number: true, changes: true, reason: true, created_at: true } });
  return rows.map((r) => ({ number: r.number, changes: (Array.isArray(r.changes) ? r.changes : []) as AmendChange[], reason: r.reason, at: r.created_at.toISOString() }));
}
