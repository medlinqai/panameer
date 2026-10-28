import { prisma } from "@/lib/prisma";

// MD-E004: My Progress — you against the group doing well on Panameer this period. Group: sellers with ≥1 Order paid or
// delivered in the period; buyers with ≥1 Order created. Under 20 people → the group marker is the Panameer Target.
import { PERIODS, periodRange, type PeriodKey } from "@/lib/dashboard/periods";
export { PERIODS, periodRange, type PeriodKey };
export const GROUP_MIN = 20;

// Every metric key — Admin › Performance Targets edits one row per key (MD-E005).
export const SELLER_KEYS = ["seller.connect.invited", "seller.connect.connected", "seller.connect.mentoring", "seller.connect.introduced", "seller.courses.published", "seller.courses.matched", "seller.courses.enrolled", "seller.courses.taken", "seller.courses.certified", "seller.orders.offered", "seller.orders.accepted", "seller.orders.delivered", "seller.orders.on_time", "seller.payments.earned", "seller.reviews.rating", "seller.reviews.count"] as const;
export const BUYER_KEYS = ["buyer.connect.invited", "buyer.connect.connected", "buyer.connect.mentors", "buyer.jobs.published", "buyer.jobs.availability", "buyer.jobs.interviewed", "buyer.jobs.hired", "buyer.shop.viewed", "buyer.shop.ordered", "buyer.shop.delivered", "buyer.orders.created", "buyer.orders.active", "buyer.orders.approved", "buyer.orders.on_time", "buyer.payments.paid", "buyer.reviews.rating", "buyer.reviews.count"] as const;
/** Metrics with no data source yet — always 0 (listed in the report). */
export const NO_SOURCE = new Set(["seller.connect.introduced", "seller.courses.matched"]);
type M = Record<string, number>;
const RELEASED = ["RELEASED", "ACTIVE", "ON_HOLD"] as const;
const DONE = ["CLOSED", "FINALLY_CLOSED"] as const;

async function usersOf(personIds: string[]) {
  const ps = await prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, user_id: true } });
  return new Map(ps.filter((p) => p.user_id).map((p) => [p.id, p.user_id!]));
}
const count = <T,>(rows: T[], key: (r: T) => string | null | undefined) => { const m = new Map<string, number>(); for (const r of rows) { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const prTotal = (lines: { amount_cents: number | null; quantity: unknown; unit_price_cents: number | null }[]) => lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);

/** Shared Connect + Learn numbers for a set of people. */
export async function connectLearn(personIds: string[], from: Date, to: Date) {
  const users = await usersOf(personIds);
  const uids = [...users.values()];
  const inPeriod = { gte: from, lte: to };
  const [invites, conns, mentorAsMentor, mentorAsMentee, enrolls, attempts, published] = await Promise.all([
    prisma.invitationToJoin.findMany({ where: { inviter_person_id: { in: personIds }, created_at: inPeriod }, select: { inviter_person_id: true } }),
    prisma.connection.findMany({ where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: { in: uids } }, { to_user_id: { in: uids } }], responded_at: inPeriod }, select: { from_user_id: true, to_user_id: true } }),
    prisma.connection.findMany({ where: { kind: "MENTOR", status: "ACCEPTED", to_user_id: { in: uids } }, select: { to_user_id: true } }),
    prisma.connection.findMany({ where: { kind: "MENTOR", status: "ACCEPTED", from_user_id: { in: uids } }, select: { from_user_id: true } }),
    prisma.enrollment.findMany({ where: { user_id: { in: uids } }, select: { user_id: true } }),
    prisma.certificationAttempt.findMany({ where: { user_id: { in: uids }, is_preview: false }, select: { user_id: true, learning_path_id: true, passed: true } }),
    prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
  ]);
  const out = new Map<string, M>();
  for (const pid of personIds) {
    const u = users.get(pid);
    const taken = new Set(attempts.filter((a) => a.user_id === u).map((a) => a.learning_path_id)).size;
    const certified = new Set(attempts.filter((a) => a.user_id === u && a.passed).map((a) => a.learning_path_id)).size;
    out.set(pid, {
      invited: invites.filter((i) => i.inviter_person_id === pid).length,
      connected: u ? conns.filter((c) => c.from_user_id === u || c.to_user_id === u).length : 0,
      mentoring: u ? mentorAsMentor.filter((c) => c.to_user_id === u).length : 0,
      mentors: u ? mentorAsMentee.filter((c) => c.from_user_id === u).length : 0,
      enrolled: u ? enrolls.filter((e) => e.user_id === u).length : 0,
      taken, certified, published,
    });
  }
  return out;
}

