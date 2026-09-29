import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ THE SHOP OFFER: ACCEPT OR DENY, AND A DENY MAY CARRY A FLOOR ────────
 *
 * `P2-A6-E700`, rulings 94 and 94a. See `ServiceProductOffer` in the schema for the
 * shape and for why the open marker is a nullable uuid rather than a boolean.
 *
 * ⚠⚠ **SCOTT, 2026-09-28:** *"either it is an accept or deny. if the provider denies
 * it, the requester either buys it at list or removes it from their cart."*
 * ⚠ **AND:** *"the provider might tell them make another offer above $1000 or
 * something."*
 *
 * ⚠⚠⚠ **THERE IS NO COUNTER CHAIN AND NO FIELD FOR ONE.** A deny sets a status and
 * may carry a message and a floor; the buyer's next offer is a NEW ROW that must clear
 * that floor. **The seller never names a price they are bound to.**
 */

/** The person behind this account. ⚠ Never taken from input (load-bearing rule 5). */
async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

/**
 * The product, plus **who owns it right now**.
 *
 * ⚠⚠ The owner is resolved through `ProviderProfile.person_id`, because a service
 * product belongs to a PROFILE and an offer is answered by a PERSON.
 */
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
  /*
    ⚠⚠ A DRAFT PRODUCT CANNOT BE OFFERED ON. It is not on sale, and an offer against
    something the seller has not published is a message they never asked to receive.
  */
  if (p.status !== "PUBLISHED") {
    throw new SourcingError("That service product isn't published.", "NOT_PUBLISHED");
  }
  return p;
}

/**
 * ⚠⚠⚠ THE FLOOR THE BUYER'S NEXT OFFER MUST CLEAR, FROM THE MOST RECENT DENY.
 *
 * ⚠ Null when there was no deny, or the deny carried no floor — **both of which are
 * the common case**, and neither blocks an offer.
 *
 * ⚠⚠ **MOST RECENT, NOT LOWEST AND NOT HIGHEST.** A seller who denies at 1200 and
 * later denies at 900 has changed their mind downward, and the live guidance is the
 * last thing they said. Taking the lowest would let a buyer mine history for the
 * weakest number the seller ever gave.
 */
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

/**
 * Make an offer on a published service product.
 *
 * ⚠⚠ **ONE OPEN OFFER PER (BUYER, PRODUCT) IS ENFORCED BY THE DATABASE**, not here —
 * the `@@unique([buyer_person_id, open_service_product_id])` constraint. This function
 * translates the refusal into a sentence; it does not implement the rule.
 */
export async function makeOffer(
  viewer: Viewer,
  input: { serviceProductId: string; amountCents: number }
): Promise<{ id: string; offerNumber: string; clearedFloorCents: number | null }> {
  const me = await ownPerson(viewer);
  const product = await loadProduct(input.serviceProductId);

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new SourcingError("An offer needs a whole amount above zero.", "BAD_AMOUNT");
  }

  /*
    ── ⚠⚠⚠ THE FLOOR IS A GATE ON MAKING THE OFFER, NOT A PROMISE ABOUT IT ─────

    ⚠ `>=`, NOT `>`, AND THE TENSION IS REAL AND RECORDED. Scott said *"make another
    offer **above** $1000"*, which reads as `>`. The brief's acceptance criteria say
    *"a re-offer **below** a given floor is refused"* and *"an offer **AT** the floor is
    still deniable — proven"*.
    ⚠⚠ **THE SECOND PAIR ONLY MAKES SENSE IF AN OFFER AT THE FLOOR CAN BE MADE**, so
    `>=` is what satisfies the written criteria, and an offer exactly at the floor is
    accepted as an OFFER and remains refusable as a DEAL.
    ⚠ **FLAGGED FOR SCOTT: if he meant strictly above, this is one operator.**
  */
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
        /*
          ⚠⚠ THE OWNER IS COPIED NOW AND NEVER RE-READ. A product changing hands must
          not silently re-point an old offer at a seller who never saw it — the same
          reason `E696` stamps the commission on the line.
        */
        provider_person_id: product.providerProfile.person_id,
        amount_cents: input.amountCents,
        currency: product.currency,
        status: "OPEN",
        /* ⚠⚠⚠ WRITTEN IN THE SAME STATEMENT AS `status`. `check:offers` asserts the
           two can never disagree — a marker derived on read would drift. */
        open_service_product_id: product.id,
        cleared_floor_cents: floor,
      },
      select: { id: true, offer_number: true, cleared_floor_cents: true },
    });
    return {
      id: row.id,
      offerNumber: row.offer_number,
      clearedFloorCents: row.cleared_floor_cents,
    };
  } catch (e) {
    /*
      ⚠⚠ THE DATABASE REFUSED A SECOND OPEN OFFER. P2002 is Prisma's unique violation.
      ⚠ Translated rather than swallowed: the buyer needs to know their existing offer
      is still standing, not that "something went wrong".
    */
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
  /* ⚠⚠⚠ OWNER-SCOPED FROM THE SESSION. Without this any seller could answer any
     seller's offers. */
  if (offer.provider_person_id !== sellerPersonId) {
    throw new SourcingError("That offer isn't yours to answer.", "NOT_YOURS");
  }
  if (offer.status !== "OPEN") {
    throw new SourcingError("That offer has already been answered.", "NOT_OPEN");
  }
  return offer;
}

