import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";

// MO-E003: Make an Offer on a Service Product that's Open to Offers. Below the provider's private floor → declined at once.
// Provider: Accept · Counter (once) · Decline. After a counter the buyer Accepts or Declines. Accepted → a cart line at the
// agreed price → normal checkout. One open (or countered) offer per buyer per product — `open_service_product_id` enforces it.
export const AUTO_DECLINE_MESSAGE = "Thanks for the offer — the seller isn't taking offers at that price. You can buy at the listed price or offer a little more.";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

async function loadProduct(serviceProductId: string) {
  const p = await prisma.serviceProduct.findUnique({
    where: { id: serviceProductId },
    select: { id: true, title: true, status: true, price_cents: true, currency: true, open_to_offers: true, offer_floor_cents: true, providerProfile: { select: { person_id: true } } },
  });
  if (!p) throw new SourcingError("That service product doesn't exist.", "NOT_FOUND");
  if (p.status !== "PUBLISHED") throw new SourcingError("That service product isn't published.", "NOT_PUBLISHED");
  return p;
}

const offerNumber = (productId: string) => `OFR-${Date.now().toString(36).toUpperCase()}-${productId.slice(0, 4)}`;

export async function makeOffer(
  viewer: Viewer,
  input: { serviceProductId: string; amountCents: number; note?: string | null }
): Promise<{ id: string; offerNumber: string; status: "OPEN" | "DENIED"; message: string | null }> {
  const me = await ownPerson(viewer);
  const product = await loadProduct(input.serviceProductId);
  if (product.providerProfile.person_id === me.id) throw new SourcingError("You can't make an offer on your own service product.", "OWN_PRODUCT");
  if (!product.open_to_offers) throw new SourcingError("This service product isn't open to offers.", "NOT_OPEN_TO_OFFERS");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new SourcingError("An offer needs an amount above zero.", "BAD_AMOUNT");
  const note = input.note?.trim().slice(0, 500) || null;
  const below = product.offer_floor_cents != null && input.amountCents < product.offer_floor_cents;
  try {
    const row = await prisma.serviceProductOffer.create({
      data: {
        offer_number: offerNumber(product.id),
        buyer_person_id: me.id,
        service_product_id: product.id,
        provider_person_id: product.providerProfile.person_id,
        amount_cents: input.amountCents,
        currency: product.currency,
        note,
        ...(below
          ? { status: "DENIED" as const, decided_at: new Date(), deny_message: AUTO_DECLINE_MESSAGE, open_service_product_id: null }
          : { status: "OPEN" as const, open_service_product_id: product.id }),
      },
      select: { id: true, offer_number: true },
    });
    if (!below) {
      await notify({ event: "shop.offer_received", personId: product.providerProfile.person_id, entityType: "ServiceProductOffer", entityId: row.id, vars: { productTitle: product.title, amount: formatCents(input.amountCents, product.currency) } });
    }
    return { id: row.id, offerNumber: row.offer_number, status: below ? "DENIED" : "OPEN", message: below ? AUTO_DECLINE_MESSAGE : null };
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      throw new SourcingError("You already have an offer open on this service product.", "OFFER_ALREADY_OPEN");
    }
    throw e;
  }
}

/** Load an offer the seller owns in one of the given states, or refuse. */
async function loadForSeller(offerId: string, sellerPersonId: string, states: ("OPEN" | "COUNTERED")[] = ["OPEN"]) {
  const offer = await prisma.serviceProductOffer.findUnique({ where: { id: offerId } });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  if (offer.provider_person_id !== sellerPersonId) throw new SourcingError("That offer isn't yours to answer.", "NOT_YOURS");
  if (!states.includes(offer.status as "OPEN")) throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  return offer;
}