export async function sellerMetrics(personIds: string[], from: Date, to: Date): Promise<Map<string, M>> {
  const inPeriod = { gte: from, lte: to };
  const [cl, rated, orders, prs] = await Promise.all([
    connectLearn(personIds, from, to),
    import("@/lib/order-reviews").then((m) => m.ratingsByPerson("BUYER", personIds)),
    prisma.workOrder.findMany({ where: { provider_person_id: { in: personIds }, created_at: inPeriod, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { provider_person_id: true, provider_accepted_at: true, status: true, period_end: true, updated_at: true } }),
    prisma.paymentRequest.findMany({ where: { provider_person_id: { in: personIds }, status: "PAID", OR: [{ decided_at: inPeriod }, { decided_at: null, updated_at: inPeriod }] }, select: { provider_person_id: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } }),
  ]);
  const out = new Map<string, M>();
  for (const pid of personIds) {
    const c = cl.get(pid)!;
    const mine = orders.filter((o) => o.provider_person_id === pid);
    const delivered = mine.filter((o) => (DONE as readonly string[]).includes(o.status));
    out.set(pid, {
      "seller.connect.invited": c.invited, "seller.connect.connected": c.connected, "seller.connect.mentoring": c.mentoring, "seller.connect.introduced": 0,
      "seller.courses.published": c.published, "seller.courses.matched": 0, "seller.courses.enrolled": c.enrolled, "seller.courses.taken": c.taken, "seller.courses.certified": c.certified,
      "seller.orders.offered": mine.length, "seller.orders.accepted": mine.filter((o) => o.provider_accepted_at).length, "seller.orders.delivered": delivered.length,
      "seller.orders.on_time": delivered.filter((o) => !o.period_end || o.updated_at <= new Date(o.period_end.getTime() + 86_400_000)).length,
      "seller.payments.earned": Math.round(prs.filter((p) => p.provider_person_id === pid).reduce((n, p) => n + prTotal(p.lines), 0) / 100),
      // OR-E004: all-time Order Reviews about this seller.
      "seller.reviews.rating": Math.round((rated.get(pid)?.avg ?? 0) * 10) / 10, "seller.reviews.count": rated.get(pid)?.n ?? 0,
    });
  }
  return out;
}

export async function buyerMetrics(personIds: string[], from: Date, to: Date): Promise<Map<string, M>> {
  const [cl, users, rated] = await Promise.all([connectLearn(personIds, from, to), usersOf(personIds), import("@/lib/order-reviews").then((m) => m.ratingsByPerson("SELLER", personIds))]);
  const inPeriod = { gte: from, lte: to };
  const [jobs, events, ivs, orders, views] = await Promise.all([
    prisma.job.findMany({ where: { buyer_person_id: { in: personIds }, posted_at: inPeriod }, select: { buyer_person_id: true } }),
    prisma.sourcingEvent.findMany({ where: { created_by_person_id: { in: personIds }, created_at: inPeriod, status: { not: "DRAFT" } }, select: { created_by_person_id: true } }),
    prisma.interviewRequest.findMany({ where: { requested_by_person_id: { in: personIds }, created_at: inPeriod, status: { in: ["SCHEDULED", "COMPLETED"] } }, select: { requested_by_person_id: true } }),
    prisma.workOrder.findMany({ where: { buyer_person_id: { in: personIds }, created_at: inPeriod, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { id: true, buyer_person_id: true, status: true, period_end: true, updated_at: true, workRequest: { select: { source: true } } } }),
    prisma.usageEvent.findMany({ where: { user_id: { in: [...users.values()] }, app: "SHOP", day: inPeriod }, select: { user_id: true } }),
  ]);
  const prs = await prisma.paymentRequest.findMany({ where: { work_order_id: { in: orders.map((o) => o.id) }, status: { in: ["APPROVED", "PAID"] } }, select: { work_order_id: true, status: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } });
  const viewsBy = count(views, (v) => v.user_id), jobsBy = count(jobs, (j) => j.buyer_person_id), evBy = count(events, (e) => e.created_by_person_id), ivBy = count(ivs, (i) => i.requested_by_person_id);
  const out = new Map<string, M>();
  for (const pid of personIds) {
    const c = cl.get(pid)!;
    const mine = orders.filter((o) => o.buyer_person_id === pid);
    const shop = mine.filter((o) => o.workRequest?.source === "SHOP"), hire = mine.filter((o) => o.workRequest?.source !== "SHOP");
    const done = (o: { status: string }) => (DONE as readonly string[]).includes(o.status);
    const ids = new Set(mine.map((o) => o.id));
    out.set(pid, {
      "buyer.connect.invited": c.invited, "buyer.connect.connected": c.connected, "buyer.connect.mentors": c.mentors,
      "buyer.jobs.published": jobsBy.get(pid) ?? 0, "buyer.jobs.availability": evBy.get(pid) ?? 0, "buyer.jobs.interviewed": ivBy.get(pid) ?? 0, "buyer.jobs.hired": hire.length,
      "buyer.shop.viewed": viewsBy.get(users.get(pid) ?? "") ?? 0, "buyer.shop.ordered": shop.length, "buyer.shop.delivered": shop.filter(done).length,
      "buyer.orders.created": mine.length, "buyer.orders.active": mine.filter((o) => (RELEASED as readonly string[]).includes(o.status)).length,
      "buyer.orders.approved": prs.filter((p) => ids.has(p.work_order_id)).length,
      "buyer.orders.on_time": mine.filter((o) => done(o) && (!o.period_end || o.updated_at <= new Date(o.period_end.getTime() + 86_400_000))).length,
      "buyer.payments.paid": Math.round(prs.filter((p) => ids.has(p.work_order_id) && p.status === "PAID").reduce((n, p) => n + prTotal(p.lines), 0) / 100),
      "buyer.reviews.rating": Math.round((rated.get(pid)?.avg ?? 0) * 10) / 10, "buyer.reviews.count": rated.get(pid)?.n ?? 0,
    });
  }
  return out;
}

/** The group for the period, and its marker per metric: the real average at 20+ people, else the Panameer Target. */
export async function groupMarkers(role: "BUYER" | "SELLER", from: Date, to: Date): Promise<{ size: number; usesTarget: boolean; values: M }> {
  const members = role === "SELLER"
    ? [...new Set([
        ...(await prisma.workOrder.findMany({ where: { status: { in: [...DONE] }, updated_at: { gte: from, lte: to } }, select: { provider_person_id: true } })).map((o) => o.provider_person_id),
        ...(await prisma.paymentRequest.findMany({ where: { status: "PAID", updated_at: { gte: from, lte: to } }, select: { provider_person_id: true } })).map((p) => p.provider_person_id),
      ])]
    : [...new Set((await prisma.workOrder.findMany({ where: { created_at: { gte: from, lte: to }, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { buyer_person_id: true } })).map((o) => o.buyer_person_id))];
  if (members.length < GROUP_MIN) {
    // Saved Targets win; the rest use the defaults (MD-E005). Courses Published is the platform count, not a target.
    const { targetRows } = await import("@/lib/dashboard/targets");
    const values = Object.fromEntries((await targetRows(role)).map((r) => [r.metric, r.value]));
    if (role === "SELLER") values["seller.courses.published"] = await prisma.learningPath.count({ where: { status: "PUBLISHED" } });
    return { size: members.length, usesTarget: true, values };
  }
  const per = role === "SELLER" ? await sellerMetrics(members, from, to) : await buyerMetrics(members, from, to);
  const keys = role === "SELLER" ? SELLER_KEYS : BUYER_KEYS;
  const values: M = {};
  for (const k of keys) {
    // A rating averages only the people who have one.
    const ms = k.endsWith(".reviews.rating") ? [...per.values()].filter((m) => (m[k] ?? 0) > 0) : [...per.values()];
    values[k] = ms.length ? Math.round((ms.reduce((n, m) => n + (m[k] ?? 0), 0) / (k.endsWith(".reviews.rating") ? ms.length : members.length)) * 10) / 10 : 0;
  }
  return { size: members.length, usesTarget: false, values };
}

// ── Demand (sellers, last 30 days): each service or service product → asks → High / Medium / Low by asks per seller offering it.
export type DemandRow = { name: string; asks: number; level: "High" | "Medium" | "Low" };
const level = (perSeller: number): DemandRow["level"] => (perSeller >= 3 ? "High" : perSeller >= 1 ? "Medium" : "Low");
export async function serviceDemand(personId: string): Promise<DemandRow[]> {
  const prof = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  if (!prof) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const services = await prisma.providerService.findMany({ where: { provider_profile_id: prof.id, active: true, published_at: { not: null } }, select: { name: true, service_type_id: true } });
  const out: DemandRow[] = [];
  for (const s of services.slice(0, 8)) {
    let asks = 0, sellers = 1;
    if (s.service_type_id) {
      const t = await prisma.serviceType.findUnique({ where: { id: s.service_type_id }, select: { serviceCategory: { select: { business_type_id: true } } } });
      const bt = t?.serviceCategory?.business_type_id;
      asks = bt ? await prisma.job.count({ where: { business_type_id: bt, created_at: { gte: since }, status: { not: "DRAFT" } } }) : 0;
      sellers = Math.max(1, await prisma.providerService.count({ where: { service_type_id: s.service_type_id, active: true, published_at: { not: null } } }));
    } else {
      asks = await prisma.job.count({ where: { title: { contains: s.name.split(" ")[0], mode: "insensitive" }, created_at: { gte: since }, status: { not: "DRAFT" } } });
    }
    out.push({ name: s.name, asks, level: level(asks / sellers) });
  }
  return out.sort((a, b) => b.asks - a.asks);
}
export async function productDemand(personId: string): Promise<DemandRow[]> {
  const prof = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  if (!prof) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const products = await prisma.serviceProduct.findMany({ where: { provider_profile_id: prof.id, status: "PUBLISHED" }, select: { id: true, title: true, product_type_id: true } });
  const out: DemandRow[] = [];
  for (const p of products.slice(0, 8)) {
    // Asked for = cart adds and orders (product page views aren't recorded per product yet).
    const asks = await prisma.workRequestLine.count({ where: { service_product_id: p.id, created_at: { gte: since } } });
    const sellers = p.product_type_id ? Math.max(1, await prisma.serviceProduct.count({ where: { product_type_id: p.product_type_id, status: "PUBLISHED" } })) : 1;
    out.push({ name: p.title, asks, level: level(asks / sellers) });
  }
  return out.sort((a, b) => b.asks - a.asks);
}

/** Payments tile extras (cents): seller billed-not-paid and paid-to-you; buyer invoices to approve and savings on hires. */
export async function moneyExtras(personId: string, role: "BUYER" | "SELLER", from: Date, to: Date) {
  if (role === "SELLER") {
    const prs = await prisma.paymentRequest.findMany({ where: { provider_person_id: personId, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } }, select: { status: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } });
    return { a: prs.filter((p) => p.status !== "PAID").reduce((n, p) => n + prTotal(p.lines), 0), b: prs.filter((p) => p.status === "PAID").reduce((n, p) => n + prTotal(p.lines), 0) };
  }
  const orders = await prisma.workOrder.findMany({ where: { buyer_person_id: personId, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { id: true, created_at: true, workRequest: { select: { source: true, job_id: true } }, lines: { select: { unit_price_cents: true, quantity: true, uom: true } } } });
  const toApprove = await prisma.paymentRequest.findMany({ where: { work_order_id: { in: orders.map((o) => o.id) }, status: "SUBMITTED" }, select: { lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } } });
  // Savings on hires = (top of the job's range − the hired rate) × the Order's hours, for hires in the period.
  const hires = orders.filter((o) => o.created_at >= from && o.created_at <= to && o.workRequest?.job_id && o.workRequest.source !== "SHOP");
  const jobs = await prisma.job.findMany({ where: { id: { in: hires.map((o) => o.workRequest!.job_id!) } }, select: { id: true, budget_max_cents: true, budget_type: true } });
  let savings = 0;
  for (const o of hires) {
    // Hourly ranges only: a FIXED budget's max is a total, not a rate.
    const job = jobs.find((j) => j.id === o.workRequest!.job_id);
    const top = job?.budget_type === "HOURLY" ? job.budget_max_cents : null;
    if (top == null) continue;
    for (const l of o.lines) if (l.uom === "HOUR" && l.unit_price_cents != null && l.unit_price_cents < top) savings += Math.round((top - l.unit_price_cents) * Number(l.quantity ?? 0));
  }
  return { a: toApprove.reduce((n, p) => n + prTotal(p.lines), 0), b: savings };
}
