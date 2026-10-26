import { REQUEST_STATUS_LABEL, requestStatus } from "@/lib/request-status";
import { erpWaitDay } from "@/lib/request-approval";
import { prisma } from "@/lib/prisma";
import { connectDonut } from "@/lib/dashboard/connect";
import type { Viewer } from "@/lib/access";
import { jobStages, JOB_STAGE_LABEL, type JobStage } from "@/lib/job-stage";
import { C, quarterStart, slicesFrom, usd, type DashData, type DashRow, type Tone } from "@/lib/dashboard/types";

// MD-E003: the buyer's Things You Need to Do — Jobs, Requests, Orders and Shop from one set of rows.
const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD"]);
const DONE = new Set(["CLOSED", "FINALLY_CLOSED"]);

export async function buyerDashboard(viewer: Viewer, personId: string): Promise<DashData> {
  const [jobs, wrs, orders] = await Promise.all([
    prisma.job.findMany({ where: { buyer_person_id: personId, kind: "JOB", status: { not: "CANCELED" } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, title: true, job_number: true, updated_at: true, budget_min_cents: true, budget_max_cents: true, budget_type: true } }),
    prisma.workRequest.findMany({ where: { buyer_person_id: personId, status: { not: "INCOMPLETE" } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, wr_number: true, title: true, description: true, status: true, source: true, erp_connection_id: true, erp_returned_at: true, approval_status: true, approval_channel: true, erp_wait_started_at: true, erp_wait_reset_at: true, submitted_at: true, job_id: true, updated_at: true, lines: { select: { unit_price_cents: true, quantity: true, amount_cents: true } } } }),
    prisma.workOrder.findMany({ where: { buyer_person_id: personId, status: { notIn: ["CANCELLED", "DRAFT"] } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, order_number: true, description: true, status: true, provider_accepted_at: true, buyer_accepted_at: true, not_to_exceed_cents: true, provider_person_id: true, created_at: true, updated_at: true, workRequest: { select: { source: true } } } }),
  ]);
  const toApprove = new Set((await prisma.paymentRequest.findMany({ where: { work_order_id: { in: orders.map((o) => o.id) }, status: "SUBMITTED" }, select: { work_order_id: true } })).map((p) => p.work_order_id));
  const stages = await jobStages(jobs.map((j) => j.id));
  const { identityVisibleTo, providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const provIds = [...new Set(orders.map((o) => o.provider_person_id))];
  const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: provIds } }, select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true } } } });
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const seen = await identityVisibleTo(viewer, provIds).catch(() => new Set<string>());
  const who = (pid: string) => { const p = profiles.find((x) => x.person_id === pid); return p ? (seen.has(pid) ? `${p.person.first_name} ${p.person.last_name}`.trim() : providerLabel(nums.get(p.id)).replace(/^Provider /, "")) : "—"; };

  const rows: DashRow[] = [];
  const JOB_TONE: Record<JobStage, Tone> = { DRAFT: "st", ACTIVE: "st", COMPARING: "pend", REQUEST_TO_HIRE: "pend", FILLED: "ok", ON_HOLD: "st", CLOSED: "st" };
  const JOB_NEXT: Record<JobStage, [string, boolean]> = { DRAFT: ["Finish and post", true], ACTIVE: ["Ask providers for availability", true], COMPARING: ["Compare and choose", true], REQUEST_TO_HIRE: ["Approval of the Request", false], FILLED: ["—", false], ON_HOLD: ["Resume or close", true], CLOSED: ["—", false] };
  for (const j of jobs) {
    const st = stages.get(j.id)?.stage ?? "ACTIVE";
    const range = j.budget_min_cents != null || j.budget_max_cents != null ? `${usd(j.budget_min_cents)}–${usd(j.budget_max_cents)}${j.budget_type === "FIXED" ? "" : "/hr"}` : "—";
    rows.push({ key: `j-${j.id}`, type: "Job", what: j.title || "Untitled job", number: j.job_number, who: "—", status: JOB_STAGE_LABEL[st], tone: JOB_TONE[st], next: JOB_NEXT[st][0], waitingOnYou: JOB_NEXT[st][1], waitingOn: JOB_NEXT[st][1] ? "You" : "—", amount: range, updatedAt: j.updated_at.toISOString(), href: `/work-requests/${j.id}`, donut: "jobs", slice: JOB_STAGE_LABEL[st], done: st === "FILLED" || st === "CLOSED" });
  }
  for (const w of wrs) {
    const rs = requestStatus(w);
    const slice = rs ? REQUEST_STATUS_LABEL[rs] : null;
    if (!slice) continue;
    const total = w.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
    const forJob = w.job_id ? jobs.find((j) => j.id === w.job_id)?.job_number : null;
    rows.push({ key: `r-${w.id}`, type: "Request", what: w.title || w.description || "Request", number: [w.wr_number, forJob ? `for ${forJob}` : null].filter(Boolean).join(" · ") || null, who: "—", status: slice, tone: slice === "Approved" ? "ok" : slice === "Declined" ? "no" : "pend", next: slice === "Pending Approval" ? "Approval" : slice === "Waiting on ERP" ? `PO from your ERP · Day ${erpWaitDay(w) ?? 1} of 60` : "—", waitingOnYou: false, waitingOn: slice === "Pending Approval" ? "Approver" : slice === "Waiting on ERP" ? "Your ERP" : "—", amount: usd(total), updatedAt: w.updated_at.toISOString(), href: w.job_id ? `/work-requests/${w.job_id}?tab=work-order` : "/orders", donut: "requests", slice, done: rs === "APPROVED" || rs === "DECLINED" });
  }
  for (const o of orders) {
    // JR-E007: Shop orders are Orders too — the Shop pie is gone.
    const slice = toApprove.has(o.id) ? "Approve Delivery" : DONE.has(o.status) ? "Completed" : RELEASED.has(o.status) ? "Active" : "Waiting on Provider";
    const mine = slice === "Approve Delivery" || (o.status === "ISSUED" && !o.buyer_accepted_at);
    rows.push({ key: `o-${o.id}`, type: "Order", what: o.description || "Order", number: o.order_number, who: who(o.provider_person_id), status: slice, tone: slice === "Active" || slice === "Completed" ? "ok" : "pend", next: mine ? (slice === "Approve Delivery" ? "Approve the delivery" : "Review and accept") : slice === "Waiting on Provider" ? "Provider accepts" : "—", waitingOnYou: mine, waitingOn: mine ? "You" : slice === "Waiting on Provider" ? who(o.provider_person_id) : "—", amount: usd(o.not_to_exceed_cents), updatedAt: o.updated_at.toISOString(), href: `/orders/${o.id}`, donut: "orders", slice, done: slice === "Completed" });
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const q = quarterStart();
  const committed = orders.filter((o) => o.created_at >= q).reduce((n, o) => n + (o.not_to_exceed_cents ?? 0), 0);
  const open = rows.filter((r) => r.type === "Job" && ["Active", "Comparing", "Request to Hire"].includes(r.status)).length;
  const active = orders.filter((o) => RELEASED.has(o.status)).length;
  return {
    summary: `${open} job${open === 1 ? "" : "s"} open · ${active} Order${active === 1 ? "" : "s"} active · ${usd(committed)} committed this quarter`,
    donuts: [
      await connectDonut(viewer.userId, personId),
      { key: "jobs", title: "Jobs", sub: "Hire", slices: slicesFrom(rows, "jobs", [{ label: "Draft", color: C.grey, mine: true }, { label: "Active", color: C.ink }, { label: "Comparing", color: C.steel, mine: true }, { label: "Request to Hire", color: C.pendSoft }, { label: "On Hold", color: C.grey }, { label: "Filled", color: C.ok }, { label: "Closed", color: "#c9cddc" }]) },
      { key: "requests", title: "Requests", sub: "Approval before an Order", slices: slicesFrom(rows, "requests", [{ label: "Pending Approval", color: C.pend }, { label: "Waiting on ERP", color: C.pendSoft }, { label: "Approved", color: C.ok }, { label: "Declined", color: C.no }]) },
      { key: "orders", title: "Orders", sub: "The work under contract", slices: slicesFrom(rows, "orders", [{ label: "Waiting on Provider", color: C.pend }, { label: "Active", color: C.ok }, { label: "Approve Delivery", color: C.no, mine: true }, { label: "Completed", color: C.okSoft }]) },
    ],
    rows,
    filters: [["active", "Active"], ["mine", "Waiting on Me"], ["Job", "Jobs"], ["Request", "Requests"], ["Order", "Orders"], ["closed", "Closed"]],
  };
}
