import type { PaymentEvent, PaymentTerms, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";
import { resolveCommissionBps } from "@/lib/application-commissions";
import { snapshotMilestones } from "@/lib/order-milestones";
import { assertCanSign, nudgeTaxBanking } from "@/lib/your-path";
import type { Viewer } from "@/lib/access";

// SH-E002/E003: the Shop cart — service products at the listed price; Place Order makes one work order per provider.
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

export async function cartCount(personId: string): Promise<number> {
  const r = await prisma.cartLine.aggregate({ where: { cart: { buyer_person_id: personId } }, _sum: { quantity: true } });
  return r._sum.quantity ?? 0;
}

/** Add a product at its listed price (Buy Now and Add to Cart). Turns the buyer side on, as Start Buying does. */
export async function addToCart(viewer: Viewer, productId: string, quantity = 1) {
  const p = await me(viewer);
  const product = await prisma.serviceProduct.findUnique({ where: { id: productId }, select: productSelect });
  if (!product || product.status !== "PUBLISHED") throw new CartError("That service product isn't available", "NOT_FOUND");
  if (product.providerProfile.person_id === p.id) throw new CartError("You can't buy your own service product");
  if (product.price_cents == null) throw new CartError("This service product has no listed price. Request an Estimate instead.");
  if (!p.requesterProfile) await prisma.requesterProfile.create({ data: { person_id: p.id } });
  const cart = await prisma.cart.upsert({ where: { buyer_person_id: p.id }, create: { buyer_person_id: p.id }, update: {}, select: { id: true } });
  const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(quantity)));
  await prisma.cartLine.upsert({
    where: { cart_id_service_product_id: { cart_id: cart.id, service_product_id: product.id } },
    create: { cart_id: cart.id, service_product_id: product.id, quantity: qty, unit_price_cents: product.price_cents, currency: product.currency },
    update: {},
  });
}

export async function setQuantity(viewer: Viewer, lineId: string, quantity: number) {
  const p = await me(viewer);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) throw new CartError(`Quantity is 1 to ${MAX_QTY}`);
  // MO-E003: an agreed-price (offer) line is for one.
  const n = await prisma.cartLine.updateMany({ where: { id: lineId, cart: { buyer_person_id: p.id }, offer_id: null }, data: { quantity: Math.floor(quantity) } });
  if (!n.count) throw new CartError("That line isn't in your cart", "NOT_FOUND");
}

export async function removeLine(viewer: Viewer, lineId: string) {
  const p = await me(viewer);
  await prisma.cartLine.deleteMany({ where: { id: lineId, cart: { buyer_person_id: p.id } } });
}

export type CartLineView = { id: string; productId: string | null; serviceId: string | null; title: string; quantity: number; unitCents: number; lineCents: number; currency: string; unit: string; schedule: string; available: boolean; agreed: boolean; deliveryDate: string | null };
export type CartGroup = { providerPersonId: string; providerProfileId: string; providerName: string; manual: boolean; lines: CartLineView[]; totalCents: number };

type Line = Awaited<ReturnType<typeof prisma.cartLine.findMany>>[number];
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

export async function cartFor(viewer: Viewer): Promise<{ groups: CartGroup[]; totalCents: number; currency: string; hasCompany: boolean }> {
  const p = await me(viewer);
  const lines = await prisma.cartLine.findMany({ where: { cart: { buyer_person_id: p.id } }, orderBy: { created_at: "asc" } });
  const items = await resolveItems(lines);
  const groups = new Map<string, CartGroup>();
  for (const l of lines) {
    const it = items.get(l.id);
    if (!it) continue;
    const g = groups.get(it.providerPersonId) ?? { providerPersonId: it.providerPersonId, providerProfileId: it.providerProfileId, providerName: it.providerName, manual: false, lines: [], totalCents: 0 };
    const lineCents = l.unit_price_cents * l.quantity;
    g.lines.push({ id: l.id, productId: it.productId, serviceId: it.serviceId, title: it.title, quantity: l.quantity, unitCents: l.unit_price_cents, lineCents, currency: l.currency, unit: it.unit, schedule: it.schedule, available: it.available, agreed: !!l.offer_id, deliveryDate: l.delivery_date ? l.delivery_date.toISOString().slice(0, 10) : null });
    g.totalCents += lineCents;
    groups.set(it.providerPersonId, g);
  }
  const all = [...groups.values()];
  return { groups: all, totalCents: all.reduce((n, g) => n + g.totalCents, 0), currency: lines[0]?.currency ?? "USD", hasCompany: !!p.company?.p_account_id };
}

/** Place Order: one work order per provider at the cart's prices (and agreed dates). Lane 7: orders at the list price and
 *  date — and accepted offers — open at once; the old "I accept orders manually" is replaced by Open to Offers. */
export async function placeOrder(viewer: Viewer): Promise<{ orderId: string; providerName: string; open: boolean }[]> {
  const p = await me(viewer);
  if (!p.company?.p_account_id) throw new CartError("Add your company before placing an order", "NO_COMPANY");
  const pAccountId = p.company.p_account_id;
  const lines = await prisma.cartLine.findMany({ where: { cart: { buyer_person_id: p.id } }, orderBy: { created_at: "asc" } });
  if (!lines.length) throw new CartError("Your cart is empty");
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
        line_number: i + 1, transaction_type: it.type, fee_bps: fee, description: it.title, service_product_id: it.productId, provider_service_id: it.serviceId, payment_terms: it.paymentTerms ?? "NET30",
        ...(l.delivery_date ? { service_end: l.delivery_date } : {}),
        ...(it.byQty
          ? { uom: it.uom, quantity: l.quantity, unit_price_cents: l.unit_price_cents, payment_event: "TIMESHEET" as const }
          : { amount_cents: l.unit_price_cents * l.quantity, payment_event: it.paymentEvent ?? ("ACCEPTANCE" as const) }),
      };
    }));
    const fees = [...new Set(rows.map((r) => r.fee_bps))];
    const total = group.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
    const now = new Date();
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.workOrder.create({
        data: {
          order_number: `WO-${Date.now().toString(36).toUpperCase()}-${providerPersonId.slice(0, 4)}`,
          origin: "DIRECT", buyer_person_id: p.id, p_account_id: pAccountId, provider_person_id: providerPersonId, currency: group[0].currency,
          status: "RELEASED", buyer_accepted_at: now, provider_accepted_at: now,
          fee_bps: fees.length === 1 ? fees[0] : null, not_to_exceed_cents: total,
          lines: { create: rows },
        },
        select: { id: true },
      });
      await tx.onboardingRequest.create({ data: { onboarding_request_number: `ONB-${Date.now().toString(36).toUpperCase()}-${o.id.slice(0, 4)}`, work_order_id: o.id, provider_person_id: providerPersonId, buyer_person_id: p.id, raised_at: now } });
      await tx.cartLine.deleteMany({ where: { id: { in: group.map((l) => l.id) } } });
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
  return placed;
}
