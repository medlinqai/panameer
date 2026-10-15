import { prisma } from "@/lib/prisma";
import { putShopLine } from "@/lib/cart";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";

// MO-E003 / Lane 7 (Scott 10-15): one negotiation pattern. A buyer proposes a different price and/or delivery date on a
// Service Product or a Service (rate) that's open to offers; the seller Accepts · Counters (once) · Declines; after a
// counter the buyer Accepts or Declines. Accepted → a cart line at the agreed price/date → normal checkout.
// Open to offers = the item's own override, else the seller's "Open to offers on price and delivery" switch.
// One open (or countered) offer per buyer per item — `open_service_product_id` holds the item id (product or service).
export const AUTO_DECLINE_MESSAGE = "Thanks for the offer — the seller isn't taking offers at that price. You can buy at the listed price or offer a little more.";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

type Target = { kind: "product" | "service"; id: string; title: string; currency: string; listCents: number | null; open: boolean; floorCents: number | null; sellerPersonId: string };

/** The thing being negotiated: a published Service Product or a live Service (rate). */
async function loadTarget(ref: { serviceProductId?: string | null; providerServiceId?: string | null }): Promise<Target> {
  if (ref.serviceProductId) {
    const p = await prisma.serviceProduct.findUnique({ where: { id: ref.serviceProductId }, select: { id: true, title: true, status: true, price_cents: true, currency: true, open_to_offers: true, offers_override: true, offer_floor_cents: true, providerProfile: { select: { person_id: true, open_to_offers: true } } } });
    if (!p) throw new SourcingError("That service product doesn't exist.", "NOT_FOUND");
    if (p.status !== "PUBLISHED") throw new SourcingError("That service product isn't published.", "NOT_PUBLISHED");
    return { kind: "product", id: p.id, title: p.title, currency: p.currency, listCents: p.price_cents, open: p.offers_override ?? (p.providerProfile.open_to_offers || p.open_to_offers), floorCents: p.offer_floor_cents, sellerPersonId: p.providerProfile.person_id };
  }
  if (ref.providerServiceId) {
    const s = await prisma.providerService.findUnique({ where: { id: ref.providerServiceId }, select: { id: true, name: true, rate_cents: true, active: true, published_at: true, offers_override: true, provider_profile_id: true } });
    if (!s || !s.active || !s.published_at) throw new SourcingError("That service isn't available.", "NOT_FOUND");
    const pp = await prisma.providerProfile.findUniqueOrThrow({ where: { id: s.provider_profile_id }, select: { person_id: true, open_to_offers: true } });
    return { kind: "service", id: s.id, title: s.name, currency: "USD", listCents: s.rate_cents, open: s.offers_override ?? pp.open_to_offers, floorCents: null, sellerPersonId: pp.person_id };
  }
  throw new SourcingError("Which service product or service?", "NOT_FOUND");
}
const targetOf = (o: { service_product_id: string | null; provider_service_id: string | null }) => loadTarget({ serviceProductId: o.service_product_id, providerServiceId: o.provider_service_id });
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null);
const offerNumber = (id: string) => `OFR-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4)}`;

