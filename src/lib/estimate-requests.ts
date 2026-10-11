import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { uploadEstimateRequestFile } from "@/lib/storage";
import { formatCents } from "@/lib/display";
import type { Viewer } from "@/lib/access";

// EST-E001..E003: a buyer asks a provider for a cost estimate; the provider builds one (or declines). Private to the two.
export class EstimateRequestError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
  }
}

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const nameOf = (p: { first_name: string | null; last_name: string | null } | null) => [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "A member";
const firstLine = (s: string) => s.split(/\n/)[0].slice(0, 80);

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  if (!p) throw new EstimateRequestError("No person for this account", "NOT_FOUND");
  return p;
}

export type RequestInput = { providerPersonId: string; serviceId?: string | null; serviceProductId?: string | null; description: string; startBy?: string | null; budgetMinCents?: number | null; budgetMaxCents?: number | null };

export async function createRequest(viewer: Viewer, input: RequestInput, files: File[] = []) {
  const p = await me(viewer);
  if (input.providerPersonId === p.id) throw new EstimateRequestError("You can't ask yourself for an estimate", "INVALID");
  const description = input.description.trim().slice(0, 4000);
  if (description.length < 5) throw new EstimateRequestError("Say what you need", "INVALID");
  const provider = await prisma.person.findUnique({ where: { id: input.providerPersonId }, select: { id: true, providerProfile: { select: { id: true } } } });
  if (!provider?.providerProfile) throw new EstimateRequestError("That provider isn't available", "NOT_FOUND");
  // The service/product must be this provider's own.
  const svc = input.serviceId ? await prisma.providerService.findFirst({ where: { id: input.serviceId, provider_profile_id: provider.providerProfile.id }, select: { id: true } }) : null;
  const prod = input.serviceProductId ? await prisma.serviceProduct.findFirst({ where: { id: input.serviceProductId, provider_profile_id: provider.providerProfile.id }, select: { id: true } }) : null;
  const min = input.budgetMinCents && input.budgetMinCents > 0 ? Math.round(input.budgetMinCents) : null;
  const max = input.budgetMaxCents && input.budgetMaxCents > 0 ? Math.round(input.budgetMaxCents) : null;
  if (min && max && max < min) throw new EstimateRequestError("The budget's top end is below its bottom", "INVALID");
  const usable = files.filter((f) => f.size > 0).slice(0, MAX_FILES);
  if (usable.some((f) => f.size > MAX_BYTES)) throw new EstimateRequestError("Each file can be up to 10 MB", "INVALID");
  const r = await prisma.costEstimateRequest.create({
    data: { requester_person_id: p.id, provider_person_id: provider.id, service_id: svc?.id ?? null, service_product_id: prod?.id ?? null, description, start_by: input.startBy ? new Date(input.startBy) : null, budget_min_cents: min, budget_max_cents: max },
    select: { id: true },
  });
  if (usable.length) {
    const stored = [];
    for (const f of usable) stored.push({ path: await uploadEstimateRequestFile(r.id, { name: f.name, type: f.type, bytes: await f.arrayBuffer() }), name: f.name, size: f.size, type: f.type });
    await prisma.costEstimateRequest.update({ where: { id: r.id }, data: { attachments: stored } });
  }
  await notify({ event: "estimate.requested", personId: provider.id, entityType: "cost_estimate_request", entityId: r.id, dedupeKey: `estimate.requested:${r.id}`, vars: { requestId: r.id, buyerName: nameOf(p), firstLine: firstLine(description) } });
  return r.id;
}

/** Only the requester and the provider can open a request. */
export async function requestFor(viewer: Viewer, id: string) {
  const p = await me(viewer);
  const r = await prisma.costEstimateRequest.findUnique({ where: { id } });
  if (!r || (r.requester_person_id !== p.id && r.provider_person_id !== p.id)) throw new EstimateRequestError("Request not found", "NOT_FOUND");
  const [people, svc, prod] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: [r.requester_person_id, r.provider_person_id] } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } }),
    r.service_id ? prisma.providerService.findUnique({ where: { id: r.service_id }, select: { id: true, name: true, rate_cents: true, uom: true } }) : null,
    r.service_product_id ? prisma.serviceProduct.findUnique({ where: { id: r.service_product_id }, select: { id: true, title: true, price_cents: true } }) : null,
  ]);
  const who = (id: string) => people.find((x) => x.id === id) ?? null;
  return {
    r,
    party: r.provider_person_id === p.id ? ("PROVIDER" as const) : ("BUYER" as const),
    buyerName: nameOf(who(r.requester_person_id)),
    buyerCompany: who(r.requester_person_id)?.company?.name ?? null,
    providerName: nameOf(who(r.provider_person_id)),
    service: svc,
    product: prod,
    attachments: (Array.isArray(r.attachments) ? r.attachments : []) as { path: string; name: string; size: number; type: string }[],
    budget: r.budget_min_cents || r.budget_max_cents ? [r.budget_min_cents ? formatCents(r.budget_min_cents, "USD") : null, r.budget_max_cents ? formatCents(r.budget_max_cents, "USD") : null].filter(Boolean).join(" – ") : null,
  };
}

