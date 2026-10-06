import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

async function loadProduct(serviceProductId: string) {
  const p = await prisma.serviceProduct.findUnique({
    where: { id: serviceProductId },
    select: {
      id: true,
      title: true,
      status: true,
      price_cents: true,
      currency: true,
      pricing_type: true,
      providerProfile: { select: { person_id: true } },
    },
  });
  if (!p) throw new SourcingError("That service product doesn't exist.", "NOT_FOUND");
  if (p.status !== "PUBLISHED") {
    throw new SourcingError("That service product isn't published.", "NOT_PUBLISHED");
  }
  return p;
}

async function currentFloor(buyerPersonId: string, serviceProductId: string) {
  const lastDeny = await prisma.serviceProductOffer.findFirst({
    where: {
      buyer_person_id: buyerPersonId,
      service_product_id: serviceProductId,
      status: "DENIED",
    },
    orderBy: { decided_at: "desc" },
    select: { deny_floor_cents: true },
  });
  return lastDeny?.deny_floor_cents ?? null;
}

export async function makeOffer(
  viewer: Viewer,
  input: { serviceProductId: string; amountCents: number }
): Promise<{ id: string; offerNumber: string; clearedFloorCents: number | null }> {
  const me = await ownPerson(viewer);
  const product = await loadProduct(input.serviceProductId);
  if (product.providerProfile.person_id === me.id)
    throw new SourcingError("You can't make an offer on your own service product.", "OWN_PRODUCT");

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new SourcingError("An offer needs a whole amount above zero.", "BAD_AMOUNT");
  }

  const floor = await currentFloor(me.id, product.id);
  if (floor != null && input.amountCents < floor) {
    throw new SourcingError(
      `That's below the minimum the seller gave. Offer at least ${floor} cents.`,
      "BELOW_FLOOR"
    );
  }

  try {
    const row = await prisma.serviceProductOffer.create({
      data: {
        offer_number: `OFR-${Date.now().toString(36).toUpperCase()}-${product.id.slice(0, 4)}`,
        buyer_person_id: me.id,
        service_product_id: product.id,
        // THE OWNER IS COPIED NOW AND NEVER RE-READ. A product changing hands must
        provider_person_id: product.providerProfile.person_id,
        amount_cents: input.amountCents,
        currency: product.currency,
        status: "OPEN",
        // WRITTEN IN THE SAME STATEMENT AS `status`. `check:offers` asserts the
        open_service_product_id: product.id,
        cleared_floor_cents: floor,
      },
      select: { id: true, offer_number: true, cleared_floor_cents: true },
    });

    // TELL THE SELLER , `105d`)
    await notify({
      event: "shop.offer_received",
      personId: product.providerProfile.person_id,
      entityType: "ServiceProductOffer",
      entityId: row.id,
      vars: {
        productTitle: product.title,
        amount: formatCents(input.amountCents, product.currency),
      },
    });

    return {
      id: row.id,
      offerNumber: row.offer_number,
      clearedFloorCents: row.cleared_floor_cents,
    };
  } catch (e) {
    // THE DATABASE REFUSED A SECOND OPEN OFFER. P2002 is Prisma's unique violation.
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      throw new SourcingError(
        "You already have an offer open on this service product.",
        "OFFER_ALREADY_OPEN"
      );
    }
    throw e;
  }
}

/** Load an OPEN offer the SELLER owns, or refuse. */
async function loadOpenForSeller(offerId: string, sellerPersonId: string) {
  const offer = await prisma.serviceProductOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      status: true,
      provider_person_id: true,
      buyer_person_id: true,
      service_product_id: true,
      amount_cents: true,
      currency: true,
    },
  });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  // OWNER-SCOPED FROM THE SESSION. Without this any seller could answer any
  if (offer.provider_person_id !== sellerPersonId) {
    throw new SourcingError("That offer isn't yours to answer.", "NOT_YOURS");
  }
  if (offer.status !== "OPEN") {
    throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  }
  return offer;
}

