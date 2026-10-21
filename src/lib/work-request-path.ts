import { prisma } from "@/lib/prisma";
import { providerLabel, providerNumbers } from "@/lib/provider-number";

// WP-E001/E002 + DB-E004: a Job's Work Request path — one source for the WR page strip and the dashboard strip.
export type PathStep = { key: PathKey; label: string; done: boolean; date: Date | null; note?: string | null; href?: string; optional?: boolean; hidden?: boolean };
export type PathKey = "job" | "shortlist" | "request" | "proposals" | "interview" | "test" | "award" | "approval" | "wo";
export const PATH_STEPS: { key: PathKey; label: string }[] = [
  { key: "job", label: "Job" }, { key: "shortlist", label: "Shortlist" }, { key: "request", label: "Request Proposals" }, { key: "proposals", label: "Proposals In" },
  { key: "interview", label: "Interview" }, { key: "test", label: "Test" }, { key: "award", label: "Award" }, { key: "approval", label: "Approval" }, { key: "wo", label: "Work Order Created" },
];
const when = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const first = (ds: (Date | null | undefined)[]) => ds.filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

export async function jobPath(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true, job_number: true, created_at: true, posted_at: true, status: true } });
  if (!job) return null;
  const [stars, event, interview, test, wrs] = await Promise.all([
    prisma.shortlistLine.findMany({ where: { shortlist: { job_id: jobId }, source: { in: ["SHORTLISTED", "ADDED"] } }, select: { created_at: true } }),
    prisma.sourcingEvent.findFirst({ where: { job_id: jobId, status: { not: "DRAFT" } }, orderBy: { created_at: "desc" }, select: { id: true, created_at: true, deadline_at: true, proposalRequests: { select: { bid: { select: { status: true, submitted_at: true } } } } } }),
    prisma.interviewRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { created_at: true } }),
    prisma.testRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { created_at: true } }),
    prisma.workRequest.findMany({
      where: { job_id: jobId, lines: { some: { provider_person_id: { not: null }, status: { in: ["ASSIGNED", "ORDERED"] } } } }, orderBy: { created_at: "asc" },
      select: { id: true, wr_number: true, status: true, submitted_at: true, approved_at: true, created_at: true, lines: { where: { provider_person_id: { not: null } }, select: { provider_person_id: true, updated_at: true, work_order_id: true } } },
    }),
  ]);
  const orders = wrs.length ? await prisma.workOrder.findMany({ where: { work_request_id: { in: wrs.map((w) => w.id) }, status: { not: "CANCELLED" } }, orderBy: { created_at: "asc" }, select: { id: true, order_number: true, created_at: true } }) : [];
  const providerIds = [...new Set(wrs.flatMap((w) => w.lines.map((l) => l.provider_person_id!)))];
  const profiles = providerIds.length ? await prisma.providerProfile.findMany({ where: { person_id: { in: providerIds } }, select: { id: true, person_id: true } }) : [];
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const numberOf = (personId: string) => providerLabel(nums.get(profiles.find((p) => p.person_id === personId)?.id ?? ""));

  const sourced = !!event;
  const asked = event?.proposalRequests.length ?? 0;
  const bids = event?.proposalRequests.filter((r) => r.bid && !["DRAFT", "WITHDRAWN"].includes(r.bid.status)) ?? [];
  const awardedAt = first(wrs.flatMap((w) => [w.submitted_at, ...w.lines.map((l) => l.updated_at)]));
  const approvedAt = first(wrs.map((w) => w.approved_at));
  const awarded = wrs.length > 0;
  const steps: PathStep[] = [
    { key: "job", label: "Job", done: true, date: job.created_at },
    { key: "shortlist", label: "Shortlist", done: stars.length > 0 || sourced, date: first(stars.map((s) => s.created_at)) ?? event?.created_at ?? null, href: "#matches" },
    { key: "request", label: "Request Proposals", done: sourced, date: event?.created_at ?? null, note: event ? `${asked} asked · due ${when(event.deadline_at)}` : null, href: "#matches", hidden: !sourced && awarded },
    { key: "proposals", label: "Proposals In", done: bids.length > 0, date: first(bids.map((b) => b.bid?.submitted_at)), note: event ? `${bids.length} of ${asked} in` : null, href: event ? `/hire/sourcing/${event.id}` : undefined, hidden: !sourced && awarded },
    { key: "interview", label: "Interview", done: !!interview, date: interview?.created_at ?? null, optional: true },
    { key: "test", label: "Test", done: !!test, date: test?.created_at ?? null, optional: true },
    { key: "award", label: "Award", done: awarded, date: awardedAt },
    { key: "approval", label: "Approval", done: !!approvedAt, date: approvedAt, note: approvedAt ? "Auto-approved" : null },
    { key: "wo", label: "Work Order Created", done: orders.length > 0, date: orders[0]?.created_at ?? null, href: orders[0] ? `/orders/${orders[0].id}` : undefined },
  ];
  const shown = steps.filter((s) => !s.hidden);
  const current = (shown.find((s) => !s.done && !s.optional)?.key ?? null) as PathKey | null;
  return { job, steps, shown, current, event, wrs, orders, awarded, numberOf };
}