/**
 * ⚠⚠ DENY, WITH OPTIONAL GUIDANCE. **TWO BUTTONS, NOT THREE** — this is one of them.
 *
 * ⚠⚠⚠ **A FLOOR IS NOT A COUNTER-OFFER.** The seller is not bound to it: the buyer's
 * next offer must clear it and **may still be denied**. That distinction is the whole
 * of ruling 94a.
 */
export async function denyOffer(
  viewer: Viewer,
  input: { offerId: string; message?: string | null; floorCents?: number | null }
): Promise<{ id: string; status: "DENIED" }> {
  const me = await ownPerson(viewer);
  await loadOpenForSeller(input.offerId, me.id);

  if (input.floorCents != null) {
    if (!Number.isInteger(input.floorCents) || input.floorCents <= 0) {
      throw new SourcingError("A minimum must be a whole amount above zero.", "BAD_FLOOR");
    }
  }

  const row = await prisma.serviceProductOffer.update({
    where: { id: input.offerId },
    data: {
      status: "DENIED",
      decided_at: new Date(),
      deny_message: input.message?.trim() || null,
      deny_floor_cents: input.floorCents ?? null,
      /* ⚠⚠⚠ THE MARKER CLEARS HERE, IN THE SAME STATEMENT AS THE STATUS. That is what
         frees the pair for a re-offer while keeping this row forever. */
      open_service_product_id: null,
    },
    select: { id: true },
  });
  return { id: row.id, status: "DENIED" };
}

/**
 * ⚠⚠⚠ ACCEPT — AND THIS IS WHERE THE CART LINE IS WRITTEN (WS-B).
 *
 * ⚠⚠ **NO LINE EXISTS BEFORE ACCEPTANCE.** Scott: a deny leaves the buyer with *"buys
 * it at list or removes it from their cart"* — so an offer that was never accepted must
 * leave nothing behind to remove.
 * ⚠ **THE LINE IS WRITTEN AT THE OFFERED AMOUNT**, not at list.
 *
 * ⚠⚠ **ONE OPEN CART PER BUYER, CREATED ON THE FIRST ADD** (ruling 94c). The cart is a
 * `WorkRequest` in `DRAFT`; there is no cart table.
 * ⚠⚠⚠ **AND THE "ONE OPEN CART" RULE IS NOT ENFORCED BY THE DATABASE TODAY — MEASURED,
 * AND REPORTED RATHER THAN ASSUMED.** `work_requests` carries only plain indexes on
 * `buyer_person_id` and `status`, and `getCurrentDraft` takes the NEWEST draft rather
 * than the only one. This function reuses the newest open draft and creates one only
 * when there is none, which is the same rule the rest of the app follows — **but a
 * constraint is Scott's call and a unique index on a live table is not additive.**
 */
