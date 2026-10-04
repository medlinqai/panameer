import { TransactionType, WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { feeSplit, pricedByQuantity } from "@/lib/transaction-spine";
import type { Viewer } from "@/lib/access";

export class OrderError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
    this.name = "OrderError";
  }
}

async function ownPersonId(viewer: Viewer): Promise<string> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OrderError("This account has no person record", "NOT_FOUND");
  return person.id;
}

export type OrderParty = "BUYER" | "PROVIDER" | "NONE";

export function partyFor(
  order: { buyer_person_id: string; provider_person_id: string },
  personId: string
): OrderParty {
  if (personId && order.buyer_person_id === personId) return "BUYER";
  if (personId && order.provider_person_id === personId) return "PROVIDER";
  return "NONE";
}

export type OrderAction = "ACCEPT";

export function availableActions(
  order: { status: WorkOrderStatus; provider_accepted_at?: Date | null },
  party: OrderParty
): OrderAction[] {
  return canAcceptNow(order, party) ? ["ACCEPT"] : [];
}

export function canAcceptNow(
  order: { status: WorkOrderStatus; provider_accepted_at?: Date | null },
  party: OrderParty
): boolean {
  if (party === "PROVIDER") {
    return order.status === "ISSUED";
  }
  if (party === "BUYER") {
    return order.status === "ACCEPTED" && order.provider_accepted_at != null;
  }
  return false;
}

export function bothPartiesAccepted(order: {
  provider_accepted_at?: Date | null;
  buyer_accepted_at?: Date | null;
}): boolean {
  return order.provider_accepted_at != null && order.buyer_accepted_at != null;
}

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

export type LineForDrawdown = {
  transaction_type: TransactionType;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
  drawn_quantity?: number | null;
  drawn_amount_cents?: number | null;
};

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
      drawn: boolean;
      orderedCents: number;
      drawnCents: number;
      inconsistent: boolean;
    };

export function drawdownFor(line: LineForDrawdown): Drawdown {
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

export type TermChange = {
  field: string;
  was: string;
  now: string;
};

export function termChanges(
  orderLine: {
    transaction_type: TransactionType;
    uom?: string | null;
    quantity?: number | null;
    unit_price_cents?: number | null;
    amount_cents?: number | null;
    service_start?: Date | null;
    service_end?: Date | null;
  },
  requestLine: {
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
  feeBps: number;
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
  /* ⚠⚠ NULLABLE SINCE `P2-A15-E696` WS-C: the fee is stamped per LINE now, and
     the header rate is `null` when an order mixes sourcing kinds. ⚠ A reader
     that wants the money must go to the lines; this is the convenience value and
     it knows when to say nothing. */
  feeBps: number | null;
  externalRef: string | null;
  sowText: string | null;
  workRequestId: string | null;
  providerAcceptedAt: string | null;
  buyerReleasedAt: string | null;
  termsVersion: string | null;
  lines: OrderLineView[];
  valueCents: number;
  drawnCents: number;
  /** Provider fee on the order value, summed from each line's own rate. */
  feeCents: number;
  netCents: number;
  /** One rate when every line shares it, else null ("by line"). */
  lineFeeBps: number | null;
  /** R1 money position: hours ordered/claimed, approved and buyer-paid dollars, and what is left under the cap. */
  hoursOrdered: number;
  hoursClaimed: number;
  approvedCents: number;
  paidCents: number;
  remainingCents: number;
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
      feeBps: l.fee_bps,
    };
  });

  let valueCents = 0;
  let drawnCents = 0;
  let feeCents = 0;
  for (const v of views) {
    valueCents += v.drawdown.orderedCents;
    drawnCents += v.drawdown.drawnCents;
    feeCents += feeSplit(v.drawdown.orderedCents, v.feeBps).fee_cents;
  }
  const rates = [...new Set(views.map((v) => v.feeBps))];
  const hourLines = lines.filter((l) => pricedByQuantity(l.transaction_type) && (l.uom ?? "HOUR").toUpperCase().startsWith("HOUR"));
  const hoursOrdered = hourLines.reduce((n, l) => n + Number(l.quantity ?? 0), 0);
  const hoursClaimed = hourLines.reduce((n, l) => n + Number(l.drawn_quantity ?? 0), 0);
  const decided = await prisma.settlementRequest.findMany({
    where: { work_order_id: o.id, status: { in: ["APPROVED", "PAID"] } },
    select: { id: true, lines: { select: { basis: true, quantity: true, unit_price_cents: true, amount_cents: true } } },
  });
  const approvedCents = decided.reduce(
    (n, s) => n + s.lines.reduce((m, l) => m + (l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0), 0),
    0
  );
  const paidAgg = await prisma.paymentLine.aggregate({ where: { settlement_request_id: { in: decided.map((s) => s.id) } }, _sum: { amount_cents: true } });

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
    sowText: o.sow_text,
    workRequestId: o.work_request_id,
    providerAcceptedAt: o.provider_accepted_at ? o.provider_accepted_at.toISOString() : null,
    buyerReleasedAt: o.buyer_released_at ? o.buyer_released_at.toISOString() : null,
    termsVersion: o.terms_version,
    lines: views,
    valueCents,
    drawnCents,
    feeCents,
    netCents: valueCents - feeCents,
    lineFeeBps: rates.length === 1 ? rates[0] : null,
    hoursOrdered,
    hoursClaimed,
    approvedCents,
    paidCents: paidAgg._sum.amount_cents ?? 0,
    remainingCents: Math.max(0, (o.not_to_exceed_cents ?? valueCents) - approvedCents),
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
  /*
    ── ⚠⚠⚠ THE ONBOARDING REQUEST IS RAISED IN THE SAME TRANSACTION (`P2-A8-E704` WS-A)

    ⚠⚠ **RULING 93h: `Work Order` → provider accepts → requester accepts → `Onboarding
    Request`.** This is the only place in the codebase where the second acceptance lands, so
    it is the only place the record can be raised.

    ⚠⚠⚠ **BOTH OR NEITHER, AND THAT IS THE POINT OF THE TRANSACTION: A RELEASED ORDER WITH
    NO ONBOARDING REQUEST IS A SIGNED CONTRACT WITH NOTHING RAISED AGAINST IT — a half state
    nobody would notice until somebody went looking for the onboarding.**
    ⚠ **THE `updateMany` GUARD IS UNCHANGED AND STILL DOES THE RACE WORK:** the first
    acceptance must be a FACT in the row at the moment this commits. The transaction adds
    atomicity with the new row; it does not replace the guard, and a check-then-write here
    would still be the race ruling 43a's comment warns about.
    ⚠⚠ **`work_order_id` IS `@unique`, SO A RETRY CANNOT RAISE A SECOND ONE** — and it
    cannot even reach the create, because a retried release reads `status: "ACCEPTED"` and
    matches nothing.
    ⚠ **NOTHING IS SENT. WS-B IS NOT BUILT** because nothing names *"the onboarding
    application"* — no env var, no route, no service, no client, measured 2026-09-29.
    ⚠⚠⚠ **SO THE ROW IS THE WHOLE FEATURE TODAY, AND THAT IS DELIBERATE: THE RECORD EXISTS
    BEFORE THE REQUEST, WHICH IS RULING 86's LESSON FROM `sendEmail` — it returned
    success-shaped when it refused, and `email_sent_at` was stamped on mail nobody received.**
  */
  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.workOrder.updateMany({
      where: { id: order.id, status: "ACCEPTED", provider_accepted_at: { not: null } },
      data: { status: "RELEASED", buyer_accepted_at: now },
    });
    if (moved.count === 0) return moved;
    await tx.onboardingRequest.create({
      data: {
        onboarding_request_number: `ONB-${Date.now().toString(36).toUpperCase()}-${order.id.slice(0, 4)}`,
        work_order_id: order.id,
        /* ⚠ Both parties copied from the order that was agreed, never re-read later. */
        provider_person_id: order.provider_person_id,
        buyer_person_id: order.buyer_person_id,
        raised_at: now,
      },
    });
    return moved;
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

