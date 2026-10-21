import { nextNumber } from "@/lib/numbering";
import { formatCents } from "@/lib/display";
import { dueDate } from "@/lib/billing-terms";
import { queueWorkConfirmation } from "@/lib/erp/settlement";
import { notify } from "@/lib/notifications";
import { LineBasis, Prisma, PaymentRequestStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  assertSettlementDraw,
  feeSplit,
  priceSettlementLine,
  pricedByQuantity,
  type DraftSettlementLine,
  type OrderLineForDraw,
} from "@/lib/transaction-spine";
import { BILLABLE, getOrderDetail, listOrders, OrderError, PAYABLE, type OrderParty } from "@/lib/orders";

export class SettlementError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
    this.name = "SettlementError";
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WHAT CAN BE SETTLED — AND WHAT TO SAY WHEN NOTHING CAN
   ═════════════════════════════════════════════════════════════════════════ */

export type SettleableOrder = {
  id: string;
  orderNumber: string;
  counterpartyName: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  valueCents: number;
  drawnCents: number;
};

/** The RELEASED orders this provider can raise a settlement against. */
export async function settleableOrdersFor(viewer: Viewer): Promise<SettleableOrder[]> {
  const orders = await listOrders(viewer);
  return orders
    .filter((o) => o.party === "PROVIDER" && BILLABLE.includes(o.status))
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      counterpartyName: o.counterpartyName,
      periodStart: o.periodStart,
      periodEnd: o.periodEnd,
      currency: o.currency,
      valueCents: o.valueCents,
      drawnCents: o.drawnCents,
    }));
}

export type SettleLineOption = {
  workOrderLineId: string;
  lineNumber: number;
  transactionType: TransactionType;
  description: string;
  uom: string | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  /** RATE only — what is left to draw. Straight from `E393`'s drawdown. */
  remainingQuantity: number | null;
  /** AMOUNT only — fully drawn; it cannot appear again. */
  alreadyDrawn: boolean;
  /** AMOUNT only — what's left to draw down (O-E005). */
  remainingCents: number | null;
  /** False when there is nothing left to claim on this line. */
  claimable: boolean;
};

export type SettleForm = {
  orderId: string;
  orderNumber: string;
  currency: string;
  buyerName: string;
  /** The period the settlement must sit inside — `E388` rule 5. */
  orderPeriodStart: string | null;
  orderPeriodEnd: string | null;
  notToExceedCents: number | null;
  alreadySettledCents: number;
  lines: SettleLineOption[];
};

/** Everything the create screen needs, for one order. */
export async function settleFormFor(viewer: Viewer, orderId: string): Promise<SettleForm> {
  const o = await getOrderDetail(viewer, orderId);

  // ONLY THE PROVIDER RAISES A SETTLEMENT. A buyer reaching this URL is not
  if (o.party !== "PROVIDER")
    throw new SettlementError("Only the provider on this order can raise a payment request", "FORBIDDEN");
  if (!BILLABLE.includes(o.status))
    throw new SettlementError(
      o.status === "ON_HOLD" ? "This work order is on hold. Payment requests wait until the customer releases the hold." : "A payment request can only be raised against an open or closed work order",
      "INVALID"
    );

  const alreadySettledCents = await settledCentsFor(orderId);

  return {
    orderId: o.id,
    orderNumber: o.orderNumber,
    currency: o.currency,
    buyerName: o.buyerName,
    orderPeriodStart: o.periodStart,
    orderPeriodEnd: o.periodEnd,
    notToExceedCents: o.notToExceedCents,
    alreadySettledCents,
    lines: o.lines.map((l) => {
      const d = l.drawdown;
      return {
        workOrderLineId: l.id,
        lineNumber: l.lineNumber,
        transactionType: l.transactionType,
        description: l.description,
        uom: l.uom,
        unitPriceCents: l.unitPriceCents,
        amountCents: l.amountCents,
        // ASKED OF THE DRAWDOWN, WHICH ALREADY ANSWERED IT — no second
        remainingQuantity: d.pricedBy === "QUANTITY" ? d.remainingQuantity : null,
        alreadyDrawn: d.pricedBy === "AMOUNT" ? d.drawn : false,
        remainingCents: d.pricedBy === "AMOUNT" ? d.remainingCents : null,
        // A RATE line with nothing left, or an AMOUNT line already drawn, is
        claimable: d.pricedBy === "QUANTITY" ? d.remainingQuantity > 0 : !d.drawn,
      };
    }),
  };
}

