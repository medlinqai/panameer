import { prisma } from "@/lib/prisma";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { C, type Donut } from "@/lib/dashboard/types";
import type { AttentionItem, AttentionLine } from "@/lib/attention";

// WK-E002 / WA-E001: the Work home's tiles — Jobs for You · Estimates · Product Orders · Catalog.
export const JOB_STAGES = ["You Matched", "You Applied", "They Requested", "You Answered", "You Interviewed", "They Chose You"] as const;
export const jobsHref = (stage?: string) => (stage ? `/work/jobs?stage=${encodeURIComponent(stage)}` : "/work/jobs");


// WA-E001: Product Orders — buyers who ordered your Service Products in Shop, through delivery.
export const PRODUCT_STAGES = ["Requested to Buy", "To Accept", "In Delivery", "Delivered"] as const;
export type ProductOrderRow = { key: string; what: string; buyer: string; amount: string; stage: (typeof PRODUCT_STAGES)[number]; href: string; at: string };
export async function productOrderRows(personId: string): Promise<ProductOrderRow[]> {
  const [orders, pending] = await Promise.all([
    prisma.workOrder.findMany({ where: { provider_person_id: personId, workRequest: { source: "SHOP" }, status: { notIn: ["DRAFT", "CANCELLED"] } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, description: true, status: true, provider_accepted_at: true, not_to_exceed_cents: true, buyer_person_id: true, updated_at: true } }),
    prisma.workRequest.findMany({ where: { source: "SHOP", status: { in: ["SUBMITTED", "PENDING_APPROVAL"] }, lines: { some: { provider_person_id: personId, work_order_id: null } } }, take: 100, select: { id: true, title: true, buyer_person_id: true, updated_at: true, lines: { where: { provider_person_id: personId }, select: { amount_cents: true, quantity: true, unit_price_cents: true } } } }),
  ]);
  const buyers = new Map((await prisma.person.findMany({ where: { id: { in: [...orders.map((o) => o.buyer_person_id), ...pending.map((w) => w.buyer_person_id)] } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } })).map((p) => [p.id, p.company?.name ?? `${p.first_name} ${p.last_name}`.trim()]));
  const usd = (c: number | null | undefined) => (c == null ? "—" : `$${Math.round(c / 100).toLocaleString("en-US")}`);
  return [
    ...pending.map((w) => ({ key: `r-${w.id}`, what: w.title || "Service Product", buyer: buyers.get(w.buyer_person_id) ?? "Buyer", amount: usd(w.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0)), stage: "Requested to Buy" as const, href: "/shop?tab=sales", at: w.updated_at.toISOString() })),
    ...orders.map((o) => ({ key: `o-${o.id}`, what: o.description || "Service Product", buyer: buyers.get(o.buyer_person_id) ?? "Buyer", amount: usd(o.not_to_exceed_cents),
      stage: (["CLOSED", "FINALLY_CLOSED"].includes(o.status) ? "Delivered" : o.status === "ISSUED" && !o.provider_accepted_at ? "To Accept" : "In Delivery") as ProductOrderRow["stage"], href: `/orders/${o.id}`, at: o.updated_at.toISOString() })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

export async function workApp(personId: string, viewer: { userId: string }) {
  const now = new Date();
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  const [rows, openJobs, asked, sent, accepted, expired, products, ratesLive, productsLive, drafts] = await Promise.all([
    sellerDashboard(personId, viewer).then((d) => d.rows),
    prisma.job.count({ where: { kind: "JOB", status: "OPEN" } }),
    prisma.estimateRequest.findMany({ where: { provider_person_id: personId, status: "OPEN" }, orderBy: { created_at: "asc" }, take: 50, select: { id: true, description: true, start_by: true, requester_person_id: true } }),
    prisma.estimate.count({ where: { provider_person_id: personId, status: { in: ["SENT", "CHANGES_REQUESTED"] } } }),
    prisma.estimate.count({ where: { provider_person_id: personId, status: "ACCEPTED" } }),
    prisma.estimate.count({ where: { provider_person_id: personId, OR: [{ status: "EXPIRED" }, { status: "SENT", valid_until: { lt: now } }] } }),
    productOrderRows(personId),
    pp ? prisma.providerService.count({ where: { provider_profile_id: pp.id, active: true } }) : 0,
    pp ? prisma.serviceProduct.count({ where: { provider_profile_id: pp.id, status: "PUBLISHED" } }) : 0,
    pp ? prisma.serviceProduct.count({ where: { provider_profile_id: pp.id, status: { not: "PUBLISHED" } } }) : 0,
  ]);
  const n = (stage: string) => rows.filter((r) => r.type === "Job" && r.slice === stage).length;
  const MINE = new Set(["You Matched", "They Requested"]);
  const COLOR: Record<string, string> = { "You Matched": C.grey, "You Applied": C.steel, "They Requested": C.pend, "You Answered": C.pendSoft, "You Interviewed": C.ink, "They Chose You": C.ok };
  const donuts: Donut[] = [
    { key: "jobs", title: "Jobs for You", sub: "Matched to your skills", total: `${openJobs.toLocaleString("en-US")} open`, href: jobsHref(), seeAllLabel: "Open Jobs for You", lead: { text: `${openJobs.toLocaleString("en-US")} open jobs on Panameer`, href: "/find-work?tab=best", label: "Browse" },
      slices: JOB_STAGES.map((s) => ({ label: s, n: n(s), color: COLOR[s], mine: MINE.has(s), href: jobsHref(s) })) },
    { key: "estimates", title: "Estimates", sub: "Buyers asking your price", href: "/work/estimates", seeAllLabel: "Open Estimates", slices: [
      { label: "Asked of You", n: asked.length, color: C.pend, mine: true, href: "/work/estimates?stage=asked" }, { label: "Sent", n: sent, color: C.steel, href: "/work/estimates?stage=sent" },
      { label: "Accepted", n: accepted, color: C.ok, href: "/work/estimates?stage=accepted" }, { label: "Expired", n: expired, color: C.grey, href: "/work/estimates?stage=expired" }] },
    { key: "products", title: "Product Orders", sub: "Your Service Products, ordered", href: "/work/product-orders", seeAllLabel: "Open Product Orders", slices: PRODUCT_STAGES.map((st) => ({ label: st, n: products.filter((p) => p.stage === st).length, color: st === "Delivered" ? C.ok : st === "In Delivery" ? C.ink : st === "To Accept" ? C.pend : C.pendSoft, mine: st === "To Accept", href: `/work/product-orders?stage=${encodeURIComponent(st)}` })) },
    { key: "catalog", title: "Catalog", sub: "What you offer", href: "/catalog", seeAllLabel: "Open Catalog", slices: [
      { label: "Services Listed", n: ratesLive, color: C.ok, href: "/catalog#services" }, { label: "Service Products Listed", n: productsLive, color: C.ink, href: "/catalog#products" },
      { label: "Draft", n: drafts, color: C.grey, mine: true, href: "/catalog#products" }] },
  ];
  return { donuts, openJobs, estimatesWaiting: asked.length, rows, products };
}

/** WK-E008: Work's own Things You Need to Do lines (estimates to send, tests to take, matched jobs to apply for) — appCounts writes them into the Worklist. */
export async function workLines(personId: string, profileId: string | null): Promise<AttentionItem[]> {
  const [asked, testsReq] = await Promise.all([
    prisma.estimateRequest.findMany({ where: { provider_person_id: personId, status: "OPEN" }, orderBy: { created_at: "asc" }, take: 50, select: { id: true, description: true, start_by: true, requester_person_id: true } }),
    prisma.testRequest.findMany({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } }, select: { id: true, request_number: true, job_id: true, responds_by: true } }),
  ]);
  const [requesters, jobs] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: asked.map((r) => r.requester_person_id) } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } }),
    prisma.job.findMany({ where: { id: { in: testsReq.map((t) => t.job_id) } }, select: { id: true, title: true } }),
  ]);
  const who = (pid: string) => { const p = requesters.find((x) => x.id === pid); return p ? p.company?.name ?? `${p.first_name} ${p.last_name}`.trim() : "A buyer"; };
  const touched = new Set((await prisma.proposalRequest.findMany({ where: { provider_person_id: personId }, select: { job_id: true } })).map((r) => r.job_id).concat((await prisma.proposal.findMany({ where: { provider_person_id: personId }, select: { job_id: true } })).map((p) => p.job_id)));
  const { getWorkFeed } = await import("@/lib/work-feed");
  const feed = profileId ? (await getWorkFeed({ tab: "best", profileId }).catch(() => [])).filter((c) => c.matched > 0 && !touched.has(c.id)).sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "")).slice(0, 3) : [];
  const group = (title: string, app: "request" | "estimate", lines: AttentionLine[], href: string): AttentionItem[] => (lines.length ? [{ id: `work:${title}`, title, n: lines.length, what: title, app, appLabel: "Work", due: null, dueAt: null, href, action: "Open", lines }] : []);
  return [
    ...group("Estimates", "estimate", asked.map((r) => ({ key: r.id, what: `Send Estimate · ${who(r.requester_person_id)} · ${r.description.slice(0, 50)}`, detail: "", dueAt: r.start_by?.toISOString() ?? null, href: "/estimate", action: "Send" })), "/work/estimates"),
    ...group("Tests to Take", "request", testsReq.map((t) => ({ key: t.id, what: ["Take the Requested Test", jobs.find((j) => j.id === t.job_id)?.title].filter(Boolean).join(" · "), detail: "", dueAt: t.responds_by?.toISOString() ?? null, href: `/find-work/${t.job_id}`, action: "Start" })), jobsHref("You Interviewed")),
    ...group("Jobs for You", "request", feed.map((c) => ({ key: c.id, what: ["Apply", c.title, c.budgetLabel].filter(Boolean).join(" · "), detail: "", dueAt: null, href: `/find-work/${c.id}`, action: "Apply" })), jobsHref("You Matched")),
  ];
}