/** DENY, WITH OPTIONAL GUIDANCE. TWO BUTTONS, NOT THREE — this is one of them. */
export async function denyOffer(
  viewer: Viewer,
  input: { offerId: string; message?: string | null; floorCents?: number | null }
): Promise<{ id: string; status: "DENIED" }> {
  const me = await ownPerson(viewer);
  // THE OFFER IS KEPT NOW, not discarded: the notification below needs the BUYER's
  const offer = await loadOpenForSeller(input.offerId, me.id);

  if (input.floorCents != null) {
    if (!Number.isInteger(input.floorCents) || input.floorCents <= 0) {
      throw new SourcingError("A minimum must be a whole amount above zero.", "BAD_FLOOR");
    }
  }

  const message = input.message?.trim() || null;
  const floorCents = input.floorCents ?? null;

  const row = await prisma.serviceProductOffer.update({
    where: { id: input.offerId },
    data: {
      status: "DENIED",
      decided_at: new Date(),
      deny_message: message,
      deny_floor_cents: floorCents,
      // THE MARKER CLEARS HERE, IN THE SAME STATEMENT AS THE STATUS. That is what
      open_service_product_id: null,
    },
    select: { id: true },
  });

  // TELL THE BUYER, AND CARRY THE FLOOR , `105d` / `94a`)
  await notify({
    event: "shop.offer_denied",
    personId: offer.buyer_person_id,
    entityType: "ServiceProductOffer",
    entityId: row.id,
    vars: {
      serviceProductId: offer.service_product_id,
      denyMessage: message,
      floor: floorCents != null ? formatCents(floorCents, offer.currency) : null,
    },
  });

  return { id: row.id, status: "DENIED" };
}

/** ACCEPT — AND THIS IS WHERE THE CART LINE IS WRITTEN (WS-B). */
export async function acceptOffer(
  viewer: Viewer,
  input: { offerId: string }
): Promise<{ id: string; status: "ACCEPTED"; workRequestId: string; lineId: string }> {
  const me = await ownPerson(viewer);
  const offer = await loadOpenForSeller(input.offerId, me.id);
  const product = await loadProduct(offer.service_product_id);

  // THE BUYER'S OWN ORGANISATION, read from the buyer named on the offer — never from
  // THE P-ACCOUNT COMES THROUGH THE BUYER'S COMPANY, WHICH IS WHERE IT LIVES —
  const buyer = await prisma.person.findUnique({
    where: { id: offer.buyer_person_id },
    select: { id: true, company: { select: { p_account_id: true } } },
  });
  if (!buyer?.company?.p_account_id) {
    throw new SourcingError("That buyer has no account to bill.", "NO_ACCOUNT");
  }
  const pAccountId = buyer.company.p_account_id;

  // ROW INSIDE, SEND OUTSIDE (`106a`)
  const { result, sendAfterCommit } = await prisma.$transaction(async (tx) => {
    const existing = await tx.workRequest.findFirst({
      where: { buyer_person_id: buyer.id, status: "DRAFT" },
      orderBy: { updated_at: "desc" },
      select: { id: true },
    });
    const cart =
      existing ??
      (await tx.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: pAccountId,
          status: "DRAFT",
          // SAFE failure: if the switch is never touched, the request reaches nobody it
          proposal_access: "INVITE_ONLY",
        },
        select: { id: true },
      }));

    const last = await tx.workRequestLine.findFirst({
      where: { work_request_id: cart.id },
      orderBy: { line_number: "desc" },
      select: { line_number: true },
    });

    // HOW IT SETTLES, DERIVED FROM THE PRODUCT'S OWN PRICING — not guessed.
    const transaction_type =
      product.pricing_type === "HOURLY" || product.pricing_type === "TM"
        ? ("SERVICE_BY_QTY" as const)
        : ("SERVICE_BY_AMT" as const);

    const line = await tx.workRequestLine.create({
      data: {
        work_request_id: cart.id,
        line_number: (last?.line_number ?? 0) + 1,
        transaction_type,
        description: product.title,
        currency: offer.currency,
        // One shape per kind, as the spine requires: a rate line has quantity × price, an amount line only an amount.
        ...(transaction_type === "SERVICE_BY_QTY"
          ? { quantity: 1, uom: "HOUR", unit_price_cents: offer.amount_cents }
          : { amount_cents: offer.amount_cents }),
        service_product_id: product.id,
        // THE LINE CARRIES THE PROVIDER EVEN THOUGH THE PRODUCT IMPLIES IT.
        provider_person_id: offer.provider_person_id,
        status: "DRAFT",
      },
      select: { id: true },
    });

    await tx.serviceProductOffer.update({
      where: { id: offer.id },
      data: {
        status: "ACCEPTED",
        decided_at: new Date(),
        /* Same statement as the status, same reason as the deny path. */
        open_service_product_id: null,
      },
    });

    // THE BELL ROW, INSIDE THIS TRANSACTION (`106a`, `106b`)
    const bell = await notify({
      event: "shop.offer_accepted",
      personId: offer.buyer_person_id,
      entityType: "ServiceProductOffer",
      entityId: offer.id,
      vars: {
        productTitle: product.title,
        amount: formatCents(offer.amount_cents, offer.currency),
        workRequestId: cart.id,
      },
      tx,
    });

    return {
      result: {
        id: offer.id,
        status: "ACCEPTED" as const,
        workRequestId: cart.id,
        lineId: line.id,
      },
      sendAfterCommit: bell.sendAfterCommit,
    };
  });

  // AFTER COMMIT. The line, the status and the bell row are durable by the time
  if (sendAfterCommit) await sendAfterCommit();

  return result;
}