/** Cents already settled against this order, for `E388`'s rule 4 (not-to-exceed). */
async function settledCentsFor(orderId: string, db: Prisma.TransactionClient = prisma): Promise<number> {
  const rows = await db.paymentRequestLine.findMany({
    where: {
      paymentRequest: {
        work_order_id: orderId,
        // A REJECTED SETTLEMENT DOES NOT CONSUME THE CAP. It was refused, so
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "PAID"] },
      },
    },
    // THIS QUERY IS OVER `SettlementLine`, NOT `WorkOrderLine` — and the
    select: { basis: true, quantity: true, unit_price_cents: true, amount_cents: true },
  });
  let cents = 0;
  for (const r of rows)
    cents +=
      r.basis === "RATE"
        ? Math.round(Number(r.quantity ?? 0) * (r.unit_price_cents ?? 0))
        : r.amount_cents ?? 0;
  return cents;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE ONE CREATE PATH
   ═════════════════════════════════════════════════════════════════════════ */

export type SettleLineInput = {
  workOrderLineId: string;
  /** RATE only — the day. A timesheet row IS a service date plus hours. */
  serviceDate?: string | null;
  /** RATE only — hours (or whatever the line's UOM is). */
  quantity?: number | null;
  /** AMOUNT only — the draw-down; omitted means what's left. */
  amountCents?: number | null;
  note?: string | null;
};

export type SettleInput = {
  periodStart: string;
  periodEnd: string;
  lines: SettleLineInput[];
  /** A REJECTED request on the same order that this one replaces. */
  resubmitsId?: string | null;
};