export async function makeOffer(
  viewer: Viewer,
  input: { serviceProductId?: string | null; providerServiceId?: string | null; amountCents?: number | null; deliveryDate?: string | null; note?: string | null }
): Promise<{ id: string; offerNumber: string; status: "OPEN" | "DENIED"; message: string | null }> {
  const me = await ownPerson(viewer);
  const t = await loadTarget(input);
  if (t.sellerPersonId === me.id) throw new SourcingError("You can't make an offer on your own listing.", "OWN_PRODUCT");
  if (!t.open) throw new SourcingError("This listing isn't open to offers.", "NOT_OPEN_TO_OFFERS");
  const date = input.deliveryDate ? new Date(input.deliveryDate) : null;
  if (date && Number.isNaN(date.getTime())) throw new SourcingError("That delivery date isn't valid.", "BAD_DATE");
  // A proposal changes the price, the date, or both; an unchanged price is the list price.
  const amount = input.amountCents ?? t.listCents;
  if (!amount || !Number.isInteger(amount) || amount <= 0) throw new SourcingError("An offer needs an amount above zero.", "BAD_AMOUNT");
  if (input.amountCents == null && !date) throw new SourcingError("Propose a different price or delivery date.", "BAD_AMOUNT");
  const note = input.note?.trim().slice(0, 500) || null;
  const below = t.floorCents != null && amount < t.floorCents;
  try {
    const row = await prisma.serviceProductOffer.create({
      data: {
        offer_number: offerNumber(t.id),
        buyer_person_id: me.id,
        service_product_id: t.kind === "product" ? t.id : null,
        provider_service_id: t.kind === "service" ? t.id : null,
        provider_person_id: t.sellerPersonId,
        amount_cents: amount,
        currency: t.currency,
        delivery_date: date,
        note,
        ...(below
          ? { status: "DENIED" as const, decided_at: new Date(), deny_message: AUTO_DECLINE_MESSAGE, open_service_product_id: null }
          : { status: "OPEN" as const, open_service_product_id: t.id }),
      },
      select: { id: true, offer_number: true },
    });
    if (!below) {
      await notify({ event: "shop.offer_received", personId: t.sellerPersonId, entityType: "ServiceProductOffer", entityId: row.id, vars: { productTitle: t.title, amount: `${formatCents(amount, t.currency)}${date ? ` by ${day(date)}` : ""}` } });
    }
    return { id: row.id, offerNumber: row.offer_number, status: below ? "DENIED" : "OPEN", message: below ? AUTO_DECLINE_MESSAGE : null };
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      throw new SourcingError("You already have an offer open on this listing.", "OFFER_ALREADY_OPEN");
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

/** Seller declines (optional message). */
export async function denyOffer(viewer: Viewer, input: { offerId: string; message?: string | null; floorCents?: number | null }): Promise<{ id: string; status: "DENIED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  const message = input.message?.trim() || null;
  const floorCents = input.floorCents ?? null;
  await prisma.serviceProductOffer.update({ where: { id: offer.id }, data: { status: "DENIED", decided_at: new Date(), deny_message: message, deny_floor_cents: floorCents, open_service_product_id: null } });
  await notify({ event: "shop.offer_denied", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { serviceProductId: offer.service_product_id, denyMessage: message, floor: floorCents != null ? formatCents(floorCents, offer.currency) : null } });
  return { id: offer.id, status: "DENIED" };
}

/** Seller counters once — a price and/or a delivery date; the buyer then accepts or declines. */
export async function counterOffer(viewer: Viewer, input: { offerId: string; amountCents?: number | null; deliveryDate?: string | null; message?: string | null }): Promise<{ id: string; status: "COUNTERED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  if (offer.counter_amount_cents != null || offer.countered_at) throw new SourcingError("You've already countered this offer.", "ALREADY_COUNTERED");
  const amount = input.amountCents ?? offer.amount_cents;
  if (!Number.isInteger(amount) || amount <= 0) throw new SourcingError("A counter needs an amount above zero.", "BAD_AMOUNT");
  const date = input.deliveryDate ? new Date(input.deliveryDate) : offer.delivery_date;
  if (date && Number.isNaN(date.getTime())) throw new SourcingError("That delivery date isn't valid.", "BAD_DATE");
  const t = await targetOf(offer);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "OPEN" }, data: { status: "COUNTERED", counter_amount_cents: amount, counter_delivery_date: date, countered_at: new Date(), deny_message: input.message?.trim() || null } });
  if (!moved.count) throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  await notify({ event: "shop.offer_countered", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: t.title, amount: `${formatCents(amount, offer.currency)}${date ? ` by ${day(date)}` : ""}`, offered: formatCents(offer.amount_cents, offer.currency) } });
  return { id: offer.id, status: "COUNTERED" };
}

/** The agreed price (and date) goes on the buyer's Shop work request (JW-E004), replacing any list-price line for that item. */
async function putOnCart(buyerPersonId: string, t: Target, cents: number, currency: string, offerId: string, deliveryDate: Date | null) {
  const buyer = await prisma.person.findUnique({ where: { id: buyerPersonId }, select: { id: true, requesterProfile: { select: { id: true } } } });
  if (!buyer) throw new SourcingError("That buyer has no account.", "NO_ACCOUNT");
  if (!buyer.requesterProfile) await prisma.requesterProfile.create({ data: { person_id: buyer.id } });
  const byQty = t.kind === "product"
    ? ["HOURLY", "TM"].includes((await prisma.serviceProduct.findUnique({ where: { id: t.id }, select: { pricing_type: true } }))?.pricing_type ?? "")
    : (await prisma.providerService.findUnique({ where: { id: t.id }, select: { service_type: true } }))?.service_type !== "SERVICE_BY_AMT";
  const uom = t.kind === "service" ? (await prisma.providerService.findUnique({ where: { id: t.id }, select: { uom: true } }))?.uom ?? "HOUR" : "HOUR";
  await putShopLine(buyer.id, { ...(t.kind === "product" ? { productId: t.id } : { serviceId: t.id }), title: t.title, providerPersonId: t.sellerPersonId, type: byQty ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT", uom, quantity: 1, unitCents: cents, currency, offerId, deliveryDate }, true);
}

/** Seller accepts the buyer's offer → cart line at the offered price/date. */
export async function acceptOffer(viewer: Viewer, input: { offerId: string }): Promise<{ id: string; status: "ACCEPTED" }> {
  const me = await ownPerson(viewer);
  const offer = await loadForSeller(input.offerId, me.id);
  const t = await targetOf(offer);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "OPEN" }, data: { status: "ACCEPTED", decided_at: new Date(), open_service_product_id: null } });
  if (!moved.count) throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  await putOnCart(offer.buyer_person_id, t, offer.amount_cents, offer.currency, offer.id, offer.delivery_date);
  await notify({ event: "shop.offer_accepted", personId: offer.buyer_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: t.title, amount: formatCents(offer.amount_cents, offer.currency) } });
  return { id: offer.id, status: "ACCEPTED" };
}

