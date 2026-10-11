import type { PaymentTrigger, TransactionType } from "@prisma/client";
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
const WHEN: Partial<Record<PaymentTrigger, string>> = { ORDER_ACCEPTED: "at order", ACCEPTANCE: "on delivery", DOWNLOAD: "on download", INSTALLATION: "on install", PAYMENT_REQUEST: "on payment request" };

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true, requesterProfile: { select: { id: true } }, company: { select: { p_account_id: true } } } });
  if (!p) throw new CartError("No person for this account", "NOT_FOUND");
  return p;
}

const productSelect = {
  id: true, title: true, status: true, price_cents: true, currency: true, pricing_type: true, kind: true, billing_period: true, payment_terms: true, payment_trigger: true,
  milestones: { orderBy: { sequence: "asc" as const }, select: { label: true, percent: true, trigger: true } },
  providerProfile: { select: { id: true, person_id: true, accepts_orders_manually: true, person: { select: { first_name: true, last_name: true } } } },
};

const settlesByQty = (pricing: string) => pricing === "HOURLY" || pricing === "TM";

/** "50% Kickoff at order · 50% Delivery on delivery" — the product's payment schedule in one line. */
export function scheduleLine(p: { pricing_type: string; billing_period: string | null; payment_trigger: PaymentTrigger | null; milestones: { label: string; percent: number; trigger: PaymentTrigger | null }[] }): string {
  if (settlesByQty(p.pricing_type)) return "Billed by timesheet";
  if (p.pricing_type === "RECURRING") return `Billed ${(p.billing_period ?? "monthly").toLowerCase()}`;
  const fallback = p.payment_trigger ?? "ACCEPTANCE";
  if (!p.milestones.length) return `In full ${WHEN[fallback] ?? "on delivery"}`;
  return p.milestones.map((m) => `${m.percent}% ${m.label} ${WHEN[m.trigger ?? fallback] ?? ""}`.trim()).join(" · ");
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
  const n = await prisma.cartLine.updateMany({ where: { id: lineId, cart: { buyer_person_id: p.id } }, data: { quantity: Math.floor(quantity) } });
  if (!n.count) throw new CartError("That line isn't in your cart", "NOT_FOUND");
}

export async function removeLine(viewer: Viewer, lineId: string) {
  const p = await me(viewer);
  await prisma.cartLine.deleteMany({ where: { id: lineId, cart: { buyer_person_id: p.id } } });
}

export type CartLineView = { id: string; productId: string; title: string; quantity: number; unitCents: number; lineCents: number; currency: string; unit: string; schedule: string; available: boolean };
export type CartGroup = { providerPersonId: string; providerProfileId: string; providerName: string; manual: boolean; lines: CartLineView[]; totalCents: number };

export async function cartFor(viewer: Viewer): Promise<{ groups: CartGroup[]; totalCents: number; currency: string; hasCompany: boolean }> {
  const p = await me(viewer);
  const lines = await prisma.cartLine.findMany({ where: { cart: { buyer_person_id: p.id } }, orderBy: { created_at: "asc" } });
  const products = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: lines.map((l) => l.service_product_id) } }, select: productSelect })).map((x) => [x.id, x]));
  const groups = new Map<string, CartGroup>();
  for (const l of lines) {
    const prod = products.get(l.service_product_id);
    if (!prod) continue;
    const pp = prod.providerProfile;
    const g = groups.get(pp.person_id) ?? { providerPersonId: pp.person_id, providerProfileId: pp.id, providerName: `${pp.person.first_name} ${pp.person.last_name}`.trim(), manual: pp.accepts_orders_manually, lines: [], totalCents: 0 };
    const lineCents = l.unit_price_cents * l.quantity;
    g.lines.push({ id: l.id, productId: prod.id, title: prod.title, quantity: l.quantity, unitCents: l.unit_price_cents, lineCents, currency: l.currency, unit: settlesByQty(prod.pricing_type) ? "hour" : prod.pricing_type === "RECURRING" ? (prod.billing_period ?? "month").toLowerCase() : "each", schedule: scheduleLine(prod), available: prod.status === "PUBLISHED" });
    g.totalCents += lineCents;
    groups.set(pp.person_id, g);
  }
  const all = [...groups.values()];
  return { groups: all, totalCents: all.reduce((n, g) => n + g.totalCents, 0), currency: lines[0]?.currency ?? "USD", hasCompany: !!p.company?.p_account_id };
}