/** THE ONE CREATE PATH, SERVING BOTH RENDERINGS. */
export async function createSettlement(
  viewer: Viewer,
  orderId: string,
  input: SettleInput
): Promise<SettlementDetail> {
  const o = await getOrderDetail(viewer, orderId);
  if (o.party !== "PROVIDER")
    throw new SettlementError("Only the provider on this order can raise a payment request", "FORBIDDEN");

  if (!input.periodStart || !input.periodEnd)
    throw new SettlementError("A payment request needs a period", "INVALID");
  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);

  let resubmitsId: string | null = null;
  if (input.resubmitsId) {
    const prev = await prisma.paymentRequest.findUnique({ where: { id: input.resubmitsId }, select: { id: true, work_order_id: true, status: true } });
    if (!prev || prev.work_order_id !== o.id) throw new SettlementError("That request is not on this work order", "INVALID");
    if (prev.status !== "REJECTED") throw new SettlementError("Only a sent-back request can be resubmitted", "INVALID");
    if (await prisma.paymentRequest.count({ where: { resubmits_id: prev.id } }))
      throw new SettlementError("That request has already been resubmitted", "INVALID");
    resubmitsId = prev.id;
  }

  const rows = (input.lines ?? []).filter((l) => l.workOrderLineId);
  // O-E004: a service line bills per cycle, so its period must have ended.
  const today = new Date(new Date().toISOString().slice(0, 10) + "T23:59:59Z");
  const cycled = rows.some((r) => o.lines.find((l) => l.id === r.workOrderLineId)?.billingCycle);
  if (cycled && periodEnd > today) throw new SettlementError("A service payment request covers a billing period that has ended. Pick an end date of today or earlier.", "INVALID");
  // WS-E006: a Retainer settles one billing cycle per payment request.
  const style = (await prisma.workOrder.findUnique({ where: { id: o.id }, select: { style: true } }))?.style;
  if (style === "RETAINER") {
    const cycle = rows.map((r) => o.lines.find((l) => l.id === r.workOrderLineId)?.billingCycle).find(Boolean);
    const maxDays = cycle === "WEEKLY" ? 7 : cycle === "BIWEEKLY" ? 14 : cycle === "EVERY_90_DAYS" ? 92 : 31;
    if ((periodEnd.getTime() - periodStart.getTime()) / 86_400_000 > maxDays)
      throw new SettlementError(`A Retainer payment request covers one billing cycle (up to ${maxDays} days). Split it into one request per cycle.`, "INVALID");
  }
  if (rows.length === 0)
    throw new SettlementError("Add at least one line to this payment request", "INVALID");

  const orderLineById = new Map(o.lines.map((l) => [l.id, l]));
  for (const r of rows)
    if (!orderLineById.has(r.workOrderLineId))
      throw new SettlementError("That line is not on this work order", "NOT_FOUND");

  // THE AGGREGATION — see the docblock. One draft per ORDER LINE, carrying
  const byOrderLine = new Map<string, { quantity: number; count: number; amountCents: number | null }>();
  for (const r of rows) {
    const cur = byOrderLine.get(r.workOrderLineId) ?? { quantity: 0, count: 0, amountCents: null };
    cur.quantity += Number(r.quantity ?? 0);
    cur.count += 1;
    if (r.amountCents != null) cur.amountCents = Math.round(Number(r.amountCents));
    byOrderLine.set(r.workOrderLineId, cur);
  }

  const drafts: { draft: DraftSettlementLine; orderLine: OrderLineForDraw }[] = [];
  for (const [workOrderLineId, agg] of byOrderLine) {
    const ol = orderLineById.get(workOrderLineId)!;
    // THE ONE TRANSLATION LEFT, AND IT IS REPORTED, NOT HIDDEN
    const settlementBasis: LineBasis = pricedByQuantity(ol.transactionType)
      ? "RATE"
      : "AMOUNT";
    const byQuantity = pricedByQuantity(ol.transactionType);
    const orderLine: OrderLineForDraw = {
      id: ol.id,
      basis: settlementBasis,
      uom: ol.uom,
      quantity: ol.quantity,
      unit_price_cents: ol.unitPriceCents,
      amount_cents: ol.amountCents,
      drawn_quantity: ol.drawdown.pricedBy === "QUANTITY" ? ol.drawdown.drawnQuantity : 0,
      drawn_amount_cents: ol.drawdown.drawnCents,
    };
    // AN AMOUNT LINE MAY NOT BE SPLIT ACROSS ROWS — it claims once, in full
    if (!byQuantity && agg.count > 1)
      throw new SettlementError(
        "An amount line is claimed on one row per payment request",
        "INVALID"
      );
    drafts.push({
      draft: {
        work_order_line_id: workOrderLineId,
        basis: settlementBasis,
        // NO PRICE IS SUPPLIED. `priceSettlementLine` REFUSES a supplied one
        quantity: byQuantity ? agg.quantity : null,
        amount_cents: byQuantity ? null : agg.amountCents,
      },
      orderLine,
    });
  }

  const submittedAt = new Date();
  // WN-E002: a payment request goes to the buyer straight away; payout details are checked only at the payout.
  const held = false;
  // THE SPINE'S FIVE RULES, RUN AS ONE. Nothing above re-implements them —
  // Check and draw in one transaction, with the order row locked, so two requests cannot both pass the cap.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM work_orders WHERE id = ${o.id}::uuid FOR UPDATE`;
    const fresh = await tx.workOrder.findUniqueOrThrow({ where: { id: o.id }, select: { status: true } });
    const freshLines = new Map(
      (await tx.workOrderLine.findMany({ where: { work_order_id: o.id }, select: { id: true, drawn_quantity: true, drawn_amount_cents: true } })).map((l) => [l.id, l])
    );
    for (const d of drafts) {
      const fl = freshLines.get(d.orderLine.id);
      if (fl) {
        d.orderLine.drawn_quantity = fl.drawn_quantity == null ? 0 : Number(fl.drawn_quantity);
        d.orderLine.drawn_amount_cents = fl.drawn_amount_cents ?? 0;
      }
    }
    assertSettlementDraw({
      order: {
        status: fresh.status,
        period_start: o.periodStart ? new Date(o.periodStart) : null,
        period_end: o.periodEnd ? new Date(o.periodEnd) : null,
        not_to_exceed_cents: o.notToExceedCents,
      },
      periodStart,
      periodEnd,
      lines: drafts,
      alreadySettledCents: await settledCentsFor(orderId, tx),
    });

    // THE PERSISTED ROWS ARE THE PROVIDER'S OWN — one per timesheet day, one for
    const created = await tx.paymentRequest.create({
      data: {
        payment_request_number: await nextNumber("ST", { pAccountId: (await tx.workOrder.findUniqueOrThrow({ where: { id: o.id }, select: { p_account_id: true } })).p_account_id }, { tx }),
        work_order_id: o.id,
        provider_person_id: await providerPersonIdOf(o.id),
        period_start: periodStart,
        period_end: periodEnd,
        currency: o.currency,
        status: "SUBMITTED",
        held_for_tax_banking: held,
        submitted_at: submittedAt,
        due_date: dueDate(submittedAt, orderLineById.get(rows[0].workOrderLineId)?.paymentTerms),
        resubmits_id: resubmitsId,
        lines: {
          create: rows.map((r, i) => {
            const ol = orderLineById.get(r.workOrderLineId)!;
            // THE SAME ONE TRANSLATION AS THE DRAFT BOUNDARY ABOVE, AND FOR THE
            const olByQuantity = pricedByQuantity(ol.transactionType);
            const olBasis: LineBasis = olByQuantity ? "RATE" : "AMOUNT";
            const priced = priceSettlementLine(
              {
                work_order_line_id: r.workOrderLineId,
                basis: olBasis,
                quantity: olByQuantity ? Number(r.quantity ?? 0) : null,
                amount_cents: olByQuantity ? null : r.amountCents == null ? null : Math.round(Number(r.amountCents)),
              },
              {
                id: ol.id,
                basis: olBasis,
                uom: ol.uom,
                quantity: ol.quantity,
                unit_price_cents: ol.unitPriceCents,
                amount_cents: ol.amountCents,
                drawn_amount_cents: drafts.find((d) => d.orderLine.id === ol.id)?.orderLine.drawn_amount_cents ?? 0,
              }
            );
            return {
              line_number: i + 1,
              work_order_line_id: r.workOrderLineId,
              basis: olBasis,
              description: ol.description,
              uom: olByQuantity ? ol.uom : null,
              // THE QUANTITY IS THE PROVIDER'S CLAIM; THE PRICE IS THE ORDER'S.
              quantity: olByQuantity ? Number(r.quantity ?? 0) : null,
              unit_price_cents: priced.unit_price_cents ?? null,
              amount_cents: priced.amount_cents ?? null,
              service_date: r.serviceDate ? new Date(r.serviceDate) : null,
              note: r.note?.trim() || null,
            };
          }),
        },
      },
      select: { id: true },
    });

    // THE DRAW IS TAKEN AT SUBMIT, NOT AT APPROVAL, AND THE REVERSE IS AT
    for (const [workOrderLineId, agg] of byOrderLine) {
      const ol = orderLineById.get(workOrderLineId)!;
      if (pricedByQuantity(ol.transactionType)) {
        await tx.workOrderLine.update({
          where: { id: workOrderLineId },
          data: {
            drawn_quantity: { increment: agg.quantity },
            drawn_amount_cents: { increment: Math.round(agg.quantity * (ol.unitPriceCents ?? 0)) },
          },
        });
      } else {
        const d = drafts.find((x) => x.orderLine.id === workOrderLineId)!;
        const draw = priceSettlementLine(d.draft, d.orderLine).amount_cents ?? 0;
        const full = (d.orderLine.drawn_amount_cents ?? 0) + draw >= (ol.amountCents ?? 0);
        await tx.workOrderLine.update({
          where: { id: workOrderLineId },
          data: { drawn_amount_cents: { increment: draw }, ...(full ? { status: "DRAWN" as const } : {}) },
        });
      }
    }
    return created;
  });

  const detail = await getSettlement(viewer, created.id);
  if (!held) await announceSettlement(created.id);
  return detail;
}

