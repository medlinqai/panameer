import { prisma } from "@/lib/prisma";
import { jobPath, PATH_STEPS, type PathKey } from "@/lib/work-request-path";
import { listInterviews, type InterviewRow } from "@/lib/interviews";

// DB-E002–E005: the login dashboard's live work — attention tiles, today's interviews, the process strip with counts.
// Buyer and provider are twins. The buyer sees provider numbers only (listInterviews / jobPath already mask).
export type Tile = { id: string; label: string; count: number; href: string };
export type StripStep = { key: string; label: string; count: number };
export type WorkRow = { id: string; step: string; title: string; ref: string | null; who: string | null; posted: string | null; days: number; due: string | null; action: { label: string; href: string } | null; old: boolean };

const TZ = "America/New_York";
const DAY = 86_400_000;
/** Midnight in New York for the day containing `at`, plus `addDays`. */
export function nyDayStart(at = new Date(), addDays = 0): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const guess = new Date(`${ymd}T00:00:00Z`);
  const off = new Date(guess.toLocaleString("en-US", { timeZone: TZ })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - off + addDays * DAY);
}
const short = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const daysSince = (d: Date | null) => (d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY)) : 0);

// ── Buyer ──────────────────────────────────────────────────────────────────────────────────────────────────
const BUYER_ACTION: Partial<Record<PathKey, string>> = { shortlist: "Shortlist", request: "Request Proposals", proposals: "Review proposals", award: "Award", approval: "Open", wo: "Open Work Order" };

export async function buyerLiveWork(personId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const jobs = await prisma.job.findMany({
    where: { buyer_person_id: personId, status: { in: ["DRAFT", "OPEN", "FILLED"] }, updated_at: { gte: new Date(now.getTime() - 60 * DAY) } },
    orderBy: { created_at: "desc" }, take: 40, select: { id: true },
  });
  const paths = (await Promise.all(jobs.map((j) => jobPath(j.id)))).filter((p): p is NonNullable<typeof p> => !!p);

  const rows: WorkRow[] = [];
  for (const p of paths) {
    const postedAt = p.job.posted_at ?? p.job.created_at;
    if (!p.awarded) {
      const step = p.current ?? "shortlist";
      const lastDone = [...p.shown].reverse().find((s) => s.done)?.date ?? postedAt;
      const href = step === "proposals" && p.event ? `/hire/sourcing/${p.event.id}` : step === "shortlist" || step === "request" ? `/work-requests/${p.job.id}#matches` : `/work-requests/${p.job.id}`;
      rows.push({
        id: p.job.id, step, title: p.job.title || "Untitled job", ref: p.job.job_number, who: null, posted: postedAt.toISOString(), days: daysSince(lastDone),
        due: p.event && step === "proposals" ? short(p.event.deadline_at) : null,
        action: { label: BUYER_ACTION[step] ?? "Open", href }, old: daysSince(postedAt) > 5,
      });
      continue;
    }
    for (const w of p.wrs) for (const l of w.lines) {
      const wo = p.orders.find((o) => o.id === l.work_order_id);
      const step: PathKey = wo ? "wo" : w.approved_at ? "approval" : "award";
      if (wo && daysSince(wo.created_at) > 14) continue;
      rows.push({
        id: `${w.id}:${l.provider_person_id}`, step, title: p.job.title || "Untitled job", ref: w.wr_number ?? p.job.job_number, who: p.numberOf(l.provider_person_id!), posted: postedAt.toISOString(),
        days: daysSince(wo?.created_at ?? w.approved_at ?? w.submitted_at ?? w.created_at), due: null,
        action: wo ? { label: "Open Work Order", href: `/orders/${wo.id}` } : { label: "Open", href: `/work-requests/${p.job.id}` }, old: false,
      });
    }
  }
  const strip: StripStep[] = PATH_STEPS.map((s) => ({ key: s.key, label: s.label, count: rows.filter((r) => r.step === s.key).length }));

  const [proposalsToReview, closing, expired, testsIn, toAccept, approvals, todays, openJobs, monthOrders] = await Promise.all([
    prisma.proposal.count({ where: { status: "SUBMITTED", job: { buyer_person_id: personId }, proposalRequest: { sourcingEvent: { status: { in: ["OPEN", "CLOSED"] } } } } }),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, status: "OPEN", deadline_at: { gt: now, lte: soon } } }),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, status: "OPEN", deadline_at: { lte: now } } }),
    prisma.testRequest.count({ where: { requested_by_person_id: personId, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId, status: "ISSUED", buyer_accepted_at: null } }),
    prisma.workRequest.count({ where: { job: { buyer_person_id: personId }, status: "PENDING_APPROVAL" } }),
    listInterviews({ buyerPersonId: personId, from: nyDayStart(now), to: nyDayStart(now, 1) }),
    prisma.job.count({ where: { buyer_person_id: personId, status: "OPEN" } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId, created_at: { gte: nyDayStart(new Date(now.getFullYear(), now.getMonth(), 1)) } } }),
  ]);
  const tiles: Tile[] = [
    { id: "proposals", label: "Proposals to review", count: proposalsToReview, href: "/dashboard?step=proposals#live-work" },
    { id: "closing", label: "Sourcing Events closing < 24 h", count: closing, href: "/dashboard?step=proposals#live-work" },
    { id: "expired", label: "Sourcing Events expired, no award", count: expired, href: "/dashboard?step=proposals#live-work" },
    { id: "interviews", label: "Interviews today", count: todays.length, href: "#todays-interviews" },
    { id: "tests", label: "Test results in", count: testsIn, href: "/dashboard?step=test#live-work" },
    { id: "accept", label: "Work Orders to accept", count: toAccept, href: "/orders" },
    { id: "approvals", label: "Approvals waiting", count: approvals, href: "/orders/work-requests" },
  ].filter((t) => t.count > 0);
  return { tiles, todays, strip, rows, footer: { openJobs, monthOrders } };
}

