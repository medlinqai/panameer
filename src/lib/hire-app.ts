import { prisma } from "@/lib/prisma";
import { buyerDashboard } from "@/lib/dashboard/buyer";
import { C, type Donut } from "@/lib/dashboard/types";
import type { Viewer } from "@/lib/access";
import { REQUEST_STATUS_LABEL, requestStatus } from "@/lib/request-status";

// WK-E006: the buyer apps' tiles — Hire (Jobs · Providers · Interviews & Tests · Requests to Hire) and Shop (Products · Estimates · Requests to Buy · Delivered).
const JOB_CHIP: Record<string, string> = { Draft: "drafts", Active: "active", Comparing: "comparing", "Request to Hire": "request_to_hire", Filled: "filled", "On Hold": "on_hold", Closed: "closed" };
const REQ_COLOR: Record<string, string> = { "Pending Approval": C.pend, "Waiting on ERP": C.pendSoft, Approved: C.ok, Declined: C.no };

export async function hireTiles(viewer: Viewer, personId: string): Promise<Donut[]> {
  const d = await buyerDashboard(viewer, personId);
  const jobs = d.rows.filter((r) => r.type === "Job");
  const jobSlices = Object.keys(JOB_CHIP).map((l) => ({ label: l, n: jobs.filter((r) => r.slice === l).length, color: l === "Filled" ? C.ok : l === "Comparing" ? C.steel : l === "Request to Hire" ? C.pendSoft : l === "Active" ? C.ink : C.grey, mine: l === "Draft" || l === "Comparing", href: `/hire/overview?tab=jobs&slice=${JOB_CHIP[l]}` })).filter((s) => s.n > 0);
  const jobIds = (await prisma.job.findMany({ where: { buyer_person_id: personId }, select: { id: true } })).map((j) => j.id);
  const [shortlisted, asked, available, interviewed, toConfirm, booked, testsOut, resultsIn, wrs] = await Promise.all([
    prisma.shortlistLine.count({ where: { shortlist: { job_id: { in: jobIds } }, source: { in: ["SHORTLISTED", "ADDED"] } } }),
    prisma.proposalRequest.count({ where: { job_id: { in: jobIds }, status: { not: "DRAFT" } } }),
    prisma.proposal.count({ where: { job: { buyer_person_id: personId }, status: { in: ["SUBMITTED", "SHORTLISTED"] } } }),
    prisma.interviewRequest.count({ where: { requested_by_person_id: personId, status: "COMPLETED" } }),
    prisma.interviewRequest.count({ where: { requested_by_person_id: personId, status: "SLOTS_OFFERED" } }),
    prisma.interviewRequest.count({ where: { requested_by_person_id: personId, status: "SCHEDULED" } }),
    prisma.testRequest.count({ where: { requested_by_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    prisma.testRequest.count({ where: { requested_by_person_id: personId, status: "COMPLETED" } }),
    prisma.workRequest.findMany({ where: { buyer_person_id: personId, job_id: { not: null }, status: { not: "INCOMPLETE" } }, select: { status: true, erp_connection_id: true, erp_returned_at: true, approval_status: true, approval_channel: true } }),
  ]);
  const rs = wrs.map((w) => requestStatus(w)).filter(Boolean);
  return [
    { key: "jobs", title: "Jobs", sub: "Your postings", href: "/hire/overview?tab=jobs", seeAllLabel: "Open Jobs", slices: jobSlices },
    { key: "providers", title: "Providers", sub: "Who you're looking at", href: "/hire/overview?tab=jobs&slice=comparing", seeAllLabel: "Open Jobs", slices: [
      { label: "Shortlisted", n: shortlisted, color: C.grey, href: "/hire/overview?tab=jobs" }, { label: "Asked", n: asked, color: C.steel, href: "/hire/overview?tab=jobs&slice=comparing" },
      { label: "Said Available", n: available, color: C.pend, mine: true, href: "/hire/overview?tab=jobs&slice=comparing" }, { label: "Interviewed", n: interviewed, color: C.ink, href: "/hire/overview?tab=interviews" }] },
    { key: "fit", title: "Interviews & Tests", sub: "Checking fit", href: "/hire/overview?tab=interviews", seeAllLabel: "Open Interviews", slices: [
      { label: "Times to Confirm", n: toConfirm, color: C.pend, mine: true, href: "/hire/overview?tab=interviews" }, { label: "Booked", n: booked, color: C.ink, href: "/hire/overview?tab=interviews" },
      { label: "Tests Out", n: testsOut, color: C.steel, href: "/hire/overview?tab=tests" }, { label: "Results In", n: resultsIn, color: C.ok, mine: true, href: "/hire/overview?tab=tests" }] },
    { key: "requests", title: "Requests to Hire", sub: "Approval before an Order", href: "/hire/overview?tab=requests", seeAllLabel: "Open Requests", slices: Object.entries(REQUEST_STATUS_LABEL).map(([k, l]) => ({ label: l, n: rs.filter((x) => x === k).length, color: REQ_COLOR[l], href: "/hire/overview?tab=requests" })) },
  ];
}

export async function shopTiles(personId: string): Promise<Donut[]> {
  const [live, cart, events, estIn, awarded, wrs, orders] = await Promise.all([
    prisma.serviceProduct.count({ where: { status: "PUBLISHED" } }),
    prisma.workRequestLine.count({ where: { workRequest: { buyer_person_id: personId, source: "SHOP", status: "INCOMPLETE" } } }),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, type: "ESTIMATES", status: "OPEN" } }),
    import("@/lib/estimate-events").then((m) => m.estimateCounts(personId, "buyer")).then((c) => c.toReview).catch(() => 0),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, type: "ESTIMATES", status: "AWARDED" } }),
    prisma.workRequest.findMany({ where: { buyer_person_id: personId, source: "SHOP", status: { not: "INCOMPLETE" } }, select: { status: true, erp_connection_id: true, erp_returned_at: true, approval_status: true, approval_channel: true } }),
    prisma.workOrder.findMany({ where: { buyer_person_id: personId, workRequest: { source: "SHOP" }, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { status: true } }),
  ]);
  const rs = wrs.map((w) => requestStatus(w)).filter(Boolean);
  const done = orders.filter((o) => ["CLOSED", "FINALLY_CLOSED"].includes(o.status)).length;
  return [
    { key: "shopproducts", title: "Products", sub: "Service products", href: "/shop?tab=browse", seeAllLabel: "Browse", lead: { text: `${live.toLocaleString("en-US")} on Panameer`, href: "/shop?tab=browse", label: "Browse" }, slices: [
      { label: "In Your Cart", n: cart, color: C.pend, mine: true, href: "/shop?tab=cart" }] },
    { key: "estimates", title: "Estimates", sub: "Get an Estimate", href: "/estimate", seeAllLabel: "Open Estimates", slices: [
      { label: "Requested", n: events, color: C.steel, href: "/estimate?tab=requests" }, { label: "Estimates In", n: estIn, color: C.pend, mine: true, href: "/estimate?tab=in" }, { label: "Awarded", n: awarded, color: C.ok, href: "/estimate?tab=awarded" }] },
    { key: "requests", title: "Requests to Buy", sub: "Approval before an Order", href: "/shop?tab=purchases", seeAllLabel: "Open Purchases", slices: Object.entries(REQUEST_STATUS_LABEL).map(([k, l]) => ({ label: l, n: rs.filter((x) => x === k).length, color: REQ_COLOR[l], href: "/shop?tab=purchases" })) },
    { key: "delivered", title: "Delivered", sub: "What you bought", href: "/shop?tab=purchases", seeAllLabel: "Open Purchases", slices: [
      { label: "Ordered", n: orders.length - done, color: C.steel, href: "/shop?tab=purchases" }, { label: "Delivered", n: done, color: C.ok, href: "/shop?tab=purchases" }] },
  ];
}