/** Hand a submitted request to the customer: their ERP (as a receipt) or a Panameer approval notice. */
async function announceSettlement(id: string) {
  const s = await prisma.paymentRequest.findUniqueOrThrow({ where: { id }, include: { lines: true } });
  const o = await prisma.workOrder.findUniqueOrThrow({ where: { id: s.work_order_id }, select: { id: true, order_number: true, buyer_person_id: true, erp_connection_id: true, provider_person_id: true } });
  const prov = await prisma.person.findUnique({ where: { id: o.provider_person_id }, select: { first_name: true, last_name: true } });
  // X-E006: on an ERP order the request goes to the ERP as a receipt; the customer acts there, not in Panameer.
  if (o.erp_connection_id) return void (await queueWorkConfirmation(id));
  await notify({
    event: "work.settlement_approval",
    personId: o.buyer_person_id,
    entityType: "settlement",
    entityId: id,
    dedupeKey: `settlement-approval:${id}`,
    vars: {
      settlementId: id,
      orderId: o.id,
      orderNumber: o.order_number,
      providerName: prov ? `${prov.first_name} ${prov.last_name}`.trim() : "The provider",
      amount: formatCents(s.lines.reduce((n, l) => n + lineValue(l), 0), s.currency),
    },
  });
}

/** RD-E003: release a provider's held requests once their company has finished tax & banking (payment terms restart now). */
export async function releaseHeldFor(providerPersonId: string): Promise<number> {
  const held = await prisma.paymentRequest.findMany({ where: { provider_person_id: providerPersonId, held_for_tax_banking: true }, select: { id: true, submitted_at: true, due_date: true } });
  // WN-E002: requests held under the old rule are released; nothing new is held.
  if (!held.length) return 0;
  const now = new Date();
  for (const h of held) {
    const terms = h.submitted_at && h.due_date ? h.due_date.getTime() - h.submitted_at.getTime() : 0;
    const moved = await prisma.paymentRequest.updateMany({ where: { id: h.id, held_for_tax_banking: true }, data: { held_for_tax_banking: false, submitted_at: now, due_date: h.due_date ? new Date(now.getTime() + terms) : null } });
    if (moved.count) await announceSettlement(h.id);
  }
  await prisma.notification.updateMany({ where: { person_id: providerPersonId, dedupe_key: `tax_banking.needed:${providerPersonId}`, resolved_at: null }, data: { resolved_at: now } });
  return held.length;
}

