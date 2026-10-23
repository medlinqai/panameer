import { prisma } from "@/lib/prisma";
import { resolveNotifications } from "@/lib/notifications";

// HP-E001: the Worklist clears when the work is done. One table: every work event that asks for action → what resolves it.
// New work events add a row here (and a branch in `isDone`); `settleWork` checks open items against the data, so a missed
// call site or a passed deadline still clears on the next Worklist load and in the backfill script.
export const WORK_RESOLVERS: Record<string, string> = {
  "work.order_created": "the buyer accepts / declines / asks for changes, or the Order leaves Issued",
  "work.order_offered": "the provider accepts / declines / asks for changes, or the Order leaves Issued",
  "work.invited_to_propose": "the provider responds or declines, the deadline passes, or the job closes",
  "work.sourcing_event_invited": "the provider responds or declines, the deadline passes, or the Sourcing Event closes",
  "work.proposal_received": "the buyer shortlists / declines / awards, or the Sourcing Event is awarded or closed",
  "work.job_posted": "the buyer opens the job's matches (or the job moves on)",
  "work.change_order_received": "the change order is approved or rejected",
  "buyer.sourcing.notify_others": "\"Let the other candidates know\" is sent",
  "work.interview_requested": "the provider offers times (or the interview closes)",
  "work.interview_slots_offered": "the buyer confirms a time (or the interview closes)",
  "work.questions_asked": "the provider sends their answers",
  "estimate.requested": "the provider sends an estimate or declines",
  "estimate.received": "the buyer accepts, asks for changes or declines",
};

// ── Direct calls at each action (immediate) ──────────────────────────────────────────────────────────────────
export const resolveOrderItems = (orderId: string, personId?: string | null) =>
  resolveNotifications({ entity_id: orderId, event_key: { in: ["work.order_created", "work.order_offered"] }, ...(personId ? { person_id: personId } : {}) });
export const resolveRequestToPropose = (jobId: string, providerPersonId: string) =>
  resolveNotifications({ dedupe_key: `work.invited_to_propose:${jobId}:${providerPersonId}` });
export async function resolveProposalsReceived(jobId: string) {
  const ids = (await prisma.proposal.findMany({ where: { job_id: jobId }, select: { id: true } })).map((p) => p.id);
  if (ids.length) await resolveNotifications({ event_key: "work.proposal_received", entity_id: { in: ids } });
}
export const resolveJobPosted = (jobId: string) => resolveNotifications({ dedupe_key: `work.job_posted:${jobId}` });
export const resolveChangeOrder = (revisionId: string) => resolveNotifications({ dedupe_key: `work.change_order_received:${revisionId}` });

// ── Settle against the data (Worklist load + backfill) ───────────────────────────────────────────────────────
type Open = { id: string; person_id: string; event_key: string; entity_id: string | null; dedupe_key: string | null };
const ISSUED_ONLY = new Set(["ISSUED"]);