/** Provider declines (optional message). */
export async function denyOffer(viewer: Viewer, input: { offerId: string; message?: string | null; floorCents?: number | null }): Promise<{ id: string; status: "DENIED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  const message = input.message?.trim() || null;
  const floorCents = input.floorCents ?? null;
  await prisma.serviceProductOffer.update({ where: { id: offer.id }, data: { status: "DENIED", decided_at: new Date(), deny_message: message, deny_floor_cents: floorCents, open_service_product_id: null } });
  await notify({ event: "shop.offer_denied", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { serviceProductId: offer.service_product_id, denyMessage: message, floor: floorCents != null ? formatCents(floorCents, offer.currency) : null } });
  return { id: offer.id, status: "DENIED" };
}

/** Provider counters once; the buyer then accepts or declines. */
export async function counterOffer(viewer: Viewer, input: { offerId: string; amountCents: number; message?: string | null }): Promise<{ id: string; status: "COUNTERED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  if (offer.counter_amount_cents != null) throw new SourcingError("You've already countered this offer.", "ALREADY_COUNTERED");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new SourcingError("A counter needs an amount above zero.", "BAD_AMOUNT");
  const product = await loadProduct(offer.service_product_id);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "OPEN" }, data: { status: "COUNTERED", counter_amount_cents: input.amountCents, countered_at: new Date(), deny_message: input.message?.trim() || null } });
  if (!moved.count) throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  await notify({ event: "shop.offer_countered", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: product.title, amount: formatCents(input.amountCents, offer.currency), offered: formatCents(offer.amount_cents, offer.currency) } });
  return { id: offer.id, status: "COUNTERED" };
}

/** The agreed price goes on the buyer's cart (quantity 1), replacing any list-price line for that product. */
async function putOnCart(buyerPersonId: string, productId: string, cents: number, currency: string, offerId: string) {
  const buyer = await prisma.person.findUnique({ where: { id: buyerPersonId }, select: { id: true, requesterProfile: { select: { id: true } } } });
  if (!buyer) throw new SourcingError("That buyer has no account.", "NO_ACCOUNT");
  if (!buyer.requesterProfile) await prisma.requesterProfile.create({ data: { person_id: buyer.id } });
  const cart = await prisma.cart.upsert({ where: { buyer_person_id: buyer.id }, create: { buyer_person_id: buyer.id }, update: {}, select: { id: true } });
  await prisma.cartLine.upsert({
    where: { cart_id_service_product_id: { cart_id: cart.id, service_product_id: productId } },
    create: { cart_id: cart.id, service_product_id: productId, quantity: 1, unit_price_cents: cents, currency, offer_id: offerId },
    update: { quantity: 1, unit_price_cents: cents, currency, offer_id: offerId },
  });
}

/** Provider accepts the buyer's offer → cart line at the offered amount. */
export async function acceptOffer(viewer: Viewer, input: { offerId: string }): Promise<{ id: string; status: "ACCEPTED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  const product = await loadProduct(offer.service_product_id);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "OPEN" }, data: { status: "ACCEPTED", decided_at: new Date(), open_service_product_id: null } });
  if (!moved.count) throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  await putOnCart(offer.buyer_person_id, product.id, offer.amount_cents, offer.currency, offer.id);
  await notify({ event: "shop.offer_accepted", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: product.title, amount: formatCents(offer.amount_cents, offer.currency) } });
  return { id: offer.id, status: "ACCEPTED" };
}

