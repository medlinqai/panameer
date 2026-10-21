import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { nextNumber } from "@/lib/numbering";
import { createRequest } from "@/lib/estimate-requests";
import { providerLabel, providerNumbers, identityVisibleTo } from "@/lib/provider-number";
import { WorkRequestError } from "@/lib/work-request";

// ES: Estimates as a Sourcing Event (type ESTIMATES) — Describe → Ask Providers → Estimates In → Award → Approval → Work Order.
// The need is an ESTIMATE-kind Job; one EstimateRequest per provider; the buyer sees provider numbers until the WO is Released.
const DAY = 86_400_000;
const TZ = "America/New_York";
const when = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

async function buyer(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, company: { select: { p_account_id: true } } } });
  if (!p) throw new WorkRequestError("No person for this account.", "NOT_FOUND");
  return p;
}

async function labels(personIds: string[], viewer: Viewer | null) {
  const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: personIds } }, select: { id: true, person_id: true } });
  const [nums, seen, people] = await Promise.all([
    providerNumbers(profiles.map((p) => p.id)),
    viewer ? identityVisibleTo(viewer, personIds) : Promise.resolve(new Set<string>()),
    prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, first_name: true, last_name: true, user_id: true } }),
  ]);
  return (id: string) => {
    const p = people.find((x) => x.id === id);
    return { label: seen.has(id) && p ? `${p.first_name} ${p.last_name}`.trim() : providerLabel(nums.get(profiles.find((x) => x.person_id === id)?.id ?? "")), userId: p?.user_id ?? null };
  };
}

/** ES-E002: who to ask — the product's seller first, then sellers of that Product Type (up to 10 shown, 5 may be asked). */
export async function estimateCandidates(viewer: Viewer, input: { productId?: string | null; productTypeId?: string | null; providerPersonId?: string | null }) {
  const me = await buyer(viewer);
  const product = input.productId ? await prisma.serviceProduct.findUnique({ where: { id: input.productId }, select: { title: true, service_type_id: true, providerProfile: { select: { person_id: true } } } }) : null;
  const typeId = input.productTypeId ?? product?.service_type_id ?? null;
  const sellers = typeId ? await prisma.serviceProduct.findMany({ where: { service_type_id: typeId, status: "PUBLISHED" }, distinct: ["provider_profile_id"], take: 20, select: { title: true, providerProfile: { select: { person_id: true } } } }) : [];
  const ids = [...new Set([input.providerPersonId, product?.providerProfile.person_id, ...sellers.map((s) => s.providerProfile.person_id)].filter((x): x is string => !!x && x !== me.id))].slice(0, 10);
  const who = await labels(ids, viewer);
  return { productTitle: product?.title ?? null, productTypeId: typeId, candidates: ids.map((id) => ({ personId: id, label: who(id).label, sells: sellers.find((s) => s.providerProfile.person_id === id)?.title ?? (id === product?.providerProfile.person_id ? product?.title ?? null : null) })) };
}

export type OpenEstimateInput = { title: string; description: string; category?: string | null; productTypeId?: string | null; notes?: string | null; neededBy?: string | null; budgetMinCents?: number | null; budgetMaxCents?: number | null; providerPersonIds: string[]; productId?: string | null; hours: number };

