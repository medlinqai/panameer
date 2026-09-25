import { TransactionType, WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pricedByQuantity } from "@/lib/transaction-spine";
/* ⚠ SUPERSEDED, quoted not deleted (`E164`) — ruling 44 deleted the bridge, and
   `WorkOrderLine` now carries `transaction_type` so there is nothing to
   translate. `LineBasis` left this file's imports with it:
   //   import { LineBasis, WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";
   //   import { basisForTransactionType } from "@/lib/transaction-spine"; */
import type { Viewer } from "@/lib/access";

/**
 * WORK ORDERS — THE LIST, THE DETAIL, AND THE TWO-SIDED ACTIVATION
 * (`P1-J4-E393`).
 *
 * ── ⚠⚠ THE DOCTRINE THIS OBEYS IS OLDER THAN THE MODEL ──────────────────────
 *
 * `lib/nav.ts` carries it beside the `Orders` slot (`P1-ALL-E380`), and it was
 * written before `E388` built `WorkOrder`. **THEY AGREE, and the agreement is
 * checked rather than assumed** — `check:orders` asserts it:
 *
 *   · **THE ToS IS THE MSA; THE WORK ORDER IS THE SOW.** There is no third
 *     contract, no `Contract` model and no `/contracts` route.
 *   · **A WORK ORDER MUST KNOW ITS ORIGIN**, because *"Panameer can assert the
 *     terms of an order it generated; it can only RECORD THE EXISTENCE of one it
 *     did not."* `E388` added `origin DIRECT | INDIRECT` **with the model**,
 *     which is exactly what that doctrine asked for.
 *   · For a DIRECT order the Work Order **REPRESENTS** a SOW made elsewhere
 *     rather than **BEING** it, and the MSA is the parties' own. ⚠ WHICH GOVERNS
 *     IF THEY DISAGREE IS A LAWYER'S QUESTION AND NOT A BUILD DECISION — `E380`
 *     flagged it, `E393` does not answer it, and nothing here implies an answer.
 *
 * ⚠ ONE SENTENCE IN THAT BLOCK NOW READS AS A CONTRADICTION AND IS NOT ONE:
 * *"THAT FIELD IS NOT BUILT AND MUST NOT BE ADDED HERE."* It was an instruction
 * to `E380` — a NAV brief — not a standing ban, and the very next line says the
 * field *"IS COMING SO IT ARRIVES WITH THE MODEL RATHER THAN BEING
 * RETROFITTED."* `E388` added it with the model. REPORTED, not resolved by
 * choosing.
 */

export class OrderError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
    this.name = "OrderError";
  }
}

/**
 * ⚠⚠ OWNER-SCOPED BY CONSTRUCTION. `user_id` comes from the SESSION and never
 * from client input, and `Person.user_id` is `@unique`, so this matches at most
 * one row: the caller's own.
 *
 * ⚠ NOT IMPORTED FROM `lib/settings.ts`. The identical resolver lives there
 * privately and throws a `SettingsError`; exporting a settings-shaped error into
 * the orders domain would make every orders route translate it back. Three lines
 * and one query, deliberately duplicated — the DUPLICATION THAT MATTERS is a
 * second definition of a RULE, and this is a lookup.
 */
async function ownPersonId(viewer: Viewer): Promise<string> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OrderError("This account has no person record", "NOT_FOUND");
  return person.id;
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHO IS LOOKING — ONE PAGE, TWO SCOPES
   ═════════════════════════════════════════════════════════════════════════ */

export type OrderParty = "BUYER" | "PROVIDER" | "NONE";

/**
 * ⚠⚠ THE SCOPE IS DERIVED FROM THE ORDER AND THE SESSION, NEVER FROM A ROUTE.
 *
 * **One page, two scopes.** `/orders` is not two routes with two guards; it is
 * one route that asks *"which side of THIS order are you?"* — which is the only
 * question that has a correct answer, because the same human can be the buyer on
 * one order and the provider on another. Two routes would have forced a person
 * to know which of their two hats they were wearing before clicking.
 *
 * ⚠ `NONE` IS A REAL ANSWER AND IT IS THE SAFE DEFAULT. A viewer who is neither
 * party sees nothing and can do nothing; every gate below is written so that
 * `NONE` falls through to the empty case rather than to an else-branch.
 */
export function partyFor(
  order: { buyer_person_id: string; provider_person_id: string },
  personId: string
): OrderParty {
  /* ⚠ BUYER IS TESTED FIRST AND THE TWO ARE NOT EXCLUSIVE IN THE DATA. Nothing
     stops a row naming one person as both, and if that ever happens the safe
     reading is BUYER — the party that pays, and the one whose ACCEPTANCE comes
     second (ruling 43b: provider first, then buyer). It is not a state this code
     creates.
     ⚠ SUPERSEDED, quoted not deleted (`E164`) — release is no longer an action:
     //   the one whose action (release) comes second. */
  if (personId && order.buyer_person_id === personId) return "BUYER";
  if (personId && order.provider_person_id === personId) return "PROVIDER";
  return "NONE";
}

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠ THE TWO-SIDED ACTIVATION — ONE FUNCTION, AND THE UI RENDERS NOTHING ELSE
   ═════════════════════════════════════════════════════════════════════════ */

/*
  ── ⚠⚠⚠ RULING 43 — RELEASE IS NOT A BUTTON. ONE ACTION, BOTH PARTIES. ───

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   export type OrderAction = "ACCEPT" | "RELEASE";
*/
export type OrderAction = "ACCEPT";

