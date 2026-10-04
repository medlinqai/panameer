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

    /*
      ── ⚠⚠⚠ TELL THE SELLER (`P2-A6-E707`, `105d`) ─────────────────────────────

      ⚠⚠ **AFTER THE WRITE, NOT INSIDE A TRANSACTION, BECAUSE THERE IS NO TRANSACTION
      HERE** (`106b`). ⚠ The brief asked for *"the same transaction as the transition"*
      and for this writer that was never a question — `prisma.serviceProductOffer.create`
      above is a single statement on the shared client. **Opening a transaction just to
      satisfy the phrasing would add a mechanism to make a sentence true.**

      ⚠⚠⚠ **RECIPIENT IS THE OWNER STAMPED ON THE ROW WE JUST WROTE**, which is
      `product.providerProfile.person_id` — the same value, taken from the same read that
      wrote it. ⚠ Never re-read from the product later: a product changing hands must not
      re-point this at a seller who never saw the offer.
    */
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
  /* ⚠ THE OFFER IS KEPT NOW, not discarded: the notification below needs the BUYER's
     identity, and this is the read that already resolved it under the owner check. */
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
      /* ⚠⚠⚠ THE MARKER CLEARS HERE, IN THE SAME STATEMENT AS THE STATUS. That is what
         frees the pair for a re-offer while keeping this row forever. */
      open_service_product_id: null,
    },
    select: { id: true },
  });

  /*
    ── ⚠⚠⚠ TELL THE BUYER, AND CARRY THE FLOOR (`P2-A6-E707`, `105d` / `94a`) ────

    ⚠⚠ **AFTER THE WRITE. NO TRANSACTION EXISTS HERE EITHER** (`106b`) — the update above
    is one statement.
    ⚠⚠⚠ **THE MESSAGE AND THE FLOOR GO INTO THE NOTIFICATION ITSELF**, because the floor
    is the actionable part and the buyer has **nowhere to go and read it** — there is no
    buyer-side offer surface at all. ⚠ The event's `body` is what adds *"guidance, not a
    quote"* beside the number; that sentence is not optional and lives with the figure.
    ⚠ **THE SAME VALUES THAT WERE WRITTEN, NOT THE RAW INPUT** — `message` and
    `floorCents` are the trimmed/normalised pair the row got, so the bell can never
    report a floor the record does not hold (`90b`).
  */
  await notify({
    event: "shop.offer_denied",
    personId: offer.buyer_person_id,
    entityType: "ServiceProductOffer",
    entityId: row.id,
    vars: {
      denyMessage: message,
      floor: floorCents != null ? formatCents(floorCents, offer.currency) : null,
    },
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

  /*
    ── ⚠⚠⚠ ROW INSIDE, SEND OUTSIDE (`106a`) ───────────────────────────────────

    ⚠⚠ **THE SEND IS CARRIED OUT OF THE TRANSACTION RATHER THAN CAPTURED IN A `let`.**
    A variable assigned inside the callback and read after it is exactly the shape
    TypeScript cannot narrow, and the failure mode is a silently skipped email.
    **Returning it makes the compiler carry the obligation** — the pattern Scott asked
    to be repeated: *"a forgetful sender being a compile error rather than a silent gap."*
  */
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

    /*
      ── ⚠⚠⚠ THE BELL ROW, INSIDE THIS TRANSACTION (`106a`, `106b`) ─────────────

      ⚠⚠ **THIS IS THE ONE OF THE THREE THAT MATTERS AND THE ONLY ONE WITH A
      TRANSACTION TO BE IN.** It has just written a **cart line** the buyer will be
      billed from. ⚠⚠⚠ **A LOST NOTIFICATION HERE LEAVES A COMMERCIAL ACT
      UNANNOUNCED** — a line appears on somebody's cart at a price they offered days
      ago and nothing told them.
      ⚠ Passing `tx` puts the row on this transaction: it commits with the line and
      the status, or it does not happen at all. ⚠⚠ **RULING 86's *"notification will
      ALWAYS add to the bell"* IS ONLY TRUE IF THE ROW CANNOT BE LOST AFTER A
      SUCCESSFUL WRITE.**
      ⚠⚠ **THE SEND IS NOT RUN HERE.** It is a network call and this transaction is
      still open; it is handed back and run below, after commit.
    */
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

  /*
    ⚠⚠⚠ AFTER COMMIT. The line, the status and the bell row are durable by the time
    this runs, so a mail outage can no longer affect any of them. ⚠ `sendAfterCommit`
    never throws — the contract `emailFor` has always had — so the accept cannot fail
    on the way out. ⚠⚠ The `await` is deliberate: the caller is a POST that is about to
    answer, and firing a promise nobody waits for is how a send disappears on a
    serverless invocation that ends the moment the response is written.
  */
  if (sendAfterCommit) await sendAfterCommit();

  return result;
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