/** ES-E002: open the Estimate Event — the need as an ESTIMATE Job, one request per provider. */
export async function openEstimateEvent(viewer: Viewer, input: OpenEstimateInput, files: File[] = []) {
  const me = await buyer(viewer);
  if (!me.company?.p_account_id) throw new WorkRequestError("Add your company before asking for estimates.", "INVALID");
  const title = input.title.trim().slice(0, 140);
  if (title.length < 3) throw new WorkRequestError("Give it a short title.", "INVALID");
  const ids = [...new Set(input.providerPersonIds)].filter((x) => x && x !== me.id).slice(0, 5);
  if (!ids.length) throw new WorkRequestError("Pick at least one provider (up to 5).", "INVALID");
  const h = Math.round(input.hours);
  if (!Number.isFinite(h) || h < 1 || h > 720) throw new WorkRequestError("The deadline must be 1 to 720 hours.", "INVALID");
  const pAccountId = me.company.p_account_id;
  const group = input.category ? await prisma.commodityGroup.findFirst({ where: { name: input.category }, select: { id: true } }) : null;
  const deadline = new Date(Date.now() + h * 3_600_000);
  const job = await prisma.job.create({
    data: {
      kind: "ESTIMATE", job_number: await nextNumber("JB", { pAccountId }), buyer_person_id: me.id, p_account_id: pAccountId, proposal_access: "INVITE_ONLY", status: "OPEN", posted_at: new Date(),
      title, description: [input.description.trim(), input.notes?.trim() ? `Quantity / size: ${input.notes.trim()}` : null].filter(Boolean).join("\n\n").slice(0, 4000) || null,
      commodity_group_id: group?.id ?? null, budget_min_cents: input.budgetMinCents ?? null, budget_max_cents: input.budgetMaxCents ?? null, budget_type: "FIXED",
      start_date: input.neededBy && /^\d{4}-\d{2}-\d{2}$/.test(input.neededBy) ? new Date(input.neededBy) : null,
    },
    select: { id: true },
  });
  const event = await prisma.sourcingEvent.create({
    data: { type: "ESTIMATES", event_number: await nextNumber("ES", { pAccountId }), job_id: job.id, created_by_person_id: me.id, deadline_hours: h, deadline_at: deadline, status: "OPEN" },
    select: { id: true, event_number: true },
  });
  const product = input.productId ? await prisma.serviceProduct.findUnique({ where: { id: input.productId }, select: { id: true, providerProfile: { select: { person_id: true } } } }) : null;
  const text = [title, input.description.trim(), input.notes?.trim() ? `Quantity / size: ${input.notes.trim()}` : null].filter(Boolean).join("\n\n");
  const due = `${when(deadline)} (${h} hours)`;
  for (const providerPersonId of ids) {
    await createRequest(viewer, { providerPersonId, serviceProductId: product && product.providerProfile.person_id === providerPersonId ? product.id : null, description: text, startBy: input.neededBy ?? null, budgetMinCents: input.budgetMinCents, budgetMaxCents: input.budgetMaxCents, sourcingEventId: event.id, due }, files);
  }
  return { eventId: event.id, eventNumber: event.event_number };
}

// ── ES-E003: seller — Estimates to Price ────────────────────────────────────────────────────────────────────
export type SellerEstimateRow = { id: string; what: string; buyer: string; jobTitle: string; due: string | null; status: string; estimateId: string | null; needsAction: boolean; completed: boolean; recurring: null };
export async function sellerEstimateRequests(personId: string): Promise<SellerEstimateRow[]> {
  const rows = await prisma.estimateRequest.findMany({ where: { provider_person_id: personId, sourcing_event_id: { not: null } }, orderBy: { created_at: "desc" }, take: 100, select: { id: true, description: true, status: true, cost_estimate_id: true, requester_person_id: true, sourcing_event_id: true } });
  const [events, people] = await Promise.all([
    prisma.sourcingEvent.findMany({ where: { id: { in: rows.map((r) => r.sourcing_event_id!) } }, select: { id: true, deadline_at: true, status: true, job: { select: { title: true } } } }),
    prisma.person.findMany({ where: { id: { in: rows.map((r) => r.requester_person_id) } }, select: { id: true, company: { select: { name: true } } } }),
  ]);
  const now = Date.now();
  return rows.map((r) => {
    const ev = events.find((e) => e.id === r.sourcing_event_id);
    const open = !!ev && ev.status === "OPEN" && ev.deadline_at.getTime() > now;
    return {
      id: r.id, what: r.description.split("\n")[0].slice(0, 120), buyer: people.find((p) => p.id === r.requester_person_id)?.company?.name ?? "A buyer", jobTitle: ev?.job.title ?? "",
      due: ev ? when(ev.deadline_at) : null, status: r.status === "OPEN" ? (open ? "To price" : "Closed") : r.status === "ANSWERED" ? "Sent" : r.status === "DECLINED" ? "Declined" : "Withdrawn",
      estimateId: r.cost_estimate_id, needsAction: r.status === "OPEN" && open, completed: r.status !== "OPEN" || !open, recurring: null,
    };
  });
}