/**
 * ⚠⚠⚠ ACTIVATION IS TWO ACCEPTANCES AND AN AUTO-RELEASE (RULING 43).
 *
 *     ISSUED   → the PROVIDER accepts terms (`provider_accepted_at`) → ACCEPTED
 *     ACCEPTED → the BUYER accepts terms    (`buyer_accepted_at`)    → RELEASED
 *     RELEASED → settlements can be raised
 *
 * ⚠ SCOTT, 2026-09-24: *"both parties are accepting the terms of the WO. Then,
 * when all parties have accepted the terms, the WO can be auto-released."*
 * ⚠⚠ **`RELEASED` NO LONGER HAS A HUMAN WRITER. It is what the LAST acceptance
 * produces.**
 *
 * ── ⚠⚠⚠ THIS FILE HAD ALREADY HALF-ARGUED ITS WAY HERE ──────────────────
 * ⚠ Line 727 below, written before the ruling existed: *"BOTH SIDES: the buyer
 * accepts on behalf of someone too."* **The file was built as accept/release and
 * then commented its way toward accept/accept.** The ruling finishes that
 * argument rather than starting a new one.
 *
 * ── ⚠⚠⚠ WHAT THE RULING INVERTED, AND THE GATE WAS RIGHT TO REDDEN ──────
 * ⚠⚠ SUPERSEDED, quoted not deleted (`E164`) — and its FIRST HALF is now WRONG:
 * //   ⚠⚠ **A BUYER MUST NEVER SEE "ACCEPT"; A PROVIDER MUST NEVER SEE "RELEASE."**
 * //   Not "is disabled for" — MUST NOT RENDER. A greyed-out Accept on the buyer's
 * //   screen still tells them the button is theirs to press one day, and it is not:
 * //   accepting is the provider agreeing to terms, and a buyer who could accept on
 * //   their behalf would be signing the provider's side of a SOW.
 *
 * ⚠⚠⚠ **THE BUYER'S ACTION IS NOW ACCEPT.** The old reasoning confused two
 * things: a buyer must not accept **the provider's side**, which remains true and
 * is what the ORDERING enforces — the buyer accepts their OWN side, afterwards,
 * and cannot reach the control until `provider_accepted_at` is set.
 * ⚠ **THE SURVIVING RULE, and it is stronger than what it replaces:** neither
 * party may see an action `canAcceptNow` denies them, and **no party ever sees a
 * Release control, because none exists.**
 *
 * ⚠ SO THE PARTY IS STILL THE FIRST TEST. Each branch returns early and the
 * function ends in `[]`; there is no path by which a party falls through into a
 * state that is not theirs. `check:orders` proves it exhaustively over every
 * status × every party.
 *
 * ⚠ AND IT IS THE SAME FUNCTION THE API REFUSES WITH — `acceptOrder` calls it
 * again server-side, because the route is reachable without loading the page.
 */
export function availableActions(
  order: { status: WorkOrderStatus; provider_accepted_at?: Date | null },
  party: OrderParty
): OrderAction[] {
  return canAcceptNow(order, party) ? ["ACCEPT"] : [];
}

/**
 * ⚠⚠⚠ PREDICATE 1 OF 2 (ruling 43's *"still two, for a simpler reason"*):
 * **ELIGIBILITY.** ⚠ Release is the other, and it lives where the second
 * acceptance lands — *"eligibility and release are different questions and stay
 * in different places"* (`E585`).
 *
 * ⚠⚠ **ORDER IS FIXED: PROVIDER FIRST, THEN BUYER** (ruling 43b). Scott:
 * *"Provider first, then buyer."* ⚠ A buyer cannot accept terms the provider has
 * not accepted — and the status alone does not carry that, which is why this
 * reads `provider_accepted_at` rather than trusting `ACCEPTED` to imply it.
 */
export function canAcceptNow(
  order: { status: WorkOrderStatus; provider_accepted_at?: Date | null },
  party: OrderParty
): boolean {
  if (party === "PROVIDER") {
    /* ⚠ ONLY OUT OF ISSUED. Accepting a DRAFT would be agreeing to terms the
       buyer has not finished writing. */
    return order.status === "ISSUED";
  }
  if (party === "BUYER") {
    /* ⚠⚠ ONLY ONCE THE PROVIDER HAS ACCEPTED, AND ONLY ONCE. ⚠⚠⚠ Both halves
       are checked: the status says where the order is, `provider_accepted_at`
       says the first acceptance actually happened. Trusting the status alone
       would let a hand-set `ACCEPTED` skip the provider entirely. */
    return order.status === "ACCEPTED" && order.provider_accepted_at != null;
  }
  /* ⚠ `NONE` — a viewer who is neither party. No action, ever. */
  return false;
}

/**
 * ⚠⚠⚠ PREDICATE 2 OF 2: **RELEASE. BOTH TIMESTAMPS PRESENT.**
 *
 * ⚠ RULING 43d withdrew the acceptance-rows design outright — *"we are making
 * this too complicated. This is a contract. contracts are always between two
 * parties. let's keep it two acceptances and an auto-release."* ⚠⚠ So there is
 * **no acceptance table, no sequence column, no acceptor queue and no
 * manual-release flag**, and 43c's prohibition on the two-column form is VOID
 * WITH IT: *"THE ROW DESIGN NO LONGER EXISTS, SO THAT PROHIBITION IS VOID. THE
 * TWO-COLUMN FORM IS NOW THE RULING."*
 *
 * ⚠⚠ **DO NOT WRITE AN `allPartiesAccepted` THAT COUNTS ROWS. THERE ARE NO
 * ROWS.** One predicate, one place (`E585`).
 */