/** Route hook: the signed-in member's company changed its tax, legal or payout details. */
export async function releaseHeldForViewer(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (p) await releaseHeldForCompanyOf(p.id).catch((e) => console.error("[settlements] release held failed:", e));
}

/** After a company's tax, legal or payout details change: release every member's held requests. */
export async function releaseHeldForCompanyOf(personId: string) {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  const members = m ? await prisma.companyMembership.findMany({ where: { company_id: m.company_id, status: "APPROVED" }, select: { person_id: true } }) : [{ person_id: personId }];
  for (const x of members) await releaseHeldFor(x.person_id);
}

async function providerPersonIdOf(orderId: string): Promise<string> {
  const o = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { provider_person_id: true },
  });
  if (!o) throw new SettlementError("Work order not found", "NOT_FOUND");
  return o.provider_person_id;
}

/* ═══════════════════════════════════════════════════════════════════════════
   READ — BOTH SCOPES, THE `E393` WAY
   ═════════════════════════════════════════════════════════════════════════ */

export type SettlementAction = "APPROVE" | "REJECT";

/** THE PARTY RULE, AND IT IS 's, NOT A SECOND ONE. */
export function settlementActions(
  settlement: { status: PaymentRequestStatus; held_for_tax_banking?: boolean },
  party: OrderParty,
  erp = false
): SettlementAction[] {
  if (erp || settlement.held_for_tax_banking) return [];
  if (party === "BUYER") return settlement.status === "SUBMITTED" ? ["APPROVE", "REJECT"] : [];
  return [];
}

export type SettlementLineView = {
  id: string;
  workOrderLineId: string;
  lineNumber: number;
  basis: LineBasis;
  description: string | null;
  uom: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  serviceDate: string | null;
  note: string | null;
  valueCents: number;
  feeBps: number;
  feeCents: number;
};

