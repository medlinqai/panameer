import type { PaymentEvent, PaymentTerms, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";
import { resolveCommissionBps } from "@/lib/application-commissions";
import { snapshotMilestones } from "@/lib/order-milestones";
import { assertCanSign, nudgeTaxBanking } from "@/lib/your-path";
import type { Viewer } from "@/lib/access";
import { descriptionRequired, wrNumber } from "@/lib/requisition";

// JW-E004: the cart is the buyer's INCOMPLETE Work Request (source SHOP); Submit makes one Work Order per seller.
export class CartError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INVALID" | "NO_COMPANY" = "INVALID") {
    super(message);
  }
}

const MAX_QTY = 99;
const WHEN: Partial<Record<PaymentEvent, string>> = { ORDER_ACCEPTED: "at order", ACCEPTANCE: "on delivery", DOWNLOAD: "on download", INSTALLATION: "on install", PAYMENT_REQUEST: "on payment request" };

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true, requesterProfile: { select: { id: true } }, company: { select: { p_account_id: true } } } });
  if (!p) throw new CartError("No person for this account", "NOT_FOUND");
  return p;
}

const productSelect = {
  id: true, title: true, status: true, price_cents: true, currency: true, pricing_type: true, kind: true, billing_period: true, payment_terms: true, payment_event: true,
  milestones: { orderBy: { sequence: "asc" as const }, select: { label: true, percent: true, payment_event: true } },
  providerProfile: { select: { id: true, person_id: true, accepts_orders_manually: true, person: { select: { first_name: true, last_name: true } } } },
};

const settlesByQty = (pricing: string) => pricing === "HOURLY" || pricing === "TM";

/** "50% Kickoff at order · 50% Delivery on delivery" — the product's payment schedule in one line. */
export function scheduleLine(p: { pricing_type: string; billing_period: string | null; payment_event: PaymentEvent | null; milestones: { label: string; percent: number; payment_event: PaymentEvent | null }[] }): string {
  if (settlesByQty(p.pricing_type)) return "Billed by timesheet";
  if (p.pricing_type === "RECURRING") return `Billed ${(p.billing_period ?? "monthly").toLowerCase()}`;
  const fallback = p.payment_event ?? "ACCEPTANCE";
  if (!p.milestones.length) return `In full ${WHEN[fallback] ?? "on delivery"}`;
  return p.milestones.map((m) => `${m.percent}% ${m.label} ${WHEN[m.payment_event ?? fallback] ?? ""}`.trim()).join(" · ");
}

/** Lines of the buyer's open Shop work request. */
export const shopLines = (personId: string) => ({ workRequest: { buyer_person_id: personId, source: "SHOP" as const, status: "INCOMPLETE" as const } });

/** The buyer's INCOMPLETE Shop work request — created on first add (needs a company: a work request is the company's). */
export async function shopRequest(personId: string): Promise<{ id: string }> {
  const open = await prisma.workRequest.findFirst({ where: shopLines(personId).workRequest, orderBy: { created_at: "desc" }, select: { id: true } });
  if (open) return open;
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { company: { select: { p_account_id: true } } } });
  if (!p?.company?.p_account_id) throw new CartError("Add your company before you add to a work request", "NO_COMPANY");
  const id = crypto.randomUUID();
  return prisma.workRequest.create({ data: { id, wr_number: wrNumber(id), buyer_person_id: personId, p_account_id: p.company.p_account_id, source: "SHOP", status: "INCOMPLETE", proposal_access: "INVITE_ONLY", sole_sourced: true }, select: { id: true } });
}

/** Put (or replace) one item on the Shop work request. Shop lines keep quantity × unit price; by-amount lines also carry the amount. */
export async function putShopLine(personId: string, item: { productId?: string; serviceId?: string; title: string; providerPersonId: string; type: TransactionType; uom: string | null; quantity: number; unitCents: number; currency: string; offerId?: string | null; deliveryDate?: Date | null }, replace: boolean) {
  const wr = await shopRequest(personId);
  const where = { work_request_id: wr.id, ...(item.productId ? { service_product_id: item.productId } : { provider_service_id: item.serviceId }), work_order_id: null };
  const byAmt = item.type === "SERVICE_BY_AMT";
  const data = {
    transaction_type: item.type, description: item.title, currency: item.currency, provider_person_id: item.providerPersonId, uom: byAmt ? null : item.uom,
    quantity: item.quantity, unit_price_cents: item.unitCents, amount_cents: byAmt ? item.unitCents * item.quantity : null,
    offer_id: item.offerId ?? null, service_end: item.deliveryDate ?? null,
  };
  const line = await prisma.workRequestLine.findFirst({ where, select: { id: true } });
  if (line) { if (replace) await prisma.workRequestLine.update({ where: { id: line.id }, data }); return; }
  const last = await prisma.workRequestLine.findFirst({ where: { work_request_id: wr.id }, orderBy: { line_number: "desc" }, select: { line_number: true } });
  await prisma.workRequestLine.create({ data: { ...data, work_request_id: wr.id, line_number: (last?.line_number ?? 0) + 1, service_product_id: item.productId ?? null, provider_service_id: item.serviceId ?? null } });
}