/** Place Order: one work order per provider at the cart's prices. Auto-accepted (Open) unless the provider accepts orders manually. */
export async function placeOrder(viewer: Viewer): Promise<{ orderId: string; providerName: string; open: boolean }[]> {
  const p = await me(viewer);
  if (!p.company?.p_account_id) throw new CartError("Add your company before placing an order", "NO_COMPANY");
  const pAccountId = p.company.p_account_id;
  const lines = await prisma.cartLine.findMany({ where: { cart: { buyer_person_id: p.id } }, orderBy: { created_at: "asc" } });
  if (!lines.length) throw new CartError("Your cart is empty");
  const products = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: lines.map((l) => l.service_product_id) } }, select: productSelect })).map((x) => [x.id, x]));
  const gone = lines.find((l) => products.get(l.service_product_id)?.status !== "PUBLISHED");
  if (gone) throw new CartError("A service product in your cart is no longer available. Remove it to continue.");
  const byProvider = new Map<string, typeof lines>();
  for (const l of lines) {
    const k = products.get(l.service_product_id)!.providerProfile.person_id;
    byProvider.set(k, [...(byProvider.get(k) ?? []), l]);
  }
  // Placing signs the order for the buyer, so both companies are validated first, as for any work order.
  for (const providerPersonId of byProvider.keys()) await assertCanSign(p.id, p.id, providerPersonId);
  const buyerName = `${p.first_name} ${p.last_name}`.trim();
  const placed: { orderId: string; providerName: string; open: boolean }[] = [];
  for (const [providerPersonId, group] of byProvider) {
    const first = products.get(group[0].service_product_id)!;
    const providerName = `${first.providerProfile.person.first_name} ${first.providerProfile.person.last_name}`.trim();
    const manual = first.providerProfile.accepts_orders_manually;
    const rows = await Promise.all(group.map(async (l, i) => {
      const prod = products.get(l.service_product_id)!;
      const type: TransactionType = settlesByQty(prod.pricing_type) ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT";
      const fee = (await resolveCommissionBps("SOLE_SOURCED", type)).bps;
      return {
        line_number: i + 1, transaction_type: type, fee_bps: fee, description: prod.title, service_product_id: prod.id, payment_terms: prod.payment_terms,
        ...(type === "SERVICE_BY_QTY"
          ? { uom: "HOUR", quantity: l.quantity, unit_price_cents: l.unit_price_cents, payment_trigger: "TIMESHEET" as const }
          : { amount_cents: l.unit_price_cents * l.quantity, payment_trigger: prod.payment_trigger ?? ("ACCEPTANCE" as const) }),
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
          status: manual ? "ISSUED" : "RELEASED", buyer_accepted_at: now, provider_accepted_at: manual ? null : now,
          fee_bps: fees.length === 1 ? fees[0] : null, not_to_exceed_cents: total,
          lines: { create: rows },
        },
        select: { id: true },
      });
      if (!manual) await tx.onboardingRequest.create({ data: { onboarding_request_number: `ONB-${Date.now().toString(36).toUpperCase()}-${o.id.slice(0, 4)}`, work_order_id: o.id, provider_person_id: providerPersonId, buyer_person_id: p.id, raised_at: now } });
      await tx.cartLine.deleteMany({ where: { id: { in: group.map((l) => l.id) } } });
      return o;
    });
    await snapshotMilestones(order.id);
    const product = group.length === 1 ? first.title : `${first.title} + ${group.length - 1} more`;
    const amount = formatCents(total, group[0].currency);
    // Manual orders share the offered key, so the provider's acceptance clears the item.
    await notify({ event: "shop.order_received", personId: providerPersonId, entityType: "work_order", entityId: order.id, dedupeKey: manual ? `work.order_offered:${order.id}` : `shop.order_received:${order.id}`, vars: { orderId: order.id, product, buyerName, amount, manual: manual ? 1 : 0 } });
    await notify({ event: "shop.order_placed", personId: p.id, entityType: "work_order", entityId: order.id, dedupeKey: `shop.order_placed:${order.id}`, vars: { orderId: order.id, providerName, product, amount, manual: manual ? 1 : 0 } });
    if (!manual) await nudgeTaxBanking(providerPersonId);
    placed.push({ orderId: order.id, providerName, open: !manual });
  }
  return placed;
}
