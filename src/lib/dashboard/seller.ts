import { prisma } from "@/lib/prisma";
import { dashView, getStartedDonuts, profileChecklist } from "@/lib/dashboard/views";
import { C, quarterStart, slicesFrom, usd, type DashData, type DashRow, type Donut } from "@/lib/dashboard/types";

// MD-E003: the seller's Things You Need to Do — Jobs, Orders, Catalog and Payments from one set of rows.
const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD"]);
const DONE = new Set(["CLOSED", "FINALLY_CLOSED"]);
const lineTotal = (l: { amount_cents: number | null; quantity: unknown; unit_price_cents: number | null }) => l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));

export async function sellerDashboard(personId: string, viewer: { userId: string }): Promise<DashData> {
  const profile = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true, provider_number: true } });
  // Speed (RM-E005): started with the rows' reads, awaited after them.
  const checklistP = profileChecklist(personId);
  const restP = Promise.all([
    profile ? import("@/lib/work-feed").then(({ getWorkFeed }) => getWorkFeed({ tab: "best", profileId: profile.id }).catch(() => [])) : Promise.resolve([]),
    prisma.job.count({ where: { kind: "JOB", status: "OPEN" } }),
    dashView(personId, "provider"),
    checklistP,
    prisma.estimateRequest.count({ where: { provider_person_id: personId, status: "OPEN" } }),
    Promise.all([
      prisma.interviewRequest.count({ where: { provider_person_id: personId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } } }),
      prisma.testRequest.count({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    ]).then(([a, b]) => a + b),
    prisma.workOrder.count({ where: { provider_person_id: personId, workRequest: { source: "SHOP" }, status: { notIn: ["DRAFT", "CANCELLED", "CLOSED", "FINALLY_CLOSED"] } } }),
    import("@/lib/job-agent").then((m) => m.newToday()).then((x) => x.n).catch(() => 0),
  ]);
  restP.catch(() => null);
  // Get Started's Connect and Learn load now; the Work tile joins them once the rows are built.
  let giveWork: (d: Donut) => void = () => {};
  const startP = getStartedDonuts(viewer, personId, "provider", new Promise<Donut>((r) => { giveWork = r; }), checklistP);
  startP.catch(() => null);
  const [reqs, props, ivs, orders, services, products, prs] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: personId }, select: { job_id: true, status: true, updated_at: true } }),
    prisma.proposal.findMany({ where: { provider_person_id: personId, status: { notIn: ["DRAFT", "WITHDRAWN"] } }, select: { job_id: true, status: true, updated_at: true, lines: { take: 1, select: { unit_price_cents: true } } } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: personId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED", "COMPLETED"] } }, select: { job_id: true, status: true, updated_at: true } }),
    prisma.workOrder.findMany({ where: { provider_person_id: personId, status: { notIn: ["CANCELLED", "DRAFT"] } }, orderBy: { updated_at: "desc" }, take: 200, select: { id: true, order_number: true, description: true, status: true, provider_accepted_at: true, buyer_accepted_at: true, not_to_exceed_cents: true, buyer_person_id: true, updated_at: true } }),
    profile ? prisma.providerService.findMany({ where: { provider_profile_id: profile.id, active: true }, select: { id: true, name: true, published_at: true, rate_cents: true, uom: true, updated_at: true } }) : [],
    profile ? prisma.serviceProduct.findMany({ where: { provider_profile_id: profile.id }, select: { id: true, title: true, status: true, price_cents: true, updated_at: true } }) : [],
    prisma.paymentRequest.findMany({ where: { provider_person_id: personId, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } }, select: { status: true, decided_at: true, updated_at: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } }),
  ]);
  const jobIds = [...new Set([...reqs, ...props, ...ivs].map((x) => x.job_id))];
  const [jobs, buyers, awaitingRows] = await Promise.all([
    prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, budget_min_cents: true, budget_max_cents: true, buyer: { select: { company: { select: { name: true } } } } } }),
    prisma.person.findMany({ where: { id: { in: orders.map((o) => o.buyer_person_id) } }, select: { id: true, company: { select: { name: true } } } }),
    prisma.workRequest.findMany({ where: { job_id: { in: jobIds }, status: { in: ["SUBMITTED", "PENDING_APPROVAL", "INCOMPLETE"] }, lines: { some: { provider_person_id: personId } } }, select: { job_id: true } }),
  ]);
  const awaiting = new Set(awaitingRows.map((w) => w.job_id));
  const rows: DashRow[] = [];
  for (const id of jobIds) {
    const j = jobs.find((x) => x.id === id);
    if (!j) continue;
    const p = props.find((x) => x.job_id === id), r = reqs.find((x) => x.job_id === id), iv = ivs.find((x) => x.job_id === id);
    // HT-E003: each job at its latest stage; Not Chosen leaves the pie (still in the table, under Closed).
    const slice = p?.status === "AWARDED" ? "They Chose You" : p && ["NOT_SELECTED", "DECLINED"].includes(p.status) || r?.status === "DECLINED" ? "Not Chosen" : iv ? "You Interviewed" : p ? (r ? "You Answered" : "You Applied") : "They Requested";
    // WK-E007: a Request to Hire naming you that's still waiting on approval.
    const rqWaiting = slice !== "They Chose You" && slice !== "Not Chosen" && awaiting.has(id);
    const mine = slice === "They Requested" || (slice === "You Interviewed" && ["REQUESTED", "SCHEDULED"].includes(iv?.status ?? ""));
    const at = [p?.updated_at, r?.updated_at, iv?.updated_at].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date(0);
    rows.push({ key: `j-${id}`, type: "Job", what: j.title, number: null, who: j.buyer?.company?.name ?? "Buyer", status: rqWaiting ? "Buyer Requested to Hire You · Awaiting Approval" : slice, tone: slice === "They Chose You" || rqWaiting ? "ok" : slice === "Not Chosen" || slice === "You Applied" || slice === "You Answered" ? "st" : "pend", next: slice === "They Requested" ? "Say if you're available" : slice === "You Interviewed" ? (iv?.status === "SCHEDULED" ? "Join the interview" : iv?.status === "REQUESTED" ? "Pick a time" : "Waiting on the buyer") : slice === "You Applied" ? "Waiting on the buyer" : "—", waitingOnYou: mine, waitingOn: mine ? "You" : slice === "You Applied" ? "Buyer" : "—", amount: p?.lines[0]?.unit_price_cents != null ? `${usd(p.lines[0].unit_price_cents)}/hr` : j.budget_min_cents != null ? `${usd(j.budget_min_cents)}–${usd(j.budget_max_cents)}/hr` : "—", updatedAt: at.toISOString(), href: `/find-work/${id}`, donut: slice === "Not Chosen" ? "" : "jobs", slice, done: slice === "They Chose You" || slice === "Not Chosen" });
  }
  for (const o of orders) {
    // WK-E007: the buyer accepts first — until then the provider sees Order Coming.
    const slice = DONE.has(o.status) ? "Delivered" : o.status === "ISSUED" && !o.buyer_accepted_at ? "Order Coming" : o.status === "ISSUED" && !o.provider_accepted_at ? "To Accept" : "Active";
    rows.push({ key: `o-${o.id}`, type: "Order", what: o.description || "Order", number: o.order_number, who: buyers.find((b) => b.id === o.buyer_person_id)?.company?.name ?? "Buyer", status: slice, tone: slice === "To Accept" ? "pend" : slice === "Order Coming" ? "st" : "ok", next: slice === "Order Coming" ? "Order coming · the buyer is reviewing it" : slice === "To Accept" ? "Review and accept" : slice === "Active" ? (RELEASED.has(o.status) ? "Deliver and bill" : "Waiting on release") : "—", waitingOnYou: slice === "To Accept" || (slice === "Active" && RELEASED.has(o.status)), waitingOn: slice === "To Accept" || RELEASED.has(o.status) ? "You" : "Buyer", amount: usd(o.not_to_exceed_cents), updatedAt: o.updated_at.toISOString(), href: `/orders/${o.id}`, donut: "orders", slice, done: slice === "Delivered" });
  }
  // JR-E007: a service listing goes straight to Listed.
  for (const s of services) rows.push({ key: `s-${s.id}`, type: "Product", what: s.name, number: null, who: "—", status: "Listed", tone: "ok", next: "—", waitingOnYou: false, waitingOn: "—", amount: s.rate_cents != null ? `${usd(s.rate_cents)}${s.uom === "HOUR" ? "/hr" : ""}` : "—", updatedAt: s.updated_at.toISOString(), href: "/catalog/services", donut: "catalog", slice: "Listed", done: false });
  for (const p of products) rows.push({ key: `p-${p.id}`, type: "Product", what: p.title, number: null, who: "—", status: p.status === "PUBLISHED" ? "Listed" : "Draft", tone: p.status === "PUBLISHED" ? "ok" : "st", next: p.status === "PUBLISHED" ? "—" : "Finish and publish", waitingOnYou: p.status !== "PUBLISHED", waitingOn: p.status === "PUBLISHED" ? "—" : "You", amount: usd(p.price_cents), updatedAt: p.updated_at.toISOString(), href: "/catalog/products", donut: "catalog", slice: p.status === "PUBLISHED" ? "Listed" : "Draft", done: false });
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const billed = prs.filter((p) => p.status !== "PAID").length, paid = prs.filter((p) => p.status === "PAID").length;
  const q = quarterStart();
  const [feed, openJobs, { view }, checklist, estimatesAsked, fitCount, productOrders, agentNew] = await restP;
  const earned = prs.filter((p) => p.status === "PAID" && (p.decided_at ?? p.updated_at) >= q).reduce((n, p) => n + p.lines.reduce((m, l) => m + lineTotal(l), 0), 0);
  const matches = feed.length;
  // HT-E003: You Matched = fits your skills, no action yet.
  for (const c of feed.filter((c) => c.matched > 0 && !jobIds.includes(c.id))) rows.push({ key: `m-${c.id}`, type: "Job", what: c.title, number: null, who: c.identity.companyName ?? "Buyer", status: "You Matched", tone: "pend", next: "Say I Want This Job", waitingOnYou: true, waitingOn: "You", amount: c.budgetLabel ?? "—", updatedAt: c.postedAt ?? new Date(0).toISOString(), href: `/find-work/${c.id}`, donut: "jobs", slice: "You Matched", done: false });
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const active = orders.filter((o) => RELEASED.has(o.status)).length;
  const jobsAt = (stage: string) => rows.filter((r) => r.type === "Job" && r.slice === stage).length;
  // 10-27: the Work tile, by type — each line opens that list in Work; the title opens the Work home.
  const workTile: Donut = { key: "work", title: "Work", sub: "Jobs, estimates, interviews", href: "/work/home", total: `${openJobs.toLocaleString("en-US")} open`, slices: [
    { label: "Jobs Matched", n: jobsAt("You Matched"), color: C.grey, mine: true, href: "/work/jobs?stage=You%20Matched" },
    { label: "Availability Asked", n: jobsAt("They Requested"), color: C.pend, mine: true, href: "/work/jobs?stage=They%20Requested" },
    { label: "Estimates Asked", n: estimatesAsked, color: C.pendSoft, mine: true, href: "/work/estimates" },
    { label: "Interviews & Tests", n: fitCount, color: C.ink, mine: true, href: "/work/jobs?stage=You%20Interviewed" },
    { label: "Product Orders", n: productOrders, color: C.steel, href: "/work/product-orders" },
    // EX-E004: the Job Agent's real count.
    { label: "Job Agent: New Today", n: agentNew, color: C.grey, href: "/work/job-agent" },
  ] };
  const servicesListed = rows.filter((r) => r.key.startsWith("s-")).length;
  const productsLive = rows.filter((r) => r.key.startsWith("p-") && r.slice === "Listed").length;
  const drafts = rows.filter((r) => r.key.startsWith("p-") && r.slice === "Draft").length;
  const work: Donut[] = [
    workTile,
    { key: "orders", title: "Orders", sub: "The work under contract", slices: slicesFrom(rows, "orders", [{ label: "Order Coming", color: C.grey }, { label: "To Accept", color: C.pend, mine: true }, { label: "Active", color: C.ok }, { label: "Delivered", color: C.okSoft }]) },
    { key: "payments", title: "Payments", sub: "To you", href: "/payments", slices: [{ label: "Billed", n: billed, color: C.pend }, { label: "Paid", n: paid, color: C.ok }], ...(billed + paid === 0 ? { note: "Payments show here once an Order is billed." } : {}) },
    { key: "catalog", title: "Catalog", sub: "What you list", href: "/catalog", slices: [
      { label: "Services Listed", n: servicesListed, color: C.ok, href: "/catalog#services" }, { label: "Service Products Listed", n: productsLive, color: C.ink, href: "/catalog#products" }, { label: "Draft", n: drafts, color: C.grey, mine: true, href: "/catalog#products" }] },
  ];
  // HT-E004 / 10-27: Get Started = Profile · Connect · Learn · Work; Make Money = Work · Orders · Payments · Catalog. Both load; the switch flips in place.
  giveWork(workTile);
  const start = await startP;
  const done = checklist.filter((i) => i.n > 0).length;
  return {
    providerNumber: profile?.provider_number ?? null,
    summary: view === "start" ? [`${matches} job${matches === 1 ? "" : "s"} match you`, `Profile ${done} of ${checklist.length} complete`].join(" · ") : [`${matches} job${matches === 1 ? "" : "s"} match you`, `${active} Order${active === 1 ? "" : "s"} active`, `${usd(earned)} earned this quarter`].filter(Boolean).join(" · "),
    view, viewLabels: ["Get Started", "Make Money"], setupDone: done === checklist.length, checklist,
    donuts: view === "start" ? start : work,
    views: { start, work },
    rows,
    filters: [["active", "Active"], ["mine", "Waiting on Me"], ["Job", "Jobs"], ["Order", "Orders"], ["Product", "Products"], ["closed", "Closed"]],
  };
}