export type SettlementDetail = {
  id: string;
  settlementNumber: string;
  status: PaymentRequestStatus;
  party: OrderParty;
  orderId: string;
  orderNumber: string;
  buyerName: string;
  providerName: string;
  counterpartyName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string | null;
  dueDate: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  lines: SettlementLineView[];
  totalCents: number;
  feeCents: number;
  netCents: number;
  /** Set once Panameer has paid the provider out (offline, recorded by admin). */
  paidOut: { paidAt: string | null; netCents: number; method: string | null } | null;
  /** Resubmission links (run 13): the rejected request this replaces, and the one that replaced it. */
  resubmitOf: { id: string; number: string } | null;
  resubmittedAs: { id: string; number: string } | null;
  /** RATE if any line is a timesheet — decides which rendering the reader gets. */
  hasTimesheet: boolean;
  /** X-E006: the order came from the customer's ERP; approval happens there. */
  erp: boolean;
  /** RD-E003: "Waiting on Tax & Banking" — the provider's company hasn't finished it yet. */
  held: boolean;
  actions: SettlementAction[];
};

/** ONE definition of a settlement line's value, read by the detail and the list. */
function lineValue(l: {
  basis: LineBasis;
  quantity?: unknown;
  unit_price_cents: number | null;
  amount_cents: number | null;
}): number {
  return l.basis === "RATE"
    ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))
    : l.amount_cents ?? 0;
}

/** One settlement, if the viewer is a party to its ORDER. */
export async function getSettlement(viewer: Viewer, id: string): Promise<SettlementDetail> {
  const read = () => prisma.paymentRequest.findUnique({ where: { id }, include: { lines: { orderBy: { line_number: "asc" } } } });
  let s = await read();
  if (!s) throw new SettlementError("Payment request not found", "NOT_FOUND");
  if (s.held_for_tax_banking && (await releaseHeldFor(s.provider_person_id))) s = (await read())!;

  let order;
  try {
    order = await getOrderDetail(viewer, s.work_order_id);
  } catch (e) {
    // NOT A PARTY TO THE ORDER MEANS NOT FOUND, NOT FORBIDDEN — the same
    if (e instanceof OrderError) throw new SettlementError("Payment request not found", "NOT_FOUND");
    throw e;
  }

  const orderLineFee = new Map(
    (
      await prisma.workOrderLine.findMany({
        where: { id: { in: s.lines.map((l) => l.work_order_line_id) } },
        select: { id: true, fee_bps: true },
      })
    ).map((l) => [l.id, l.fee_bps])
  );
  const lines: SettlementLineView[] = s.lines.map((l) => ({
    id: l.id,
    workOrderLineId: l.work_order_line_id,
    lineNumber: l.line_number,
    basis: l.basis,
    description: l.description,
    uom: l.uom,
    quantity: l.quantity == null ? null : Number(l.quantity),
    unitPriceCents: l.unit_price_cents,
    amountCents: l.amount_cents,
    serviceDate: l.service_date ? l.service_date.toISOString().slice(0, 10) : null,
    note: l.note,
    valueCents: lineValue(l),
    feeBps: orderLineFee.get(l.work_order_line_id) ?? 0,
    feeCents: feeSplit(lineValue(l), orderLineFee.get(l.work_order_line_id) ?? 0).fee_cents,
  }));
  const totalCents = lines.reduce((n, l) => n + l.valueCents, 0);
  const feeCents = lines.reduce((n, l) => n + l.feeCents, 0);
  const [resubmitOf, resubmittedAs] = await Promise.all([
    s.resubmits_id ? prisma.paymentRequest.findUnique({ where: { id: s.resubmits_id }, select: { id: true, payment_request_number: true } }) : null,
    prisma.paymentRequest.findFirst({ where: { resubmits_id: s.id }, select: { id: true, payment_request_number: true } }),
  ]);
  const payoutLine = await prisma.providerPayoutLine.findFirst({
    where: { payment_request_line_id: { in: s.lines.map((l) => l.id) } },
    select: { providerPayout: { select: { paid_at: true, net_cents: true, method: true } } },
  });

  return {
    id: s.id,
    settlementNumber: s.payment_request_number,
    status: s.status,
    party: order.party,
    orderId: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    providerName: order.providerName,
    counterpartyName: order.counterpartyName,
    currency: s.currency,
    periodStart: s.period_start.toISOString().slice(0, 10),
    periodEnd: s.period_end.toISOString().slice(0, 10),
    submittedAt: s.submitted_at ? s.submitted_at.toISOString() : null,
    dueDate: s.due_date ? s.due_date.toISOString().slice(0, 10) : null,
    decidedAt: s.decided_at ? s.decided_at.toISOString() : null,
    decisionNote: s.decision_note,
    lines,
    totalCents,
    feeCents,
    netCents: totalCents - feeCents,
    resubmitOf: resubmitOf ? { id: resubmitOf.id, number: resubmitOf.payment_request_number } : null,
    resubmittedAs: resubmittedAs ? { id: resubmittedAs.id, number: resubmittedAs.payment_request_number } : null,
    paidOut: payoutLine
      ? {
          paidAt: payoutLine.providerPayout.paid_at ? payoutLine.providerPayout.paid_at.toISOString().slice(0, 10) : null,
          netCents: payoutLine.providerPayout.net_cents,
          method: payoutLine.providerPayout.method,
        }
      : null,
    hasTimesheet: lines.some((l) => l.basis === "RATE"),
    erp: order.erp,
    held: s.held_for_tax_banking,
    actions: settlementActions(s, order.party, order.erp),
  };
}