export function bothPartiesAccepted(order: {
  provider_accepted_at?: Date | null;
  buyer_accepted_at?: Date | null;
}): boolean {
  return order.provider_accepted_at != null && order.buyer_accepted_at != null;
}

/**
 * One sentence saying what the order is waiting for, for the party looking at it.
 *
 * ⚠⚠⚠ THE STRINGS ARE RULING 43f, VERBATIM. Register throughout: **accept ·
 * terms · contract · parties.** ⚠ Never *release*; never *approve* (approval
 * happened upstream and means something else here); never *confirm*.
 *
 * ⚠⚠⚠ TWO OF THESE ARE LOAD-BEARING AND MUST NOT BE "TIGHTENED" BACK:
 * 1. **The buyer's `ACCEPTED` line says *"Review the terms and accept"*, not just
 *    *"accept"*.** ⚠ That is 43e in the copy: the work order is GENERATED from
 *    the requisition, so the document is new to the buyer. **A buyer told only to
 *    "accept" is being asked to sign something unseen.**
 * 2. ⚠⚠ **`RELEASED` no longer says *"Released —"*. NOBODY RELEASED ANYTHING.**
 *    *"Both parties have accepted"* is the honest sentence for a state with no
 *    presser, and it is what stops the old mental model reappearing in the next
 *    person's copy.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — all three described an act that no
 * longer happens:
 * //   "The provider has accepted. Release the order to allow work and settlements."
 * //   "You have accepted. Waiting for the buyer to release the order."
 * //   "Released — settlements can be raised against this order."
 */