/** The buyer closes a released order: no more payment requests can be raised against it. */
export async function closeOrder(viewer: Viewer, id: string): Promise<OrderDetail> {
  const { order, party } = await loadParty(viewer, id);
  if (party !== "BUYER") throw new OrderError("Only the buyer can close this work order", "FORBIDDEN");
  if (order.status !== "RELEASED" && order.status !== "ACTIVE")
    throw new OrderError("Only a released work order can be closed", "INVALID");
  const waiting = await prisma.settlementRequest.count({ where: { work_order_id: id, status: "SUBMITTED" } });
  if (waiting > 0)
    throw new OrderError(`Decide the ${waiting} payment request${waiting === 1 ? "" : "s"} waiting on you first`, "INVALID");
  await prisma.workOrder.updateMany({ where: { id, status: { in: ["RELEASED", "ACTIVE"] } }, data: { status: "CLOSED" } });
  return getOrderDetail(viewer, id);
}

/** Closes an order once the buyer has paid everything it can be billed for (cap, or value when uncapped). */
export async function closeIfFullyPaid(orderId: string): Promise<boolean> {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!o || (o.status !== "RELEASED" && o.status !== "ACTIVE")) return false;
  const value = o.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
  const cap = o.not_to_exceed_cents ?? value;
  const requests = await prisma.settlementRequest.findMany({ where: { work_order_id: orderId }, select: { id: true, status: true } });
  if (requests.some((r) => r.status === "SUBMITTED" || r.status === "APPROVED")) return false;
  const paid = await prisma.paymentLine.aggregate({ where: { settlement_request_id: { in: requests.map((r) => r.id) } }, _sum: { amount_cents: true } });
  if ((paid._sum.amount_cents ?? 0) < cap || cap <= 0) return false;
  const done = await prisma.workOrder.updateMany({ where: { id: orderId, status: { in: ["RELEASED", "ACTIVE"] } }, data: { status: "CLOSED" } });
  return done.count === 1;
}