export async function declineRequest(viewer: Viewer, id: string, reason: string) {
  const { r, party, providerName } = await requestFor(viewer, id);
  if (party !== "PROVIDER") throw new EstimateRequestError("Only the provider can decline", "FORBIDDEN");
  const note = reason.trim();
  if (note.length < 3) throw new EstimateRequestError("Give the buyer a reason", "INVALID");
  const done = await prisma.costEstimateRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "DECLINED", decline_reason: note.slice(0, 2000) } });
  if (!done.count) throw new EstimateRequestError("This request isn't open", "INVALID");
  await prisma.notification.updateMany({ where: { dedupe_key: `estimate.requested:${id}`, resolved_at: null }, data: { resolved_at: new Date() } });
  await notify({ event: "estimate.request_declined", personId: r.requester_person_id, entityType: "cost_estimate_request", entityId: id, dedupeKey: `estimate.request_declined:${id}`, vars: { requestId: id, providerName, reason: note } });
}

export async function withdrawRequest(viewer: Viewer, id: string) {
  const { party } = await requestFor(viewer, id);
  if (party !== "BUYER") throw new EstimateRequestError("Only the requester can withdraw", "FORBIDDEN");
  const done = await prisma.costEstimateRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "WITHDRAWN" } });
  if (!done.count) throw new EstimateRequestError("This request isn't open", "INVALID");
  // Nothing left for the provider to do.
  await prisma.notification.updateMany({ where: { dedupe_key: `estimate.requested:${id}`, resolved_at: null }, data: { resolved_at: new Date() } });
}

/** EST-E002: the estimate built from a request is linked when saved, and answers it when sent. */
export async function linkRequest(requestId: string, estimateId: string, providerPersonId: string) {
  await prisma.costEstimateRequest.updateMany({ where: { id: requestId, provider_person_id: providerPersonId, status: "OPEN" }, data: { cost_estimate_id: estimateId } });
}
export async function answerRequestsFor(estimateId: string) {
  const rows = await prisma.costEstimateRequest.findMany({ where: { cost_estimate_id: estimateId, status: "OPEN" }, select: { id: true } });
  if (!rows.length) return;
  await prisma.costEstimateRequest.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { status: "ANSWERED" } });
  await prisma.notification.updateMany({ where: { dedupe_key: { in: rows.map((r) => `estimate.requested:${r.id}`) }, resolved_at: null }, data: { resolved_at: new Date() } });
}

export type EstimateListRow = { kind: "estimate" | "request"; id: string; href: string; number: string; other: string; title: string; totalCents: number | null; status: string; updated: Date };

/** EST-E003: both sides of My › Cost Estimates. */
export async function estimatesPage(viewer: Viewer) {
  const p = await me(viewer);
  const [asCustomer, asProvider, myRequests, waiting] = await Promise.all([
    prisma.costEstimate.findMany({ where: { customer_person_id: p.id, status: { not: "DRAFT" } }, orderBy: { updated_at: "desc" }, take: 100, include: { revisions: { orderBy: { revision_number: "desc" }, take: 1, select: { total_cents: true } } } }),
    prisma.costEstimate.findMany({ where: { provider_person_id: p.id }, orderBy: { updated_at: "desc" }, take: 100, include: { revisions: { orderBy: { revision_number: "desc" }, take: 1, select: { total_cents: true } } } }),
    prisma.costEstimateRequest.findMany({ where: { requester_person_id: p.id }, orderBy: { updated_at: "desc" }, take: 100 }),
    prisma.costEstimateRequest.findMany({ where: { provider_person_id: p.id, status: "OPEN" }, orderBy: { created_at: "asc" }, take: 100 }),
  ]);
  const ids = [...new Set([...asCustomer.map((e) => e.provider_person_id), ...asProvider.map((e) => e.customer_person_id), ...myRequests.map((r) => r.provider_person_id), ...waiting.map((r) => r.requester_person_id)].filter((x): x is string => !!x))];
  const names = new Map((await prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } })).map((x) => [x.id, nameOf(x)]));
  const est = (e: (typeof asCustomer)[number], other: string | null): EstimateListRow => ({ kind: "estimate", id: e.id, href: `/estimates/${e.id}`, number: e.estimate_number, other: other ?? "—", title: e.title, totalCents: e.revisions[0]?.total_cents ?? null, status: e.status, updated: e.updated_at });
  const req = (r: (typeof myRequests)[number], other: string): EstimateListRow => ({ kind: "request", id: r.id, href: `/estimates/requests/${r.id}`, number: "Request", other, title: firstLine(r.description), totalCents: null, status: `REQUEST_${r.status}`, updated: r.updated_at });
  return {
    received: [...asCustomer.map((e) => est(e, names.get(e.provider_person_id) ?? null)), ...myRequests.filter((r) => r.status !== "ANSWERED").map((r) => req(r, names.get(r.provider_person_id) ?? "—"))].sort((a, b) => b.updated.getTime() - a.updated.getTime()),
    waiting: waiting.map((r) => req(r, names.get(r.requester_person_id) ?? "—")),
    sent: asProvider.map((e) => est(e, (e.customer_person_id && names.get(e.customer_person_id)) || e.customer_email)),
  };
}