export async function acceptOffer(
  viewer: Viewer,
  input: { offerId: string }
): Promise<{ id: string; status: "ACCEPTED"; workRequestId: string; lineId: string }> {
  const me = await ownPerson(viewer);
  const offer = await loadOpenForSeller(input.offerId, me.id);
  const product = await loadProduct(offer.service_product_id);

  /*
    ⚠ THE BUYER'S OWN ORGANISATION, read from the buyer named on the offer — never from
    the seller's session. The cart belongs to the buyer; the seller only triggers it.
  */
  /*
    ⚠⚠ THE P-ACCOUNT COMES THROUGH THE BUYER'S COMPANY, WHICH IS WHERE IT LIVES —
    `Person` has no `p_account_id` of its own. ⚠ Shaped identically to
    `work-request.ts`'s `resolveBuyer` on purpose: **one definition of "which org is
    this buyer's" (`E585`)**, and that function cannot be reused here because it reads
    the SESSION's person and this path needs the OFFER's buyer.
  */
  const buyer = await prisma.person.findUnique({
    where: { id: offer.buyer_person_id },
    select: { id: true, company: { select: { p_account_id: true } } },
  });
  if (!buyer?.company?.p_account_id) {
    throw new SourcingError("That buyer has no account to bill.", "NO_ACCOUNT");
  }
  const pAccountId = buyer.company.p_account_id;

  return prisma.$transaction(async (tx) => {
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
          /*
            ⚠⚠ `INVITE_ONLY`, MATCHING `createDraft` EXACTLY — ruling 14, and it is the
            SAFE failure: if the switch is never touched, the request reaches nobody it
            was not sent to. ⚠ The opposite default would publish a half-written cart to
            every provider on the platform the moment it posted.
            ⚠⚠⚠ **A CART CREATED BY AN ACCEPTED OFFER IS STILL A WORK REQUEST, SO IT
            STARTS WHERE EVERY OTHER ONE STARTS.** Diverging here would mean two
            definitions of "a new request" (`E585`).
          */
          proposal_access: "INVITE_ONLY",
        },
        select: { id: true },
      }));

    const last = await tx.workRequestLine.findFirst({
      where: { work_request_id: cart.id },
      orderBy: { line_number: "desc" },
      select: { line_number: true },
    });

    /*
      ⚠⚠ HOW IT SETTLES, DERIVED FROM THE PRODUCT'S OWN PRICING — not guessed.
      ⚠ `TransactionType` describes SETTLEMENT (`E696`'s lesson: it cannot describe
      sourcing). A fixed-price product settles on an amount; an hourly one on quantity.
    */
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
        quantity: 1,
        unit_price_cents: offer.amount_cents,
        amount_cents: offer.amount_cents,
        service_product_id: product.id,
        /*
          ⚠⚠⚠ THE LINE CARRIES THE PROVIDER EVEN THOUGH THE PRODUCT IMPLIES IT.
          Checkout groups by provider to fan out work orders and must not walk the
          catalogue to do it. ⚠ And it is taken from the OFFER, which stamped the owner
          at offer time — so a product changing hands cannot rewrite an agreed line.
        */
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
        /* ⚠ Same statement as the status, same reason as the deny path. */
        open_service_product_id: null,
      },
    });

    return { id: offer.id, status: "ACCEPTED" as const, workRequestId: cart.id, lineId: line.id };
  });
}

/**
 * ⚠ THE BUYER PULLS THEIR OWN OFFER. Not a seller action and not a counter — it is
 * Scott's *"removes it from their cart"*, available before an answer arrives.
 */
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
  /* ⚠⚠ THE BUYER'S OWN, FROM THE SESSION. */
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

/**
 * ⚠⚠ THE SELLER'S ROOM, AS DATA. **A writer with no reader is half a feature.**
 *
 * ⚠ Owner-scoped: a seller sees offers stamped with their own person id, and nothing
 * else. ⚠⚠ Arrival order, because sorting by amount would be a ranking and a ranking is
 * a judgement this read has no business making.
 */
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