// ── ES-E004: buyer — Estimates tab + the Estimate Event page ─────────────────────────────────────────────────
type EstimateRev = { total_cents: number; scope: string | null; assumptions: string | null; exclusions: string | null; lines: { line_number: number; kind: string; description: string; uom: string | null; quantity: unknown; rate_cents: number | null; amount_cents: number | null; service_product_id: string | null }[] };
async function eventEstimates(eventId: string) {
  const reqs = await prisma.estimateRequest.findMany({ where: { sourcing_event_id: eventId }, orderBy: { created_at: "asc" }, select: { id: true, provider_person_id: true, status: true, decline_reason: true, cost_estimate_id: true, created_at: true } });
  const ests = await prisma.estimate.findMany({ where: { id: { in: reqs.map((r) => r.cost_estimate_id).filter((x): x is string => !!x) } }, select: { id: true, estimate_number: true, status: true, valid_until: true, sent_at: true, work_order_id: true, current_revision: true, revisions: { orderBy: { revision_number: "desc" }, where: { sent_at: { not: null } }, take: 1, select: { total_cents: true, scope: true, assumptions: true, exclusions: true, lines: { orderBy: { line_number: "asc" }, select: { line_number: true, kind: true, description: true, uom: true, quantity: true, rate_cents: true, amount_cents: true, service_product_id: true } } } } } });
  return reqs.map((r) => {
    const e = ests.find((x) => x.id === r.cost_estimate_id);
    const rev = (e?.revisions[0] ?? null) as EstimateRev | null;
    const sent = !!e && !!rev && ["SENT", "ACCEPTED", "CHANGES_REQUESTED"].includes(e.status);
    return { req: r, estimate: e ?? null, rev: sent ? rev : null };
  });
}

export async function buyerEstimateEvents(personId: string) {
  const events = await prisma.sourcingEvent.findMany({ where: { created_by_person_id: personId, type: "ESTIMATES" }, orderBy: { created_at: "desc" }, take: 60, select: { id: true, event_number: true, status: true, deadline_at: true, work_order_id: true, job: { select: { title: true } } } });
  const out = [];
  const now = Date.now();
  for (const ev of events) {
    const list = await eventEstimates(ev.id);
    const totals = list.map((x) => x.rev?.total_cents).filter((c): c is number => c != null).sort((a, b) => a - b);
    const inN = totals.length;
    const step = ev.work_order_id ? "Work Order Created" : ev.status === "AWARDED" ? "Award" : inN ? "Estimates In" : "Ask Providers";
    const reviewable = list.some((x) => x.rev && x.estimate?.status === "SENT");
    out.push({
      id: ev.id, number: ev.event_number, what: ev.job.title, asked: list.length, in: inN,
      range: totals.length ? (totals[0] === totals.at(-1) ? usd(totals[0]) : `${usd(totals[0])}–${usd(totals.at(-1)!)}`) : null,
      due: when(ev.deadline_at), dueSoon: ev.status === "OPEN" && ev.deadline_at.getTime() > now && ev.deadline_at.getTime() - now < DAY, step,
      needsAction: ev.status === "OPEN" && reviewable, completed: ev.status === "CLOSED" || !!ev.work_order_id, recurring: null,
    });
  }
  return out;
}

export async function estimateEventForBuyer(viewer: Viewer, eventId: string) {
  const me = await buyer(viewer);
  const ev = await prisma.sourcingEvent.findFirst({ where: { id: eventId, type: "ESTIMATES", created_by_person_id: me.id }, select: { id: true, event_number: true, status: true, deadline_at: true, deadline_hours: true, work_order_id: true, created_at: true, job: { select: { id: true, title: true, description: true, budget_min_cents: true, budget_max_cents: true, start_date: true } } } });
  if (!ev) return null;
  const list = await eventEstimates(ev.id);
  const who = await labels(list.map((x) => x.req.provider_person_id), viewer);
  const wo = ev.work_order_id ? await prisma.workOrder.findUnique({ where: { id: ev.work_order_id }, select: { id: true, order_number: true, created_at: true, workRequest: { select: { wr_number: true, approved_at: true } } } }) : null;
  const inN = list.filter((x) => x.rev).length;
  const awarded = list.find((x) => x.estimate?.status === "ACCEPTED");
  const path = [
    { key: "describe", label: "Describe", done: true, date: ev.created_at },
    { key: "ask", label: "Ask Providers", done: list.length > 0, date: ev.created_at, note: `${list.length} asked` },
    { key: "in", label: "Estimates In", done: inN > 0, date: null, note: `${inN} of ${list.length} in` },
    { key: "award", label: "Award", done: !!awarded, date: null },
    { key: "approval", label: "Approval", done: !!wo?.workRequest.approved_at, date: wo?.workRequest.approved_at ?? null, note: wo?.workRequest.approved_at ? "Auto-approved" : null },
    { key: "wo", label: "Work Order Created", done: !!wo, date: wo?.created_at ?? null, href: wo ? `/orders/${wo.id}` : undefined },
  ];
  return {
    id: ev.id, number: ev.event_number, status: ev.status, deadlineAt: ev.deadline_at.toISOString(), hours: ev.deadline_hours, job: ev.job, wo, path,
    estimates: list.map((x) => ({
      requestId: x.req.id, providerPersonId: x.req.provider_person_id, who: who(x.req.provider_person_id).label, userId: who(x.req.provider_person_id).userId,
      requestStatus: x.req.status, declineReason: x.req.decline_reason,
      estimate: x.estimate && x.rev ? { id: x.estimate.id, number: x.estimate.estimate_number, status: x.estimate.status, validUntil: x.estimate.valid_until.toISOString().slice(0, 10), totalCents: x.rev.total_cents, scope: x.rev.scope, assumptions: x.rev.assumptions, exclusions: x.rev.exclusions, lines: x.rev.lines.map((l) => ({ n: l.line_number, kind: l.kind, description: l.description, uom: l.uom, quantity: l.quantity == null ? null : Number(l.quantity), rateCents: l.rate_cents, amountCents: l.amount_cents })) } : null,
    })),
  };
}