export async function cartCount(personId: string): Promise<number> {
  const r = await prisma.workRequestLine.aggregate({ where: shopLines(personId), _sum: { quantity: true } });
  return Number(r._sum.quantity ?? 0);
}

/** Add a product at its listed price (Buy Now and Add to Cart). Turns the buyer side on, as Start Buying does. */
export async function addToCart(viewer: Viewer, productId: string, quantity = 1) {
  const p = await me(viewer);
  const product = await prisma.serviceProduct.findUnique({ where: { id: productId }, select: productSelect });
  if (!product || product.status !== "PUBLISHED") throw new CartError("That service product isn't available", "NOT_FOUND");
  if (product.providerProfile.person_id === p.id) throw new CartError("You can't buy your own service product");
  if (product.price_cents == null) throw new CartError("This service product has no listed price. Request an Estimate instead.");
  if (!p.requesterProfile) await prisma.requesterProfile.create({ data: { person_id: p.id } });
  const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(quantity)));
  const byQty = settlesByQty(product.pricing_type);
  await putShopLine(p.id, { productId: product.id, title: product.title, providerPersonId: product.providerProfile.person_id, type: byQty ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT", uom: byQty ? "HOUR" : null, quantity: qty, unitCents: product.price_cents, currency: product.currency }, false);
}

export async function setQuantity(viewer: Viewer, lineId: string, quantity: number) {
  const p = await me(viewer);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) throw new CartError(`Quantity is 1 to ${MAX_QTY}`);
  // MO-E003: an agreed-price (offer) line is for one.
  const line = await prisma.workRequestLine.findFirst({ where: { id: lineId, ...shopLines(p.id), offer_id: null }, select: { id: true, transaction_type: true, unit_price_cents: true } });
  if (!line) throw new CartError("That line isn't on your work request", "NOT_FOUND");
  const q = Math.floor(quantity);
  await prisma.workRequestLine.update({ where: { id: line.id }, data: { quantity: q, ...(line.transaction_type === "SERVICE_BY_AMT" ? { amount_cents: (line.unit_price_cents ?? 0) * q } : {}) } });
}

export async function removeLine(viewer: Viewer, lineId: string) {
  const p = await me(viewer);
  await prisma.workRequestLine.deleteMany({ where: { id: lineId, ...shopLines(p.id) } });
}

export type CartLineView = { id: string; productId: string | null; serviceId: string | null; title: string; quantity: number; unitCents: number; lineCents: number; currency: string; unit: string; schedule: string; available: boolean; agreed: boolean; deliveryDate: string | null };
export type CartGroup = { providerPersonId: string; providerProfileId: string; providerName: string; manual: boolean; lines: CartLineView[]; totalCents: number };

type Line = { id: string; service_product_id: string | null; provider_service_id: string | null };
type ShopLine = Awaited<ReturnType<typeof loadLines>>[number];
const loadLines = (personId: string) => prisma.workRequestLine.findMany({ where: shopLines(personId), orderBy: { line_number: "asc" }, select: { id: true, work_request_id: true, service_product_id: true, provider_service_id: true, quantity: true, unit_price_cents: true, currency: true, offer_id: true, service_end: true } });
const qtyOf = (l: ShopLine) => Number(l.quantity ?? 1);
type Item = {
  title: string; providerPersonId: string; providerProfileId: string; providerName: string; byQty: boolean; unit: string; schedule: string; available: boolean;
  productId: string | null; serviceId: string | null; paymentTerms: PaymentTerms | null; paymentEvent: PaymentEvent | null; uom: string; type: TransactionType;
};