export function activationMessage(status: WorkOrderStatus, party: OrderParty): string {
  switch (status) {
    case "DRAFT":
      return "This order has not been issued yet.";
    case "ISSUED":
      return party === "PROVIDER"
        ? "Review the terms below and accept them to start."
        : "Waiting for the provider to accept the terms.";
    case "ACCEPTED":
      return party === "BUYER"
        ? "The provider has accepted. Review the terms and accept to open the order for settlement."
        : "You have accepted. Waiting for the buyer to accept the terms.";
    case "RELEASED":
    case "ACTIVE":
      return "Both parties have accepted. Settlements can be raised against this order.";
    case "CLOSED":
      return "This order is closed.";
    case "CANCELLED":
      return "This order was cancelled.";
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-3 · THE DRAWDOWN — AND A PART-DRAWN AMOUNT LINE IS UNREPRESENTABLE
   ═════════════════════════════════════════════════════════════════════════ */

export type LineForDrawdown = {
  /* ⚠⚠⚠ `transaction_type` SINCE RULING 44, AND THIS ONE WAS FORCED RATHER THAN
     CHOSEN. ⚠ `WorkOrderLine.basis` was NOT NULL, so a writer had to fill it —
     and the only way to fill it from the requisition was `basisForTransactionType`,
     **the exact bridge ruling 44 deleted.** ⚠⚠ Keeping `basis` live here would
     have re-created the bridge inside the order writer under another name. So the
     column is now nullable, written by nothing, and retires on trunk with
     `WorkRequestLine.basis` — and the live question is asked of
     `transaction_type` through `pricedByQuantity`, the ONE definition of the
     three kinds (ruling 44's `E585` clause).
     ⚠ SUPERSEDED, quoted not deleted (`E164`): //   basis: LineBasis; */
  transaction_type: TransactionType;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
  drawn_quantity?: number | null;
  drawn_amount_cents?: number | null;
};

/**
 * ⚠⚠ TWO SHAPES, BECAUSE THE TWO BASES DRAW DIFFERENTLY, AND THE TYPE IS THE
 * ENFORCEMENT.
 *
 * A `RATE` line draws down by QUANTITY, repeatedly, until the ordered quantity is
 * used up — so it has ordered / drawn / remaining and a percentage.
 *
 * ⚠⚠ AN `AMOUNT` LINE DRAWS **ONCE, IN FULL** (`E388` rule 3), so the AMOUNT
 * variant carries `drawn: boolean` AND NO QUANTITY, NO REMAINING AND NO PERCENT.
 * **A part-drawn amount line cannot exist, so it is not merely "not rendered" —
 * IT CANNOT BE EXPRESSED IN THIS TYPE.** A shared shape with a `percent` field
 * would have let a future caller draw a half-full bar for a state the spine
 * refuses to create, and nobody reviewing that caller would have known.
 */
/* ⚠⚠ THE DISCRIMINANT IS RENAMED `pricedBy`, AND THE RENAME IS THE POINT: a
   property called `basis` that is NOT the `basis` column is precisely the
   comment-contradicts-code trap — the next person reads it as the column and
   writes the column into it. ⚠ `QUANTITY` also says what `RATE` only implied. */
export type Drawdown =
  | {
      pricedBy: "QUANTITY";
      orderedQuantity: number;
      drawnQuantity: number;
      remainingQuantity: number;
      orderedCents: number;
      drawnCents: number;
      remainingCents: number;
      percent: number;
      uom: string;
    }
  | {
      pricedBy: "AMOUNT";
      /** ⚠ Drawn or not. There is no third state. */
      drawn: boolean;
      orderedCents: number;
      drawnCents: number;
      /**
       * ⚠ THE IMPOSSIBLE STATE, SURFACED RATHER THAN DRAWN. `assertSettlementDraw`
       * refuses a partial amount draw, so a row where `drawn_amount_cents` is
       * neither 0 nor the full amount did not come from the settlement path. It is
       * reported as a data fault — NOT rendered as a progress bar, which would
       * make a corruption look like a feature.
       */
      inconsistent: boolean;
    };

export function drawdownFor(line: LineForDrawdown): Drawdown {
  /* ⚠⚠ ASKED ONCE, THROUGH THE SHARED PREDICATE. ⚠ SUPERSEDED, quoted not
     deleted (`E164`): //   line.basis === "RATE" */
  const byQuantity = pricedByQuantity(line.transaction_type);
  const orderedCents = byQuantity
    ? Math.round((line.quantity ?? 0) * (line.unit_price_cents ?? 0))
    : line.amount_cents ?? 0;
  const drawnCents = line.drawn_amount_cents ?? 0;

  if (byQuantity) {
    const orderedQuantity = Number(line.quantity ?? 0);
    const drawnQuantity = Number(line.drawn_quantity ?? 0);
    return {
      pricedBy: "QUANTITY",
      orderedQuantity,
      drawnQuantity,
      /* ⚠ CLAMPED AT ZERO. The spine refuses an overdraw, so a negative remainder
         is a data fault; showing "-8 hours remaining" would invite somebody to
         treat it as a number rather than as a bug. */
      remainingQuantity: Math.max(0, orderedQuantity - drawnQuantity),
      orderedCents,
      drawnCents,
      remainingCents: Math.max(0, orderedCents - drawnCents),
      percent:
        orderedQuantity > 0
          ? Math.min(100, Math.round((drawnQuantity / orderedQuantity) * 100))
          : 0,
      uom: line.uom ?? "hour",
    };
  }
  return {
    pricedBy: "AMOUNT",
    drawn: drawnCents > 0,
    orderedCents,
    drawnCents,
    inconsistent: drawnCents > 0 && drawnCents !== orderedCents,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-2 · WHAT CHANGED — THE DELTA, AND WHAT IT HONESTLY COMPARES
   ═════════════════════════════════════════════════════════════════════════ */

export type TermChange = {
  field: string;
  was: string;
  now: string;
};

/**
 * ⚠⚠ WHAT THE ORDER SAYS VERSUS WHAT THE PROVIDER WAS ASKED TO PRICE.
 *
 * **ERP approvers cut quantities and shorten dates — that is what approval IS.**
 * *"Accept these terms" without showing they moved is how a marketplace loses
 * providers*, so the accept screen names every field that differs.
 *
 * ── ⚠⚠ AND HERE IS THE PART THAT IS NOT WHAT THE BRIEF ASKED FOR ────────────
 *
 * The brief's reason for the delta is *"its terms may differ from WHAT THE
 * PROVIDER BID."* ⚠ **THAT COMPARISON CANNOT BE COMPUTED TODAY AND THIS DOES NOT
 * PRETEND TO.** `WorkOrderLine` carries `work_request_line_id` and **no link of
 * any kind to `ProviderBidLine`** — not on the line, not on the header. `E388`
 * built the order, `E395` built the bid, and **nothing joins the two**, because
 * awarding is `E392`/`E393` territory and no award path exists yet.
 *
 * ⚠ SO THIS COMPARES THE ORDER LINE TO THE **WORK-REQUEST LINE** — what the
 * provider was ASKED to price — and the UI says exactly that in those words. It
 * is a real and substantiated comparison; it is not the bid. **Reported rather
 * than rendered as something it is not.**
 *
 * ⚠ AND IT RETURNS `[]` WHERE THERE IS NO ORIGIN LINE. A DIRECT order has no
 * work request behind it, so there is nothing to diff and the screen says so —
 * it does not show an empty "nothing changed", which would imply a comparison
 * was made.
 */
export function termChanges(
  orderLine: {
    /* ⚠⚠⚠ `transaction_type` ON BOTH SIDES SINCE RULING 44 — and that is the
       whole point of the ruling: *"NOTHING IS LOST BETWEEN APPROVAL AND THE
       ORDER."* ⚠ Before it, the requisition line's three kinds were translated
       down to the order line's two, so a product-by-quantity approved as a
       service-by-quantity showed NO CHANGE on the accept screen — the one screen
       whose entire job is to name what moved.
       ⚠ SUPERSEDED, quoted not deleted (`E164`): //   basis: LineBasis; */
    transaction_type: TransactionType;
    uom?: string | null;
    quantity?: number | null;
    unit_price_cents?: number | null;
    amount_cents?: number | null;
    service_start?: Date | null;
    service_end?: Date | null;
  },
  requestLine: {
    /* ⚠ SUPERSEDED, quoted not deleted (`E164`): //   basis: LineBasis; */
    transaction_type: TransactionType;
    uom?: string | null;
    quantity?: number | null;
    unit_price_cents?: number | null;
    amount_cents?: number | null;
    service_start?: Date | null;
    service_end?: Date | null;
  } | null
): TermChange[] {
  if (!requestLine) return [];
  const out: TermChange[] = [];
  const money = (c?: number | null) => (c == null ? "—" : `${(c / 100).toFixed(2)}`);
  const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
  const num = (n?: number | null) => (n == null ? "—" : String(Number(n)));

  /* ⚠⚠ THE KIND ITSELF CAN NOW CHANGE VISIBLY. ⚠ SUPERSEDED, quoted not deleted
     (`E164`): //   if (orderLine.basis !== requestLine.basis) … was: requestLine.basis */
  if (orderLine.transaction_type !== requestLine.transaction_type)
    out.push({
      field: "Priced by",
      was: requestLine.transaction_type,
      now: orderLine.transaction_type,
    });
  if ((orderLine.uom ?? null) !== (requestLine.uom ?? null))
    out.push({ field: "Unit", was: requestLine.uom ?? "—", now: orderLine.uom ?? "—" });
  if (Number(orderLine.quantity ?? 0) !== Number(requestLine.quantity ?? 0))
    out.push({ field: "Quantity", was: num(requestLine.quantity), now: num(orderLine.quantity) });
  if ((orderLine.unit_price_cents ?? null) !== (requestLine.unit_price_cents ?? null))
    out.push({
      field: "Rate",
      was: money(requestLine.unit_price_cents),
      now: money(orderLine.unit_price_cents),
    });
  if ((orderLine.amount_cents ?? null) !== (requestLine.amount_cents ?? null))
    out.push({
      field: "Amount",
      was: money(requestLine.amount_cents),
      now: money(orderLine.amount_cents),
    });
  if (day(orderLine.service_start) !== day(requestLine.service_start))
    out.push({ field: "Starts", was: day(requestLine.service_start), now: day(orderLine.service_start) });
  if (day(orderLine.service_end) !== day(requestLine.service_end))
    out.push({ field: "Ends", was: day(requestLine.service_end), now: day(orderLine.service_end) });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   READ
   ═════════════════════════════════════════════════════════════════════════ */

export type OrderRow = {
  id: string;
  orderNumber: string;
  origin: WorkOrderOrigin;
  status: WorkOrderStatus;
  /** ⚠ Which side the VIEWER is on — the row renders the other party. */
  party: OrderParty;
  counterpartyName: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  valueCents: number;
  drawnCents: number;
  lineCount: number;
  /** ⚠ DIRECT orders have none, and the row must not imply one. */
  workRequestId: string | null;
  externalRef: string | null;
};

async function namesFor(personIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(personIds)].filter(Boolean);
  if (ids.length === 0) return new Map();
  const people = await prisma.person.findMany({
    where: { id: { in: ids } },
    select: { id: true, first_name: true, last_name: true },
  });
  return new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );
}

/**
 * Every order this person is a party to — **both scopes in one query**.
 *
 * ⚠⚠ THE `OR` IS THE WHOLE OF WS-1. A buyer sees orders they placed, a provider
 * sees orders naming them, and the SAME PERSON sees both sets if they are both —
 * which is a real case on a marketplace where a consultancy buys and sells. Two
 * routes could not have expressed that without asking the user which they meant.
 *
 * ⚠ AND IT IS SCOPED TO THE PERSON, NOT TO A P-ACCOUNT. `scopedToPAccount` is
 * the buyer-side tenancy fence; a provider is not inside the buyer's P-Account
 * and never will be, so scoping this by it would show a provider nothing.
 */
export async function listOrders(viewer: Viewer): Promise<OrderRow[]> {
  const personId = await ownPersonId(viewer);

  const orders = await prisma.workOrder.findMany({
    where: {
      OR: [{ buyer_person_id: personId }, { provider_person_id: personId }],
    },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      order_number: true,
      origin: true,
      status: true,
      buyer_person_id: true,
      provider_person_id: true,
      work_request_id: true,
      external_ref: true,
      period_start: true,
      period_end: true,
      currency: true,
    },
  });
  if (orders.length === 0) return [];

  const lines = await prisma.workOrderLine.findMany({
    where: { work_order_id: { in: orders.map((o) => o.id) } },
    select: {
      work_order_id: true,
      /* ⚠ SUPERSEDED, quoted not deleted (`E164`): //   basis: true, */
      transaction_type: true,
      quantity: true,
      unit_price_cents: true,
      amount_cents: true,
      drawn_amount_cents: true,
    },
  });
  const names = await namesFor(
    orders.flatMap((o) => [o.buyer_person_id, o.provider_person_id])
  );

  const byOrder = new Map<string, typeof lines>();
  for (const l of lines) {
    const list = byOrder.get(l.work_order_id) ?? [];
    list.push(l);
    byOrder.set(l.work_order_id, list);
  }

  return orders.map((o) => {
    const party = partyFor(o, personId);
    const mine = byOrder.get(o.id) ?? [];
    let valueCents = 0;
    let drawnCents = 0;
    for (const l of mine) {
      /* ⚠ ONE PREDICATE, SHARED (ruling 44). SUPERSEDED (`E164`):
         //   l.basis === "RATE" */
      valueCents += pricedByQuantity(l.transaction_type)
        ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))
        : l.amount_cents ?? 0;
      drawnCents += l.drawn_amount_cents ?? 0;
    }
    return {
      id: o.id,
      orderNumber: o.order_number,
      origin: o.origin,
      status: o.status,
      party,
      /* ⚠ THE ROW SHOWS THE OTHER SIDE. A buyer's list of their own name would
         be a list of one word repeated. */
      counterpartyName:
        party === "BUYER"
          ? names.get(o.provider_person_id) ?? "A provider"
          : names.get(o.buyer_person_id) ?? "A buyer",
      periodStart: o.period_start ? o.period_start.toISOString().slice(0, 10) : null,
      periodEnd: o.period_end ? o.period_end.toISOString().slice(0, 10) : null,
      currency: o.currency,
      valueCents,
      drawnCents,
      lineCount: mine.length,
      workRequestId: o.work_request_id,
      externalRef: o.external_ref,
    };
  });
}