/** THE BUYER PULLS THEIR OWN OFFER. Not a seller action and not a counter — it is */
export async function withdrawOffer(
  viewer: Viewer,
  input: { offerId: string }
): Promise<{ id: string; status: "WITHDRAWN" }> {
  const me = await ownPerson(viewer);
  const offer = await prisma.serviceProductOffer.findUnique({
    where: { id: input.offerId },
    select: { id: true, status: true, buyer_person_id: true },
  });
  if (!offer) throw new SourcingError("That offer doesn't exist.", "NOT_FOUND");
  /* THE BUYER'S OWN, FROM THE SESSION. */
  if (offer.buyer_person_id !== me.id) {
    throw new SourcingError("That offer isn't yours.", "NOT_YOURS");
  }
  if (offer.status !== "OPEN") {
    throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  }
  await prisma.serviceProductOffer.update({
    where: { id: offer.id },
    data: { status: "WITHDRAWN", decided_at: new Date(), open_service_product_id: null },
  });
  return { id: offer.id, status: "WITHDRAWN" };
}

/** THE SELLER'S ROOM, AS DATA. A writer with no reader is half a feature. */
export async function openOffersForSeller(viewer: Viewer) {
  const me = await ownPerson(viewer);
  const rows = await prisma.serviceProductOffer.findMany({
    where: { provider_person_id: me.id, status: "OPEN" },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      offer_number: true,
      service_product_id: true,
      amount_cents: true,
      currency: true,
      cleared_floor_cents: true,
      created_at: true,
    },
  });
  if (rows.length === 0) return [];
  const products = await prisma.serviceProduct.findMany({
    where: { id: { in: rows.map((r) => r.service_product_id) } },
    select: { id: true, title: true, price_cents: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.id,
    offerNumber: r.offer_number,
    productTitle: byId.get(r.service_product_id)?.title ?? "(removed)",
    listPriceCents: byId.get(r.service_product_id)?.price_cents ?? null,
    amountCents: r.amount_cents,
    currency: r.currency,
    clearedFloorCents: r.cleared_floor_cents,
    createdAt: r.created_at,
  }));
}