/** Lane 7: a cart line is a Service Product, or a Service (rate) from an accepted offer — one shape for both. */
async function resolveItems(lines: Line[]): Promise<Map<string, Item>> {
  const productIds = lines.map((l) => l.service_product_id).filter((x): x is string => !!x);
  const serviceIds = lines.map((l) => l.provider_service_id).filter((x): x is string => !!x);
  const [products, services] = await Promise.all([
    prisma.serviceProduct.findMany({ where: { id: { in: productIds } }, select: productSelect }),
    prisma.providerService.findMany({ where: { id: { in: serviceIds } }, select: { id: true, name: true, uom: true, service_type: true, payment_terms: true, payment_event: true, published_at: true, active: true, provider_profile_id: true } }),
  ]);
  const profiles = new Map((await prisma.providerProfile.findMany({ where: { id: { in: services.map((x) => x.provider_profile_id) } }, select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true } } } })).map((x) => [x.id, x]));
  const out = new Map<string, Item>();
  for (const l of lines) {
    const prod = l.service_product_id ? products.find((x) => x.id === l.service_product_id) : null;
    if (prod) {
      const byQty = settlesByQty(prod.pricing_type);
      out.set(l.id, { title: prod.title, providerPersonId: prod.providerProfile.person_id, providerProfileId: prod.providerProfile.id, providerName: `${prod.providerProfile.person.first_name} ${prod.providerProfile.person.last_name}`.trim(), byQty, unit: byQty ? "hour" : prod.pricing_type === "RECURRING" ? (prod.billing_period ?? "month").toLowerCase() : "each", schedule: scheduleLine(prod), available: prod.status === "PUBLISHED", productId: prod.id, serviceId: null, paymentTerms: prod.payment_terms, paymentEvent: prod.payment_event ?? "ACCEPTANCE", uom: "HOUR", type: byQty ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT" });
      continue;
    }
    const svc = l.provider_service_id ? services.find((x) => x.id === l.provider_service_id) : null;
    const pp = svc ? profiles.get(svc.provider_profile_id) : null;
    if (!svc || !pp) continue;
    const byQty = svc.service_type !== "SERVICE_BY_AMT";
    out.set(l.id, { title: svc.name, providerPersonId: pp.person_id, providerProfileId: pp.id, providerName: `${pp.person.first_name} ${pp.person.last_name}`.trim(), byQty, unit: (svc.uom ?? "HOUR").toLowerCase(), schedule: "Billed by timesheet", available: svc.active && !!svc.published_at, productId: null, serviceId: svc.id, paymentTerms: svc.payment_terms, paymentEvent: svc.payment_event ?? "TIMESHEET", uom: svc.uom ?? "HOUR", type: byQty ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT" });
  }
  return out;
}

export async function cartFor(viewer: Viewer): Promise<{ groups: CartGroup[]; totalCents: number; currency: string; hasCompany: boolean; workRequest: { id: string; wrNumber: string | null; description: string; descriptionRequired: boolean } | null }> {
  const p = await me(viewer);
  const lines = await loadLines(p.id);
  const items = await resolveItems(lines);
  const groups = new Map<string, CartGroup>();
  for (const l of lines) {
    const it = items.get(l.id);
    if (!it) continue;
    const g = groups.get(it.providerPersonId) ?? { providerPersonId: it.providerPersonId, providerProfileId: it.providerProfileId, providerName: it.providerName, manual: false, lines: [], totalCents: 0 };
    const lineCents = (l.unit_price_cents ?? 0) * qtyOf(l);
    g.lines.push({ id: l.id, productId: it.productId, serviceId: it.serviceId, title: it.title, quantity: qtyOf(l), unitCents: l.unit_price_cents ?? 0, lineCents, currency: l.currency, unit: it.unit, schedule: it.schedule, available: it.available, agreed: !!l.offer_id, deliveryDate: l.service_end ? l.service_end.toISOString().slice(0, 10) : null });
    g.totalCents += lineCents;
    groups.set(it.providerPersonId, g);
  }
  const all = [...groups.values()];
  const wr = lines[0] ? await prisma.workRequest.findUnique({ where: { id: lines[0].work_request_id }, select: { id: true, wr_number: true, description: true, p_account_id: true } }) : null;
  // JW-E007: pre-filled from the first item when empty.
  const workRequest = wr ? { id: wr.id, wrNumber: wr.wr_number, description: wr.description ?? (all[0]?.lines[0]?.title ?? ""), descriptionRequired: await descriptionRequired(wr.p_account_id) } : null;
  return { groups: all, totalCents: all.reduce((n, g) => n + g.totalCents, 0), currency: lines[0]?.currency ?? "USD", hasCompany: !!p.company?.p_account_id, workRequest };
}

/** JW-E007: the description on the Shop work request. */
export async function setDescription(viewer: Viewer, description: string) {
  const p = await me(viewer);
  const wr = await prisma.workRequest.findFirst({ where: shopLines(p.id).workRequest, select: { id: true } });
  if (!wr) throw new CartError("Your work request is empty", "NOT_FOUND");
  await prisma.workRequest.update({ where: { id: wr.id }, data: { description: description.trim().slice(0, 500) || null } });
}

/** Place Order: one work order per provider at the cart's prices (and agreed dates). Lane 7: orders at the list price and
 *  date — and accepted offers — open at once; the old "I accept orders manually" is replaced by Open to Offers. */
export async function placeOrder(viewer: Viewer, input: { description?: string | null } = {}): Promise<{ orderId: string; providerName: string; open: boolean }[]> {
  const p = await me(viewer);
  if (!p.company?.p_account_id) throw new CartError("Add your company before placing an order", "NO_COMPANY");
  const pAccountId = p.company.p_account_id;
  const lines = await loadLines(p.id);
  if (!lines.length) throw new CartError("Your work request is empty");
  const wrId = lines[0].work_request_id;
  const head = await prisma.workRequest.findUniqueOrThrow({ where: { id: wrId }, select: { description: true } });
  const description = input.description !== undefined ? input.description?.trim() || null : head.description;
  if (!description && (await descriptionRequired(pAccountId))) throw new CartError("Add a description before you submit");
  // JW-E005: Submit → APPROVED (automatic in R1); ORDERED once its work orders exist.
  const now0 = new Date();
  await prisma.workRequest.update({ where: { id: wrId }, data: { description, status: "APPROVED", submitted_at: now0, approved_at: now0 } });
  const items = await resolveItems(lines);
  if (lines.some((l) => !items.get(l.id)?.available)) throw new CartError("Something in your cart is no longer available. Remove it to continue.");
  const byProvider = new Map<string, typeof lines>();
  for (const l of lines) {
    const k = items.get(l.id)!.providerPersonId;
    byProvider.set(k, [...(byProvider.get(k) ?? []), l]);
  }
  // Placing signs the order for the buyer, so both companies are checked first, as for any work order.
  for (const providerPersonId of byProvider.keys()) await assertCanSign(p.id, p.id, providerPersonId);
  const buyerName = `${p.first_name} ${p.last_name}`.trim();
  const placed: { orderId: string; providerName: string; open: boolean }[] = [];
  for (const [providerPersonId, group] of byProvider) {
    const first = items.get(group[0].id)!;
    const providerName = first.providerName;
    const rows = await Promise.all(group.map(async (l, i) => {
      const it = items.get(l.id)!;
      const fee = (await resolveCommissionBps("SOLE_SOURCED", it.type)).bps;
      return {
        line_number: i + 1, work_request_line_id: l.id, transaction_type: it.type, fee_bps: fee, description: it.title, service_product_id: it.productId, provider_service_id: it.serviceId, payment_terms: it.paymentTerms ?? "NET30",
        ...(l.service_end ? { service_end: l.service_end } : {}),
        ...(it.byQty
          ? { uom: it.uom, quantity: qtyOf(l), unit_price_cents: l.unit_price_cents, payment_event: "TIMESHEET" as const }
          : { amount_cents: (l.unit_price_cents ?? 0) * qtyOf(l), payment_event: it.paymentEvent ?? ("ACCEPTANCE" as const) }),
      };
    }));
    const fees = [...new Set(rows.map((r) => r.fee_bps))];
    const total = group.reduce((n, l) => n + (l.unit_price_cents ?? 0) * qtyOf(l), 0);
    const now = new Date();
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.workOrder.create({
        data: {
          order_number: `WO-${Date.now().toString(36).toUpperCase()}-${providerPersonId.slice(0, 4)}`,
          origin: "DIRECT", work_request_id: wrId, description, buyer_person_id: p.id, p_account_id: pAccountId, provider_person_id: providerPersonId, currency: group[0].currency,
          status: "RELEASED", buyer_accepted_at: now, provider_accepted_at: now,
          fee_bps: fees.length === 1 ? fees[0] : null, not_to_exceed_cents: total,
          lines: { create: rows },
        },
        select: { id: true },
      });
      await tx.onboardingRequest.create({ data: { onboarding_request_number: `ONB-${Date.now().toString(36).toUpperCase()}-${o.id.slice(0, 4)}`, work_order_id: o.id, provider_person_id: providerPersonId, buyer_person_id: p.id, raised_at: now } });
      await tx.workRequestLine.updateMany({ where: { id: { in: group.map((l) => l.id) } }, data: { status: "ORDERED", work_order_id: o.id } });
      return o;
    });
    await snapshotMilestones(order.id);
    const product = group.length === 1 ? first.title : `${first.title} + ${group.length - 1} more`;
    const amount = formatCents(total, group[0].currency);
    await notify({ event: "shop.order_received", personId: providerPersonId, entityType: "work_order", entityId: order.id, dedupeKey: `shop.order_received:${order.id}`, vars: { orderId: order.id, product, buyerName, amount, manual: 0 } });
    await notify({ event: "shop.order_placed", personId: p.id, entityType: "work_order", entityId: order.id, dedupeKey: `shop.order_placed:${order.id}`, vars: { orderId: order.id, providerName, product, amount, manual: 0 } });
    await nudgeTaxBanking(providerPersonId);
    placed.push({ orderId: order.id, providerName, open: true });
  }
  await prisma.workRequest.update({ where: { id: wrId }, data: { status: "ORDERED" } });
  return placed;
}