export type SettlementRow = {
  id: string;
  settlementNumber: string;
  status: PaymentRequestStatus;
  party: OrderParty;
  orderId: string;
  orderNumber: string;
  counterpartyName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  lineCount: number;
  submittedAt: string | null;
  dueDate: string | null;
  paidOut: boolean;
  erp: boolean;
  held: boolean;
};

/** Every settlement the viewer is a party to — both scopes, one function. */
export async function listSettlements(viewer: Viewer): Promise<SettlementRow[]> {
  const orders = await listOrders(viewer);
  if (orders.length === 0) return [];
  const byOrder = new Map(orders.map((o) => [o.id, o]));

  const rows = await prisma.paymentRequest.findMany({
    where: { work_order_id: { in: orders.map((o) => o.id) } },
    orderBy: [{ created_at: "desc" }],
    include: { lines: true },
  });

  const outLines = new Set(
    (
      await prisma.providerPayoutLine.findMany({
        where: { payment_request_line_id: { in: rows.flatMap((r) => r.lines.map((l) => l.id)) } },
        select: { payment_request_line_id: true },
      })
    ).map((l) => l.payment_request_line_id)
  );
  return rows.map((s) => {
    const o = byOrder.get(s.work_order_id)!;
    return {
      id: s.id,
      settlementNumber: s.payment_request_number,
      status: s.status,
      party: o.party,
      orderId: o.id,
      orderNumber: o.orderNumber,
      counterpartyName: o.counterpartyName,
      currency: s.currency,
      periodStart: s.period_start.toISOString().slice(0, 10),
      periodEnd: s.period_end.toISOString().slice(0, 10),
      totalCents: s.lines.reduce((n, l) => n + lineValue(l), 0),
      lineCount: s.lines.length,
      submittedAt: s.submitted_at ? s.submitted_at.toISOString() : null,
      dueDate: s.due_date ? s.due_date.toISOString().slice(0, 10) : null,
      erp: o.erp,
      held: s.held_for_tax_banking,
      paidOut: s.lines.some((l) => outLines.has(l.id)),
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE BUYER'S DECISION
   ═════════════════════════════════════════════════════════════════════════ */

/** APPROVING A SETTLEMENT IS ACCEPTING THE WORK. */
export async function approveSettlement(viewer: Viewer, id: string): Promise<SettlementDetail> {
  const current = await getSettlement(viewer, id);
  if (!settlementActions({ status: current.status, held_for_tax_banking: current.held }, current.party, current.erp).includes("APPROVE"))
    throw new SettlementError(
      current.party === "PROVIDER"
        ? "Only the buyer can approve a payment request"
        : "This payment request is not waiting for a decision",
      current.party === "PROVIDER" ? "FORBIDDEN" : "INVALID"
    );
  const order = await prisma.workOrder.findUnique({ where: { id: current.orderId }, select: { status: true, lines: { select: { line_number: true, quantity: true, amount_cents: true, drawn_quantity: true, drawn_amount_cents: true, transaction_type: true, uom: true } } } });
  // WS-E003: matching — never approve past the ordered quantity (Service – Rate / Product) or amount (Service – Fixed Price).
  for (const l of order?.lines ?? []) {
    if (l.transaction_type !== "SERVICE_BY_AMT" && l.quantity != null && Number(l.drawn_quantity ?? 0) > Number(l.quantity))
      throw new SettlementError(`Line ${l.line_number} is over-drawn: ${Number(l.drawn_quantity)} of ${Number(l.quantity)} ${l.uom?.toLowerCase() ?? "units"} used. Send it back or raise a change order.`, "INVALID");
    if (l.transaction_type === "SERVICE_BY_AMT" && l.amount_cents != null && (l.drawn_amount_cents ?? 0) > l.amount_cents)
      throw new SettlementError(`Line ${l.line_number} is over-drawn: $${((l.drawn_amount_cents ?? 0) / 100).toFixed(2)} of $${(l.amount_cents / 100).toFixed(2)}. Send it back or raise a change order.`, "INVALID");
  }
  if (order && !PAYABLE.includes(order.status))
    throw new SettlementError(order.status === "ON_HOLD" ? "This work order is on hold. Release the hold before approving." : "This work order can't take approvals", "INVALID");
  await prisma.paymentRequest.updateMany({
    where: { id, status: "SUBMITTED" },
    data: { status: "APPROVED", decided_at: new Date(), decided_by_person_id: await personIdOf(viewer) },
  });
  return getSettlement(viewer, id);
}

/** A REJECTION WITHOUT A STATED REASON IS UNANSWERABLE . */
export async function rejectSettlement(
  viewer: Viewer,
  id: string,
  reason: string
): Promise<SettlementDetail> {
  const current = await getSettlement(viewer, id);
  if (!settlementActions({ status: current.status, held_for_tax_banking: current.held }, current.party, current.erp).includes("REJECT"))
    throw new SettlementError(
      current.party === "PROVIDER"
        ? "Only the buyer can reject a payment request"
        : "This payment request is not waiting for a decision",
      current.party === "PROVIDER" ? "FORBIDDEN" : "INVALID"
    );
  const note = (reason ?? "").trim();
  if (note.length < 3)
    throw new SettlementError(
      "A rejection needs a reason — without one the provider cannot answer it",
      "INVALID"
    );

  const done = await prisma.paymentRequest.updateMany({
    where: { id, status: "SUBMITTED" },
    data: {
      status: "REJECTED",
      decided_at: new Date(),
      decided_by_person_id: await personIdOf(viewer),
      decision_note: note,
    },
  });

  // ONLY IF THIS CALL IS THE ONE THAT REJECTED IT. Two buyers clicking at once
  if (done.count === 1) {
    await returnTheDraw(id);
    // CAT-E007: a rejected milestone request can be reported again.
    await prisma.workOrderMilestone.updateMany({ where: { payment_request_id: id }, data: { reported_at: null, payment_request_id: null } });
  }
  return getSettlement(viewer, id);
}

/** Give back what a rejected settlement had drawn. */
export async function returnTheDraw(settlementId: string): Promise<void> {
  const lines = await prisma.paymentRequestLine.findMany({
    where: { payment_request_id: settlementId },
    select: { work_order_line_id: true, basis: true, quantity: true, unit_price_cents: true, amount_cents: true },
  });
  const byLine = new Map<string, { quantity: number; cents: number; basis: LineBasis }>();
  for (const l of lines) {
    const cur = byLine.get(l.work_order_line_id) ?? { quantity: 0, cents: 0, basis: l.basis };
    cur.quantity += Number(l.quantity ?? 0);
    cur.cents += l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0;
    byLine.set(l.work_order_line_id, cur);
  }
  for (const [workOrderLineId, agg] of byLine) {
    if (agg.basis === "RATE") {
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: {
          drawn_quantity: { decrement: agg.quantity },
          drawn_amount_cents: { decrement: agg.cents },
        },
      });
    } else {
      // O-E005: give back exactly what this request drew; the line is open again.
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: { drawn_amount_cents: { decrement: agg.cents }, status: "OPEN" },
      });
    }
  }
}

async function personIdOf(viewer: Viewer): Promise<string> {
  const p = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!p) throw new SettlementError("This account has no person record", "NOT_FOUND");
  return p.id;
}
