import { prisma } from "@/lib/prisma";
import { C, quarterStart, slicesFrom, usd, type DashData, type DashRow } from "@/lib/dashboard/types";

// MD-E003: the seller's Things You Need to Do — Jobs, Orders, My Catalog and Payments from one set of rows.
const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD"]);
const DONE = new Set(["CLOSED", "FINALLY_CLOSED"]);
const lineTotal = (l: { amount_cents: number | null; quantity: unknown; unit_price_cents: number | null }) => l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));

export async function sellerDashboard(personId: string): Promise<DashData> {
  const profile = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true, provider_number: true } });
  const [reqs, props, ivs, orders, services, products, prs] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: personId }, select: { job_id: true, status: true, updated_at: true } }),
    prisma.proposal.findMany({ where: { provider_person_id: personId, status: { notIn: ["DRAFT", "WITHDRAWN"] } }, select: { job_id: true, status: true, updated_at: true, lines: { take: 1, select: { unit_price_cents: true } } } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: personId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } }, select: { job_id: true, status: true, updated_at: true } }),
    prisma.workOrder.findMany({ where: { provider_person_id: personId, status: { notIn: ["CANCELLED", "DRAFT"] } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, order_number: true, description: true, status: true, provider_accepted_at: true, not_to_exceed_cents: true, buyer_person_id: true, updated_at: true } }),
    profile ? prisma.providerService.findMany({ where: { provider_profile_id: profile.id, active: true }, select: { id: true, name: true, published_at: true, rate_cents: true, uom: true, updated_at: true } }) : [],
    profile ? prisma.serviceProduct.findMany({ where: { provider_profile_id: profile.id }, select: { id: true, title: true, status: true, price_cents: true, updated_at: true } }) : [],
    prisma.paymentRequest.findMany({ where: { provider_person_id: personId, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } }, select: { status: true, decided_at: true, updated_at: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } }),
  ]);
  const jobIds = [...new Set([...reqs, ...props, ...ivs].map((x) => x.job_id))];
  const jobs = await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, budget_min_cents: true, budget_max_cents: true, buyer: { select: { company: { select: { name: true } } } } } });
  const buyers = await prisma.person.findMany({ where: { id: { in: orders.map((o) => o.buyer_person_id) } }, select: { id: true, company: { select: { name: true } } } });

  const rows: DashRow[] = [];
  for (const id of jobIds) {
    const j = jobs.find((x) => x.id === id);
    if (!j) continue;
    const p = props.find((x) => x.job_id === id), r = reqs.find((x) => x.job_id === id), iv = ivs.find((x) => x.job_id === id);
    const slice = p?.status === "AWARDED" ? "Hired" : p && ["NOT_SELECTED", "DECLINED"].includes(p.status) || r?.status === "DECLINED" ? "Not Chosen" : iv ? "Interview" : p ? "Said Available" : "Asked";
    const mine = slice === "Asked" || (slice === "Interview" && iv?.status !== "SLOTS_OFFERED");
    const at = [p?.updated_at, r?.updated_at, iv?.updated_at].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date(0);
    rows.push({ key: `j-${id}`, type: "Job", what: j.title, number: null, who: j.buyer?.company?.name ?? "Buyer", status: slice, tone: slice === "Hired" ? "ok" : slice === "Not Chosen" ? "st" : slice === "Said Available" ? "st" : "pend", next: slice === "Asked" ? "Say if you're available" : slice === "Interview" ? (iv?.status === "SCHEDULED" ? "Join the interview" : "Pick a time") : slice === "Said Available" ? "Waiting on the buyer" : "—", waitingOnYou: mine, waitingOn: mine ? "You" : slice === "Said Available" ? "Buyer" : "—", amount: p?.lines[0]?.unit_price_cents != null ? `${usd(p.lines[0].unit_price_cents)}/hr` : j.budget_min_cents != null ? `${usd(j.budget_min_cents)}–${usd(j.budget_max_cents)}/hr` : "—", updatedAt: at.toISOString(), href: `/find-work/${id}`, donut: "jobs", slice });
  }
  for (const o of orders) {
    const slice = DONE.has(o.status) ? "Delivered" : o.status === "ISSUED" && !o.provider_accepted_at ? "To Accept" : "Active";
    rows.push({ key: `o-${o.id}`, type: "Order", what: o.description || "Order", number: o.order_number, who: buyers.find((b) => b.id === o.buyer_person_id)?.company?.name ?? "Buyer", status: slice, tone: slice === "To Accept" ? "pend" : "ok", next: slice === "To Accept" ? "Review and accept" : slice === "Active" ? (RELEASED.has(o.status) ? "Deliver and bill" : "Waiting on release") : "—", waitingOnYou: slice === "To Accept" || (slice === "Active" && RELEASED.has(o.status)), waitingOn: slice === "To Accept" || RELEASED.has(o.status) ? "You" : "Buyer", amount: usd(o.not_to_exceed_cents), updatedAt: o.updated_at.toISOString(), href: `/orders/${o.id}`, donut: "orders", slice });
  }
  for (const s of services) rows.push({ key: `s-${s.id}`, type: "Product", what: s.name, number: null, who: "—", status: s.published_at ? "Listed" : "Draft", tone: s.published_at ? "ok" : "st", next: s.published_at ? "—" : "Finish and publish", waitingOnYou: !s.published_at, waitingOn: s.published_at ? "—" : "You", amount: s.rate_cents != null ? `${usd(s.rate_cents)}${s.uom === "HOUR" ? "/hr" : ""}` : "—", updatedAt: s.updated_at.toISOString(), href: "/catalog/services", donut: "catalog", slice: s.published_at ? "Listed" : "Draft" });
  for (const p of products) rows.push({ key: `p-${p.id}`, type: "Product", what: p.title, number: null, who: "—", status: p.status === "PUBLISHED" ? "Listed" : "Draft", tone: p.status === "PUBLISHED" ? "ok" : "st", next: p.status === "PUBLISHED" ? "—" : "Finish and publish", waitingOnYou: p.status !== "PUBLISHED", waitingOn: p.status === "PUBLISHED" ? "—" : "You", amount: usd(p.price_cents), updatedAt: p.updated_at.toISOString(), href: "/catalog/products", donut: "catalog", slice: p.status === "PUBLISHED" ? "Listed" : "Draft" });
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const billed = prs.filter((p) => p.status !== "PAID").length, paid = prs.filter((p) => p.status === "PAID").length;
  const q = quarterStart();
  const earned = prs.filter((p) => p.status === "PAID" && (p.decided_at ?? p.updated_at) >= q).reduce((n, p) => n + p.lines.reduce((m, l) => m + lineTotal(l), 0), 0);
  const { getWorkFeed } = await import("@/lib/work-feed");
  const matches = profile ? (await getWorkFeed({ tab: "best", profileId: profile.id }).catch(() => [])).length : 0;
  const active = orders.filter((o) => RELEASED.has(o.status)).length;
  return {
    summary: [profile?.provider_number, `${matches} job${matches === 1 ? "" : "s"} match you`, `${active} Order${active === 1 ? "" : "s"} active`, `${usd(earned)} earned this quarter`].filter(Boolean).join(" · "),
    donuts: [
      { key: "jobs", title: "Jobs", sub: "Asked, answered, chosen", slices: slicesFrom(rows, "jobs", [{ label: "Asked", color: C.pend, mine: true }, { label: "Said Available", color: C.steel }, { label: "Interview", color: C.ink, mine: true }, { label: "Hired", color: C.ok }, { label: "Not Chosen", color: C.grey }]) },
      { key: "orders", title: "Orders", sub: "The work under contract", slices: slicesFrom(rows, "orders", [{ label: "To Accept", color: C.pend, mine: true }, { label: "Active", color: C.ok }, { label: "Delivered", color: C.okSoft }]) },
      { key: "catalog", title: "My Catalog", sub: "What you list", slices: slicesFrom(rows, "catalog", [{ label: "Listed", color: C.ok }, { label: "Draft", color: C.grey, mine: true }]) },
      { key: "payments", title: "Payments", sub: "To you", slices: [{ label: "Billed", n: billed, color: C.pend }, { label: "Paid", n: paid, color: C.ok }], ...(billed + paid === 0 ? { note: "Comes With Settlement" } : {}) },
    ],
    rows,
    filters: [["all", "All"], ["mine", "Waiting on Me"], ["Job", "Jobs"], ["Order", "Orders"], ["Product", "Products"]],
  };
}