async function isDone(n: Open): Promise<boolean> {
  const id = n.entity_id;
  switch (n.event_key) {
    case "work.order_created":
    case "work.order_offered": {
      if (!id) return false;
      const o = await prisma.workOrder.findUnique({ where: { id }, select: { status: true, buyer_person_id: true, provider_person_id: true, buyer_accepted_at: true, provider_accepted_at: true } });
      if (!o || !ISSUED_ONLY.has(o.status)) return true;
      return (n.person_id === o.buyer_person_id && !!o.buyer_accepted_at) || (n.person_id === o.provider_person_id && !!o.provider_accepted_at);
    }
    case "work.invited_to_propose":
    case "work.sourcing_event_invited": {
      const jobId = n.dedupe_key?.split(":")[1] ?? id;
      if (!jobId) return false;
      const [job, prop, req] = await Promise.all([
        prisma.job.findUnique({ where: { id: jobId }, select: { status: true } }),
        prisma.proposal.findFirst({ where: { job_id: jobId, provider_person_id: n.person_id, status: { not: "DRAFT" } }, select: { id: true } }),
        prisma.proposalRequest.findFirst({ where: { job_id: jobId, provider_person_id: n.person_id }, select: { status: true, responds_by: true, sourcingEvent: { select: { status: true, deadline_at: true } } } }),
      ]);
      if (!job || job.status !== "OPEN" || prop) return true;
      if (req && ["DECLINED", "EXPIRED", "WITHDRAWN", "RESPONDED"].includes(req.status)) return true;
      const due = req?.sourcingEvent?.deadline_at ?? req?.responds_by;
      return (!!due && due.getTime() < Date.now()) || (!!req?.sourcingEvent && req.sourcingEvent.status !== "OPEN");
    }
    case "work.proposal_received": {
      if (!id) return false;
      const p = await prisma.proposal.findUnique({ where: { id }, select: { status: true, job: { select: { status: true } }, proposalRequest: { select: { sourcingEvent: { select: { status: true } } } } } });
      if (!p || p.status !== "SUBMITTED" || p.job.status !== "OPEN") return true;
      const se = p.proposalRequest?.sourcingEvent?.status;
      return se === "AWARDED" || se === "CLOSED";
    }
    case "work.job_posted": {
      if (!id) return false;
      const [job, stars, reqs] = await Promise.all([
        prisma.job.findUnique({ where: { id }, select: { status: true } }),
        prisma.shortlistLine.count({ where: { shortlist: { job_id: id } } }),
        prisma.proposalRequest.count({ where: { job_id: id } }),
      ]);
      return !job || !["OPEN", "DRAFT"].includes(job.status) || stars > 0 || reqs > 0;
    }
    case "work.change_order_received": {
      const revId = n.dedupe_key?.split(":")[1];
      if (!revId) return false;
      const r = await prisma.workOrderRevision.findUnique({ where: { id: revId }, select: { status: true } });
      return !r || r.status !== "PENDING";
    }
    case "buyer.sourcing.notify_others": {
      if (!id) return false;
      const ev = await prisma.sourcingEvent.findUnique({ where: { id }, select: { others_notified_at: true } });
      return !ev || !!ev.others_notified_at;
    }
    case "work.interview_requested":
    case "work.interview_slots_offered": {
      if (!id) return false;
      const iv = await prisma.interviewRequest.findUnique({ where: { id }, select: { status: true } });
      return !iv || iv.status !== (n.event_key === "work.interview_requested" ? "REQUESTED" : "SLOTS_OFFERED");
    }
    case "work.questions_asked": {
      if (!id) return false;
      const a = await prisma.questionAnswer.findUnique({ where: { id }, select: { submitted_at: true } });
      return !a || !!a.submitted_at;
    }
    case "estimate.requested": {
      if (!id) return false;
      const r = await prisma.estimateRequest.findUnique({ where: { id }, select: { status: true } });
      return !r || r.status !== "OPEN";
    }
    case "estimate.received": {
      if (!id) return false;
      const e = await prisma.estimate.findUnique({ where: { id }, select: { status: true } });
      return !e || e.status !== "SENT";
    }
    default:
      return false;
  }
}

/** Resolve this person's (or, with no person, everyone's) open work items whose action is already done. */
export async function settleWork(personId?: string | null, opts: { apply?: boolean } = {}) {
  const open = await prisma.notification.findMany({
    where: { resolved_at: null, event_key: { in: Object.keys(WORK_RESOLVERS) }, ...(personId ? { person_id: personId } : {}) },
    select: { id: true, person_id: true, event_key: true, entity_id: true, dedupe_key: true },
    take: 5000,
  });
  const done: Open[] = [];
  for (const n of open) if (await isDone(n)) done.push(n);
  if (opts.apply !== false && done.length) {
    const now = new Date();
    await prisma.notification.updateMany({ where: { id: { in: done.map((d) => d.id) } }, data: { resolved_at: now, read_at: now } });
  }
  return { open: open.length, done };
}