/** Buyer answers the seller's counter: accept → cart line at the counter price/date; decline → closed. */
export async function answerCounter(viewer: Viewer, input: { offerId: string; accept: boolean }): Promise<{ id: string; status: "ACCEPTED" | "WITHDRAWN" }> {
  const me = await ownPerson(viewer);
  const offer = await prisma.serviceProductOffer.findUnique({ where: { id: input.offerId } });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  if (offer.buyer_person_id !== me.id) throw new SourcingError("That offer isn't yours.", "NOT_YOURS");
  if (offer.status !== "COUNTERED" || offer.counter_amount_cents == null) throw new SourcingError("There's no counter waiting on you.", "NOT_COUNTERED");
  const status = input.accept ? ("ACCEPTED" as const) : ("WITHDRAWN" as const);
  const moved = await prisma.serviceProductOffer.updateMany({ where: { id: offer.id, status: "COUNTERED" }, data: { status, decided_at: new Date(), open_service_product_id: null } });
  if (!moved.count) throw new SourcingError("That counter has already been answered.", "NOT_COUNTERED");
  const t = await targetOf(offer);
  if (input.accept) await putOnCart(me.id, t, offer.counter_amount_cents, offer.currency, offer.id, offer.counter_delivery_date ?? offer.delivery_date);
  await notify({ event: "shop.offer_counter_answered", personId: offer.provider_person_id, entityType: "ServiceProductOffer", entityId: offer.id, vars: { productTitle: t.title, amount: formatCents(offer.counter_amount_cents, offer.currency), accepted: input.accept ? 1 : 0 } });
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

export type OfferRow = { id: string; offerNumber: string; productId: string | null; serviceId: string | null; productTitle: string; listPriceCents: number | null; amountCents: number; counterCents: number | null; deliveryDate: string | null; counterDeliveryDate: string | null; currency: string; status: string; note: string | null; message: string | null; otherName: string; createdAt: Date };

async function rowsFor(where: { provider_person_id?: string; buyer_person_id?: string; status?: { in: ("OPEN" | "COUNTERED" | "ACCEPTED" | "DENIED" | "WITHDRAWN")[] } }, side: "seller" | "buyer"): Promise<OfferRow[]> {
  const rows = await prisma.serviceProductOffer.findMany({ where, orderBy: { created_at: "desc" }, take: 100 });
  if (!rows.length) return [];
  const [products, services, people] = await Promise.all([
    prisma.serviceProduct.findMany({ where: { id: { in: rows.map((r) => r.service_product_id).filter((x): x is string => !!x) } }, select: { id: true, title: true, price_cents: true } }),
    prisma.providerService.findMany({ where: { id: { in: rows.map((r) => r.provider_service_id).filter((x): x is string => !!x) } }, select: { id: true, name: true, rate_cents: true } }),
    prisma.person.findMany({ where: { id: { in: rows.map((r) => (side === "seller" ? r.buyer_person_id : r.provider_person_id)) } }, select: { id: true, first_name: true, last_name: true } }),
  ]);
  const who = new Map(people.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return rows.map((r) => {
    const prod = r.service_product_id ? products.find((x) => x.id === r.service_product_id) : null;
    const svc = r.provider_service_id ? services.find((x) => x.id === r.provider_service_id) : null;
    return {
      id: r.id, offerNumber: r.offer_number, productId: r.service_product_id, serviceId: r.provider_service_id, productTitle: prod?.title ?? svc?.name ?? "(removed)", listPriceCents: prod?.price_cents ?? svc?.rate_cents ?? null,
      amountCents: r.amount_cents, counterCents: r.counter_amount_cents, deliveryDate: iso(r.delivery_date), counterDeliveryDate: iso(r.counter_delivery_date), currency: r.currency, status: r.status, note: r.note, message: r.deny_message,
      otherName: who.get(side === "seller" ? r.buyer_person_id : r.provider_person_id) ?? "—", createdAt: r.created_at,
    };
  });
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

/** Lane 7: is this listing open to offers? (the item's override, else the seller's switch). */
export async function openToOffers(ref: { serviceProductId?: string | null; providerServiceId?: string | null }) {
  return (await loadTarget(ref).catch(() => null))?.open ?? false;
}