/** Buyer answers the provider's counter: accept → cart line at the counter; decline → closed. */
export async function answerCounter(viewer: Viewer, input: { offerId: string; accept: boolean }): Promise<{ id: string; status: "ACCEPTED" | "WITHDRAWN" }> {
  const me = await ownPerson(viewer);
  const offer = await prisma.serviceProductOffer.findUnique({ where: { id: input.offerId } });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  if (offer.buyer_person_id !== me.id) throw new SourcingError("That offer isn't yours.", "NOT_YOURS");
  if (offer.status !== "COUNTERED" || offer.counter_amount_cents == null) throw new SourcingError("There's no counter waiting on you.", "NOT_COUNTERED");
  const status = input.accept ? ("ACCEPTED" as const) : ("WITHDRAWN" as const);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "COUNTERED" }, data: { status, decided_at: new Date(), open_service_product_id: null } });
  if (!moved.count) throw new SourcingError("That counter has already been answered.", "NOT_COUNTERED");
  const product = await prisma.serviceProduct.findUniqueOrThrow({ where: { id: offer.service_product_id }, select: { title: true } });
  if (input.accept) await putOnCart(me.id, offer.service_product_id, offer.counter_amount_cents, offer.currency, offer.id);
  await notify({ event: "shop.offer_counter_answered", personId: offer.provider_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: product.title, amount: formatCents(offer.counter_amount_cents, offer.currency), accepted: input.accept ? 1 : 0 } });
  return { id: offer.id, status };
}

/** The buyer pulls their own open offer. */
export async function withdrawOffer(viewer: Viewer, input: { offerId: string }): Promise<{ id: string; status: "WITHDRAWN" }> {
  const me = await ownPerson(viewer);
  const offer = await prisma.serviceProductOffer.findUnique({ where: { id: input.offerId }, select: { id: true, status: true, buyer_person_id: true } });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  if (offer.buyer_person_id !== me.id) throw new SourcingError("That offer isn't yours.", "NOT_YOURS");
  if (offer.status !== "OPEN") throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  await prisma.serviceProductOffer.update({ where: { id: offer.id }, data: { status: "WITHDRAWN", decided_at: new Date(), open_service_product_id: null } });
  return { id: offer.id, status: "WITHDRAWN" };
}

export type OfferRow = { id: string; offerNumber: string; productId: string; productTitle: string; listPriceCents: number | null; amountCents: number; counterCents: number | null; currency: string; status: string; note: string | null; message: string | null; otherName: string; createdAt: Date };

async function rowsFor(where: { provider_person_id?: string; buyer_person_id?: string; status?: { in: ("OPEN" | "COUNTERED" | "ACCEPTED" | "DENIED" | "WITHDRAWN")[] } }, side: "seller" | "buyer"): Promise<OfferRow[]> {
  const rows = await prisma.serviceProductOffer.findMany({ where, orderBy: { created_at: "desc" }, take: 100 });
  if (!rows.length) return [];
  const [products, people] = await Promise.all([
    prisma.serviceProduct.findMany({ where: { id: { in: rows.map((r) => r.service_product_id) } }, select: { id: true, title: true, price_cents: true } }),
    prisma.person.findMany({ where: { id: { in: rows.map((r) => (side === "seller" ? r.buyer_person_id : r.provider_person_id)) } }, select: { id: true, first_name: true, last_name: true } }),
  ]);
  const prod = new Map(products.map((p) => [p.id, p]));
  const who = new Map(people.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
  return rows.map((r) => ({
    id: r.id, offerNumber: r.offer_number, productId: r.service_product_id, productTitle: prod.get(r.service_product_id)?.title ?? "(removed)", listPriceCents: prod.get(r.service_product_id)?.price_cents ?? null,
    amountCents: r.amount_cents, counterCents: r.counter_amount_cents, currency: r.currency, status: r.status, note: r.note, message: r.deny_message,
    otherName: who.get(side === "seller" ? r.buyer_person_id : r.provider_person_id) ?? "—", createdAt: r.created_at,
  }));
}

/** Seller: offers waiting on you (OPEN). */
export async function openOffersForSeller(viewer: Viewer) {
  const me = await ownPerson(viewer);
  return rowsFor({ provider_person_id: me.id, status: { in: ["OPEN"] } }, "seller");
}

/** Buyer: every offer they've made, with status. */
export async function offersForBuyer(viewer: Viewer) {
  const me = await ownPerson(viewer);
  return rowsFor({ buyer_person_id: me.id }, "buyer");
}