export type OrderLineView = {
  id: string;
  lineNumber: number;
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`): //   basis: LineBasis; */
  transactionType: TransactionType;
  description: string;
  uom: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  status: string;
  externalLineRef: string | null;
  drawdown: Drawdown;
  /** ⚠ Empty when there is no originating line — see `termChanges`. */
  changes: TermChange[];
  /** ⚠ Whether a comparison was POSSIBLE at all, which is not the same as "none". */
  hasOrigin: boolean;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  origin: WorkOrderOrigin;
  status: WorkOrderStatus;
  party: OrderParty;
  counterpartyName: string;
  buyerName: string;
  providerName: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  notToExceedCents: number | null;
  feeBps: number;
  externalRef: string | null;
  workRequestId: string | null;
  providerAcceptedAt: string | null;
  buyerReleasedAt: string | null;
  termsVersion: string | null;
  lines: OrderLineView[];
  valueCents: number;
  drawnCents: number;
  actions: OrderAction[];
  activationMessage: string;
  /** ⚠ True when ANY line's terms moved against what was asked. */
  hasChanges: boolean;
};

/**
 * One order, if the viewer is a party to it.
 *
 * ⚠⚠ A NON-PARTY GETS `NOT_FOUND`, NOT `FORBIDDEN`. Telling a stranger that an
 * order id EXISTS but belongs to other people is itself a leak — the same
 * reasoning `/work-requests/[id]` follows.
 */
export async function getOrderDetail(viewer: Viewer, id: string): Promise<OrderDetail> {
  const personId = await ownPersonId(viewer);

  const o = await prisma.workOrder.findFirst({
    where: {
      id,
      OR: [{ buyer_person_id: personId }, { provider_person_id: personId }],
    },
  });
  if (!o) throw new OrderError("Work order not found", "NOT_FOUND");

  const party = partyFor(o, personId);
  const lines = await prisma.workOrderLine.findMany({
    where: { work_order_id: o.id },
    orderBy: { line_number: "asc" },
  });

  /* ⚠ THE ORIGIN LINES IN ONE QUERY, not one per line. Only for the lines that
     name one — a DIRECT order asks for nothing here. */
  const originIds = lines
    .map((l) => l.work_request_line_id)
    .filter((x): x is string => !!x);
  const originLines = originIds.length
    ? await prisma.workRequestLine.findMany({
        where: { id: { in: originIds } },
        select: {
          id: true,
          /* ⚠⚠ THE REQUISITION LINE'S LIVE FIELD IS `transaction_type` since
             `E621` (ruling 37b). ⚠ `basis` is retained beside it and NULLABLE
             so trunk's readers keep working, so selecting it here would compare
             an order line against a column nothing writes any more.
             ⚠⚠⚠ NO LONGER TRANSLATED (ruling 44) — the ORDER line carries
             `transaction_type` too, so this is compared directly.
             ⚠ SUPERSEDED, quoted not deleted (`E164`):
             //   ⚠⚠⚠ Translated at the boundary by `basisForTransactionType`, which
             //   is the ONE bridge between the two enums while both exist. */
          transaction_type: true,
          uom: true,
          quantity: true,
          unit_price_cents: true,
          amount_cents: true,
          service_start: true,
          service_end: true,
        },
      })
    : [];
  const originById = new Map(originLines.map((l) => [l.id, l]));
  const names = await namesFor([o.buyer_person_id, o.provider_person_id]);

  const views: OrderLineView[] = lines.map((l) => {
    const origin = l.work_request_line_id ? originById.get(l.work_request_line_id) ?? null : null;
    return {
      id: l.id,
      lineNumber: l.line_number,
      transactionType: l.transaction_type,
      description: l.description,
      uom: l.uom,
      quantity: l.quantity == null ? null : Number(l.quantity),
      unitPriceCents: l.unit_price_cents,
      amountCents: l.amount_cents,
      serviceStart: l.service_start ? l.service_start.toISOString().slice(0, 10) : null,
      serviceEnd: l.service_end ? l.service_end.toISOString().slice(0, 10) : null,
      status: l.status,
      externalLineRef: l.external_line_ref,
      drawdown: drawdownFor({
        transaction_type: l.transaction_type,
        uom: l.uom,
        quantity: l.quantity == null ? null : Number(l.quantity),
        unit_price_cents: l.unit_price_cents,
        amount_cents: l.amount_cents,
        drawn_quantity: l.drawn_quantity == null ? null : Number(l.drawn_quantity),
        drawn_amount_cents: l.drawn_amount_cents,
      }),
      changes: termChanges(
        {
          transaction_type: l.transaction_type,
          uom: l.uom,
          quantity: l.quantity == null ? null : Number(l.quantity),
          unit_price_cents: l.unit_price_cents,
          amount_cents: l.amount_cents,
          service_start: l.service_start,
          service_end: l.service_end,
        },
        origin
          ? {
              /* ⚠⚠⚠ READ, NOT TRANSLATED — ruling 44. Both sides carry
                 `transaction_type`, so the comparison is between two values of
                 ONE enum. ⚠ SUPERSEDED, quoted not deleted (`E164`):
                 //   ⚠⚠ TRANSLATED, NOT READ… `basis` beside it is retained and
                 //   nullable, and reading it here would compare against a column
                 //   nothing writes any more.
                 //   basis: basisForTransactionType(origin.transaction_type), */
              transaction_type: origin.transaction_type,
              uom: origin.uom,
              quantity: origin.quantity == null ? null : Number(origin.quantity),
              unit_price_cents: origin.unit_price_cents,
              amount_cents: origin.amount_cents,
              service_start: origin.service_start,
              service_end: origin.service_end,
            }
          : null
      ),
      hasOrigin: !!origin,
    };
  });

  let valueCents = 0;
  let drawnCents = 0;
  for (const v of views) {
    valueCents += v.drawdown.orderedCents;
    drawnCents += v.drawdown.drawnCents;
  }

  return {
    id: o.id,
    orderNumber: o.order_number,
    origin: o.origin,
    status: o.status,
    party,
    counterpartyName:
      party === "BUYER"
        ? names.get(o.provider_person_id) ?? "A provider"
        : names.get(o.buyer_person_id) ?? "A buyer",
    buyerName: names.get(o.buyer_person_id) ?? "A buyer",
    providerName: names.get(o.provider_person_id) ?? "A provider",
    currency: o.currency,
    periodStart: o.period_start ? o.period_start.toISOString().slice(0, 10) : null,
    periodEnd: o.period_end ? o.period_end.toISOString().slice(0, 10) : null,
    notToExceedCents: o.not_to_exceed_cents,
    feeBps: o.fee_bps,
    externalRef: o.external_ref,
    workRequestId: o.work_request_id,
    providerAcceptedAt: o.provider_accepted_at ? o.provider_accepted_at.toISOString() : null,
    buyerReleasedAt: o.buyer_released_at ? o.buyer_released_at.toISOString() : null,
    termsVersion: o.terms_version,
    lines: views,
    valueCents,
    drawnCents,
    /* ⚠⚠ THE ACTIONS COME FROM THE ONE FUNCTION, SERVER-SIDE, AND THE PAGE
       RENDERS NOTHING THAT IS NOT IN THIS ARRAY. */
    actions: availableActions(o, party),
    activationMessage: activationMessage(o.status, party),
    hasChanges: views.some((v) => v.changes.length > 0),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WRITE — THE TWO ACTIVATION EVENTS, EACH REFUSED FOR THE WRONG PARTY
   ═════════════════════════════════════════════════════════════════════════ */

async function loadParty(viewer: Viewer, id: string) {
  const personId = await ownPersonId(viewer);
  const order = await prisma.workOrder.findFirst({
    where: {
      id,
      OR: [{ buyer_person_id: personId }, { provider_person_id: personId }],
    },
    select: {
      id: true,
      status: true,
      buyer_person_id: true,
      provider_person_id: true,
      /*
        ⚠⚠⚠ ADDED BY RULING 43, AND ITS ABSENCE WAS A REAL BUG FOR EXACTLY ONE
        RUN OF THE GATE. `canAcceptNow` reads `provider_accepted_at` to enforce
        43b's ordering — **and without it in this select the column arrived
        `undefined`, so the BUYER'S ARM WAS ALWAYS FALSE AND `RELEASED` WAS
        UNREACHABLE.** ⚠⚠ The refusal looked correct from the outside (a buyer
        being told to wait for the provider is the right sentence) which is
        precisely why only a walk to RELEASED could catch it.
        ⚠ A predicate that reads a field its loader does not fetch is the
        `E585` family seen from the data side.
      */
      provider_accepted_at: true,
    },
  });
  if (!order) throw new OrderError("Work order not found", "NOT_FOUND");
  return { order, party: partyFor(order, personId) };
}

/**
 * ⚠⚠ THE PROVIDER ACCEPTS. THE BOUNDARY, NOT THE BUTTON.
 *
 * ── ⚠⚠ TODO (`P1-A1.4-E418`): THIS IS THE SINGLE COMPANY CAPTURE POINT ───────
 *
 * **SCOTT, 2026-09-11:** *"For ALL users (buyers and sellers) we will get their
 * company information during the work order acceptance. IF you are going to
 * accept the WO... on behalf of whom?"* And: *"Regarding the company… strip it
 * all out."*
 *
 * ⚠ `E418` REMOVED THE COMPANY FROM EVERY REGISTRATION PATHWAY — provider,
 * recruiter, requester and buyer — and from every gate that stood in front of
 * community, learning, search, connecting, work requests and service products.
 * A company is asked for EXACTLY ONCE, HERE, and this function does not ask for
 * it yet. ⚠⚠ THE GATE IS NOT BUILT. That is deliberate, not an oversight:
 * `WorkRequest` rows numbered ZERO when `E418` shipped and nothing issues a work
 * order, so a gate written now would guard an event that never fires while
 * looking like an enforced rule — the failure mode `requester-onboarding.ts`
 * records at length. ⚠ DO NOT PUT IT ANYWHERE EARLIER TO MAKE IT REACHABLE.
 *
 * WHY HERE AND NOT AT THE WORK REQUEST: a seller's first sight of a buyer is the
 * request, but a request is a QUESTION. Acceptance is where a counterparty
 * obligation begins, and it is the moment the ERP path already has a company
 * name — the PO. The two paths have to agree on when a buyer becomes a company.
 *
 * WHAT IT SHOULD COLLECT, and what is already on disk to do it with (`E164`):
 *   · `components/company/CompanyStep.tsx` — the whole form, unrouted since
 *     `E418`: name, the define/join outcome, the attestation, the company ToS.
 *   · `defineCompany` / `joinCompany` (`lib/company.ts`) — the only writers of
 *     `CompanyMembership`, untouched.
 *   · `verifyTransactAbility` (`lib/access.ts`) + `TRANSACT_MESSAGE` — the gate
 *     itself, with `NO_COMPANY` / `PENDING_APPROVAL` / `REJECTED` /
 *     `COMPANY_TOS`, now called by nothing. Re-point `checkTransact` at it, or
 *     call it directly from this function.
 *   · `Company.tin` (EIN, `E273`) and the registered `Site`/`Address` (`E280`) —
 *     the columns `P1-J1.1-E274` says a work order needs before it is a legal
 *     document. ⚠ BOTH SIDES: the buyer accepts on behalf of someone too, so the
 *     buyer's capture belongs on the ISSUE/RELEASE half, not only here.
 *
 * ⚠ IT ASKS `availableActions` RATHER THAN RE-TESTING THE PARTY AND THE STATUS.
 * Re-testing here would be a second definition of the rule, and the second
 * definition is the one that gets a special case added to it six months later.
 *
 * ⚠ THE WRITE IS CONDITIONAL ON THE STATUS IT READ. `updateMany` scoped to
 * `{ id, status: "ISSUED" }` means two clicks race to one winner, and the loser
 * changes nothing rather than stamping a second `provider_accepted_at`.
 */
export async function acceptOrder(viewer: Viewer, id: string): Promise<OrderDetail> {
  const { order, party } = await loadParty(viewer, id);
  if (!canAcceptNow(order, party))
    throw new OrderError(
      /* ⚠⚠ THE REFUSAL NAMES WHAT IS ACTUALLY WRONG, AND AFTER RULING 43 THAT IS
         NO LONGER "you are the wrong party" — both parties accept. ⚠ A buyer
         arriving early is waiting for the provider, not forbidden forever.
         ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   party === "BUYER" ? "Only the provider can accept a work order" : … */
      party === "NONE"
        ? "This order isn't yours"
        : party === "BUYER" && order.status === "ISSUED"
          ? "The provider hasn't accepted the terms yet"
          : "This order is not waiting for your acceptance",
      party === "NONE" ? "FORBIDDEN" : "INVALID"
    );

  /*
    ⚠⚠⚠ ONE WRITE PER PARTY, EACH CONDITIONAL ON THE STATUS IT READ. `updateMany`
    scoped to the status means two clicks race to one winner and the loser changes
    nothing rather than stamping a second timestamp.
  */
  if (party === "PROVIDER") {
    await prisma.workOrder.updateMany({
      where: { id: order.id, status: "ISSUED" },
      data: { status: "ACCEPTED", provider_accepted_at: new Date() },
    });
    return getOrderDetail(viewer, id);
  }

  /*
    ── ⚠⚠⚠ THE SECOND ACCEPTANCE AUTO-RELEASES (ruling 43a) ────────────────
    ⚠ `RELEASED` is written HERE, where the second acceptance lands, and nowhere
    else — *"it is not a third party's decision and it is not a button."*
    ⚠⚠ THE GUARD IS `provider_accepted_at: { not: null }` IN THE `where`, not a
    re-read: the first acceptance must be a FACT in the row at the moment this
    write commits, or the buyer's acceptance does not land at all. A check-then-
    write would be a race, and the race would release an order the provider never
    accepted.
  */
  const now = new Date();
  const done = await prisma.workOrder.updateMany({
    where: { id: order.id, status: "ACCEPTED", provider_accepted_at: { not: null } },
    data: { status: "RELEASED", buyer_accepted_at: now },
  });
  if (done.count === 0) {
    throw new OrderError("This order is not waiting for your acceptance", "INVALID");
  }
  /* ⚠ And the invariant holds by construction: the row now carries both
     timestamps, which is exactly what `bothPartiesAccepted` reads. */
  return getOrderDetail(viewer, id);
}

/*
  ── ⚠⚠⚠ `releaseOrder` IS GONE — RULING 43. QUOTED, NOT DELETED (`E164`). ─

  ⚠⚠ **AUTO-RELEASE REPLACED IT.** `RELEASED` is now produced by the buyer's
  ACCEPTANCE inside `acceptOrder` above, so there is no release action, no release
  button and no release writer. ⚠ Ruling 43: *"`RELEASED` stops having a human
  writer. It is what the LAST acceptance produces."*

  ⚠⚠ `/api/orders/[id]/release/route.ts` HAS NO CALLER AFTER THIS, and ruling 43
  says to quote it rather than delete it — see the note in that file.

  ⚠ The function as it stood:
  //   ⚠⚠ THE BUYER RELEASES, AND ONLY AFTER THE PROVIDER HAS ACCEPTED.
  //   ⚠ RELEASE IS WHAT OPENS SETTLEMENT. `E388`'s `assertSettlementDraw` is the
  //   other half; this is the gate in front of it, and collapsing the two events
  //   would let a buyer issue and release in one motion against terms nobody agreed
  //   to.
  //
  //   export async function releaseOrder(viewer: Viewer, id: string): Promise<OrderDetail> {
  //     const { order, party } = await loadParty(viewer, id);
  //     if (!availableActions(order, party).includes("RELEASE"))
  //       throw new OrderError(
  //         party === "PROVIDER"
  //           ? "Only the buyer can release a work order"
  //           : "This order is not waiting to be released",
  //         party === "PROVIDER" ? "FORBIDDEN" : "INVALID"
  //       );
  //     await prisma.workOrder.updateMany({
  //       where: { id: order.id, status: "ACCEPTED" },
  //       data: { status: "RELEASED", buyer_released_at: new Date() },
  //     });
  //     return getOrderDetail(viewer, id);
  //   }
*/