// ── Provider ───────────────────────────────────────────────────────────────────────────────────────────────
export const PROVIDER_STRIP = [
  { key: "requested", label: "Requested" }, { key: "submitted", label: "Submitted" }, { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" }, { key: "awarded", label: "Awarded" }, { key: "accept", label: "Work Order to Accept" },
] as const;

export async function providerLiveWork(personId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const [requests, proposals, interviews, toAccept, testReqs, notSelected, todays] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: personId, status: { in: ["ISSUED", "VIEWED", "RESPONDED"] }, created_at: { gte: new Date(now.getTime() - 60 * DAY) } }, select: { job_id: true, responds_by: true, created_at: true } }),
    prisma.proposal.findMany({ where: { provider_person_id: personId, status: { in: ["SUBMITTED", "SHORTLISTED", "AWARDED"] }, updated_at: { gte: new Date(now.getTime() - 60 * DAY) } }, select: { job_id: true, status: true, submitted_at: true, updated_at: true } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: personId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } }, select: { job_id: true, created_at: true } }),
    prisma.workOrder.findMany({ where: { provider_person_id: personId, status: "ISSUED", provider_accepted_at: null }, select: { id: true, order_number: true, created_at: true, workRequest: { select: { job_id: true } } } }),
    prisma.testRequest.count({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    prisma.proposal.count({ where: { provider_person_id: personId, status: "NOT_SELECTED", updated_at: { gte: new Date(now.getTime() - 14 * DAY) } } }),
    listInterviews({ providerPersonId: personId, from: nyDayStart(now), to: nyDayStart(now, 1) }),
  ]);
  const jobIds = [...new Set([...requests.map((r) => r.job_id), ...proposals.map((p) => p.job_id), ...interviews.map((i) => i.job_id), ...toAccept.map((o) => o.workRequest.job_id).filter((x): x is string => !!x)])];
  const jobs = new Map((await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, job_number: true, posted_at: true, created_at: true } })).map((j) => [j.id, j]));
  const rows: WorkRow[] = [];
  const seen = new Set<string>();
  const push = (jobId: string, step: string, since: Date | null, due: Date | null, action: WorkRow["action"], ref?: string | null) => {
    if (seen.has(jobId)) return;
    seen.add(jobId);
    const j = jobs.get(jobId);
    rows.push({ id: jobId, step, title: j?.title ?? "Job", ref: ref ?? j?.job_number ?? null, who: null, posted: (j?.posted_at ?? j?.created_at)?.toISOString() ?? null, days: daysSince(since), due: due ? short(due) : null, action, old: false });
  };
  for (const o of toAccept) if (o.workRequest.job_id) push(o.workRequest.job_id, "accept", o.created_at, null, { label: "Accept", href: `/orders/${o.id}` }, o.order_number);
  for (const p of proposals.filter((x) => x.status === "AWARDED")) push(p.job_id, "awarded", p.updated_at, null, { label: "Open", href: `/find-work/${p.job_id}` });
  for (const i of interviews) push(i.job_id, "interview", i.created_at, null, { label: "Interview", href: `/find-work/${i.job_id}#interview` });
  for (const p of proposals.filter((x) => x.status === "SHORTLISTED")) push(p.job_id, "shortlisted", p.updated_at, null, { label: "Open", href: `/find-work/${p.job_id}` });
  for (const p of proposals.filter((x) => x.status === "SUBMITTED")) push(p.job_id, "submitted", p.submitted_at, requests.find((r) => r.job_id === p.job_id)?.responds_by ?? null, { label: "Update", href: `/find-work/${p.job_id}` });
  for (const r of requests) push(r.job_id, "requested", r.created_at, r.responds_by, { label: "Propose", href: `/find-work/${r.job_id}` });

  const strip: StripStep[] = PROVIDER_STRIP.map((s) => ({ key: s.key, label: s.label, count: rows.filter((r) => r.step === s.key).length }));
  const dueSoon = requests.filter((r) => r.responds_by && r.responds_by > now && r.responds_by <= soon && !proposals.some((p) => p.job_id === r.job_id)).length;
  const tiles: Tile[] = [
    { id: "due", label: "Requests to Propose due < 24 h", count: dueSoon, href: "/dashboard?step=requested#live-work" },
    { id: "interviews", label: "Interviews today", count: todays.length, href: "#todays-interviews" },
    { id: "tests", label: "Test requests", count: testReqs, href: "/find-work?tab=invitations" },
    { id: "accept", label: "Work Orders to accept", count: toAccept.length, href: "/dashboard?step=accept#live-work" },
    { id: "not-selected", label: "Not selected (recent)", count: notSelected, href: "/find-work?tab=proposals" },
  ].filter((t) => t.count > 0);
  return { tiles, todays, strip, rows };
}

/** DB-E003: the week's interviews (Mon–Sun, New York). */
export async function weekInterviews(side: "buyer" | "provider", personId: string): Promise<{ start: Date; rows: InterviewRow[] }> {
  const today = nyDayStart();
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date())) + 1;
  const start = new Date(today.getTime() - (dow - 1) * DAY);
  const rows = await listInterviews({ ...(side === "buyer" ? { buyerPersonId: personId } : { providerPersonId: personId }), from: start, to: new Date(start.getTime() + 7 * DAY) });
  return { start, rows };
}