/** ES-E006: counts for the Shop strip and the dashboard. */
export async function estimateCounts(personId: string, side: "buyer" | "seller") {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  if (side === "buyer") {
    const events = await prisma.sourcingEvent.findMany({ where: { created_by_person_id: personId, type: "ESTIMATES", status: "OPEN" }, select: { id: true, deadline_at: true } });
    const reqs = events.length ? await prisma.estimateRequest.findMany({ where: { sourcing_event_id: { in: events.map((e) => e.id) }, cost_estimate_id: { not: null } }, select: { cost_estimate_id: true } }) : [];
    const toReview = reqs.length ? await prisma.estimate.count({ where: { id: { in: reqs.map((r) => r.cost_estimate_id!) }, status: "SENT" } }) : 0;
    const dueSoon = events.filter((e) => e.deadline_at > now && e.deadline_at <= soon).length;
    return { total: toReview, toReview, dueSoon, toPrice: 0 };
  }
  const reqs = await prisma.estimateRequest.findMany({ where: { provider_person_id: personId, status: "OPEN", sourcing_event_id: { not: null } }, select: { sourcing_event_id: true } });
  const events = reqs.length ? await prisma.sourcingEvent.findMany({ where: { id: { in: reqs.map((r) => r.sourcing_event_id!) }, status: "OPEN", deadline_at: { gt: now } }, select: { id: true, deadline_at: true } }) : [];
  const open = new Set(events.map((e) => e.id));
  const toPrice = reqs.filter((r) => open.has(r.sourcing_event_id!)).length;
  const dueSoon = reqs.filter((r) => events.find((e) => e.id === r.sourcing_event_id && e.deadline_at <= soon)).length;
  return { total: toPrice, toReview: 0, dueSoon, toPrice };
}

/** ES-E005: Award one estimate → it is accepted, the Work Request (Origin Estimate) and its Work Order(s) are created;
 *  the others stay open until the Work Order is Released. */
export async function awardEstimate(viewer: Viewer, eventId: string, estimateId: string) {
  const me = await buyer(viewer);
  const ev = await prisma.sourcingEvent.findFirst({ where: { id: eventId, type: "ESTIMATES", created_by_person_id: me.id }, select: { id: true, status: true } });
  if (!ev) throw new WorkRequestError("Estimate Event not found", "NOT_FOUND");
  if (ev.status === "AWARDED" || ev.status === "CLOSED") throw new WorkRequestError("This Estimate Event is already awarded.", "INVALID");
  const inEvent = await prisma.estimateRequest.findFirst({ where: { sourcing_event_id: ev.id, cost_estimate_id: estimateId }, select: { id: true } });
  if (!inEvent) throw new WorkRequestError("That estimate isn't in this event.", "NOT_FOUND");
  const { decideEstimate } = await import("@/lib/estimates");
  const out = await decideEstimate(viewer, estimateId, "ACCEPT");
  await prisma.sourcingEvent.update({ where: { id: ev.id }, data: { status: "AWARDED", work_order_id: out.orderId ?? null } });
  return out;
}
