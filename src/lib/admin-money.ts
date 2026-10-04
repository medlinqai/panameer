import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertAllocation, feeSplit, paymentStatusFor, SpineError } from "@/lib/transaction-spine";
import { notify } from "@/lib/notifications";
import { formatCents } from "@/lib/display";

// R1 money, admin side: buyers pay Panameer offline; admin records it here and allocates it to payment requests.
export class MoneyError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND" | "OVER_ALLOCATED") {
    super(message);
    this.name = "MoneyError";
  }
}

const settlementValue = (l: { basis: string; quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }) =>
  l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0;

export type OpenRequest = {
  id: string;
  settlementNumber: string;
  orderId: string;
  orderNumber: string;
  pAccountId: string;
  pAccountName: string;
  buyerName: string;
  providerName: string;
  currency: string;
  totalCents: number;
  allocatedCents: number;
  remainingCents: number;
  approvedAt: string | null;
};

async function names(ids: string[]) {
  const people = await prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } });
  return new Map(people.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
}

/** Approved payment requests the buyer still owes on (not yet PAID). */
export async function openRequests(): Promise<OpenRequest[]> {
  const rows = await prisma.settlementRequest.findMany({
    where: { status: "APPROVED" },
    orderBy: { decided_at: "asc" },
    include: { lines: true },
  });
  if (rows.length === 0) return [];
  const orders = await prisma.workOrder.findMany({
    where: { id: { in: rows.map((r) => r.work_order_id) } },
    select: { id: true, order_number: true, p_account_id: true, buyer_person_id: true, provider_person_id: true },
  });
  const byOrder = new Map(orders.map((o) => [o.id, o]));
  const accounts = await prisma.pAccount.findMany({ where: { id: { in: orders.map((o) => o.p_account_id) } }, select: { id: true, name: true } });
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const who = await names(orders.flatMap((o) => [o.buyer_person_id, o.provider_person_id]));
  const alloc = await prisma.paymentLine.groupBy({
    by: ["settlement_request_id"],
    where: { settlement_request_id: { in: rows.map((r) => r.id) } },
    _sum: { amount_cents: true },
  });
  const allocated = new Map(alloc.map((a) => [a.settlement_request_id, a._sum.amount_cents ?? 0]));
  return rows.map((r) => {
    const o = byOrder.get(r.work_order_id)!;
    const total = r.lines.reduce((n, l) => n + settlementValue(l), 0);
    const got = allocated.get(r.id) ?? 0;
    return {
      id: r.id,
      settlementNumber: r.settlement_number,
      orderId: o.id,
      orderNumber: o.order_number,
      pAccountId: o.p_account_id,
      pAccountName: accountName.get(o.p_account_id) ?? "—",
      buyerName: who.get(o.buyer_person_id) ?? "A buyer",
      providerName: who.get(o.provider_person_id) ?? "A provider",
      currency: r.currency,
      totalCents: total,
      allocatedCents: got,
      remainingCents: Math.max(0, total - got),
      approvedAt: r.decided_at ? r.decided_at.toISOString().slice(0, 10) : null,
    };
  });
}

export type RecordPaymentInput = {
  pAccountId: string;
  amountCents: number;
  receivedAt: string;
  externalRef?: string | null;
  allocations: { settlementId: string; amountCents: number }[];
};

/** Records one received payment and allocates it; a request allocated in full becomes PAID. */
export async function recordPayment(input: RecordPaymentInput): Promise<{ id: string; paymentNumber: string; paid: string[] }> {
  if (!input.pAccountId) throw new MoneyError("Pick who paid", "INVALID");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new MoneyError("Enter the amount received", "INVALID");
  const receivedAt = new Date(input.receivedAt);
  if (Number.isNaN(receivedAt.getTime())) throw new MoneyError("Enter the date it was received", "INVALID");
  const allocations = (input.allocations ?? []).filter((a) => a.amountCents > 0);
  if (new Set(allocations.map((a) => a.settlementId)).size !== allocations.length)
    throw new MoneyError("Each payment request can appear once", "INVALID");
  try {
    assertAllocation(input.amountCents, allocations.map((a) => a.amountCents));
  } catch (e) {
    if (e instanceof SpineError) throw new MoneyError(e.message, "OVER_ALLOCATED");
    throw e;
  }

  const open = new Map((await openRequests()).map((r) => [r.id, r]));
  for (const a of allocations) {
    const r = open.get(a.settlementId);
    if (!r) throw new MoneyError("A payment request is not approved or already paid", "NOT_FOUND");
    if (r.pAccountId !== input.pAccountId) throw new MoneyError(`${r.settlementNumber} belongs to another account`, "INVALID");
    if (a.amountCents > r.remainingCents)
      throw new MoneyError(`${r.settlementNumber} has only ${r.remainingCents / 100} left to pay`, "OVER_ALLOCATED");
  }

  const paymentNumber = `PAY-${randomBytes(3).toString("hex").toUpperCase()}`;
  const paid: string[] = [];
  const created = await prisma.$transaction(async (tx) => {
    // Re-read inside the transaction so two admins cannot both allocate the same balance.
    await tx.$executeRaw`SELECT id FROM settlement_requests WHERE id = ANY(${allocations.map((a) => a.settlementId)}::uuid[]) FOR UPDATE`;
    for (const a of allocations) {
      const done = await tx.paymentLine.aggregate({ where: { settlement_request_id: a.settlementId }, _sum: { amount_cents: true } });
      const r = open.get(a.settlementId)!;
      if ((done._sum.amount_cents ?? 0) + a.amountCents > r.totalCents)
        throw new MoneyError(`${r.settlementNumber} was just paid by another entry`, "OVER_ALLOCATED");
    }
    const p = await tx.payment.create({
      data: {
        payment_number: paymentNumber,
        p_account_id: input.pAccountId,
        external_ref: input.externalRef?.trim() || null,
        received_at: receivedAt,
        amount_cents: input.amountCents,
        status: paymentStatusFor(input.amountCents, allocations.map((a) => a.amountCents)),
        lines: { create: allocations.map((a, i) => ({ line_number: i + 1, settlement_request_id: a.settlementId, amount_cents: a.amountCents })) },
      },
      select: { id: true },
    });
    for (const a of allocations) {
      const r = open.get(a.settlementId)!;
      if (a.amountCents >= r.remainingCents) {
        await tx.settlementRequest.updateMany({ where: { id: a.settlementId, status: "APPROVED" }, data: { status: "PAID" } });
        paid.push(a.settlementId);
      }
    }
    return p;
  });
  return { id: created.id, paymentNumber, paid };
}

export type PaymentRow = {
  id: string;
  paymentNumber: string;
  pAccountName: string;
  receivedAt: string;
  amountCents: number;
  allocatedCents: number;
  status: string;
  externalRef: string | null;
  requests: string[];
};

export async function listPayments(): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({ orderBy: { received_at: "desc" }, include: { lines: true }, take: 500 });
  const accounts = await prisma.pAccount.findMany({ where: { id: { in: rows.map((r) => r.p_account_id) } }, select: { id: true, name: true } });
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const reqs = await prisma.settlementRequest.findMany({
    where: { id: { in: rows.flatMap((r) => r.lines.map((l) => l.settlement_request_id)) } },
    select: { id: true, settlement_number: true },
  });
  const num = new Map(reqs.map((r) => [r.id, r.settlement_number]));
  return rows.map((r) => ({
    id: r.id,
    paymentNumber: r.payment_number,
    pAccountName: accountName.get(r.p_account_id) ?? "—",
    receivedAt: r.received_at.toISOString().slice(0, 10),
    amountCents: r.amount_cents,
    allocatedCents: r.lines.reduce((n, l) => n + l.amount_cents, 0),
    status: r.status,
    externalRef: r.external_ref,
    requests: r.lines.map((l) => num.get(l.settlement_request_id) ?? "—"),
  }));
}

export type PayoutRow = {
  settlementId: string;
  settlementNumber: string;
  orderNumber: string;
  providerPersonId: string;
  providerName: string;
  currency: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
};

async function splitFor(settlementIds: string[]) {
  const lines = await prisma.settlementLine.findMany({ where: { settlement_request_id: { in: settlementIds } } });
  const fee = new Map(
    (await prisma.workOrderLine.findMany({ where: { id: { in: lines.map((l) => l.work_order_line_id) } }, select: { id: true, fee_bps: true } })).map(
      (l) => [l.id, l.fee_bps]
    )
  );
  return lines.map((l) => ({ ...l, ...feeSplit(settlementValue(l), fee.get(l.work_order_line_id) ?? 0) }));
}

/** Requests the buyer has paid in full that have not been paid out to the provider yet. */
export async function payoutQueue(): Promise<PayoutRow[]> {
  const paid = await prisma.settlementRequest.findMany({ where: { status: "PAID" }, orderBy: { updated_at: "asc" }, select: { id: true, settlement_number: true, work_order_id: true, provider_person_id: true, currency: true, lines: { select: { id: true } } } });
  const done = new Set(
    (await prisma.providerPayoutLine.findMany({ where: { settlement_line_id: { in: paid.flatMap((p) => p.lines.map((l) => l.id)) } }, select: { settlement_line_id: true } })).map((l) => l.settlement_line_id)
  );
  const todo = paid.filter((p) => p.lines.length > 0 && !p.lines.some((l) => done.has(l.id)));
  if (todo.length === 0) return [];
  const split = await splitFor(todo.map((t) => t.id));
  const orders = new Map((await prisma.workOrder.findMany({ where: { id: { in: todo.map((t) => t.work_order_id) } }, select: { id: true, order_number: true } })).map((o) => [o.id, o.order_number]));
  const who = await names(todo.map((t) => t.provider_person_id));
  return todo.map((t) => {
    const mine = split.filter((l) => l.settlement_request_id === t.id);
    return {
      settlementId: t.id,
      settlementNumber: t.settlement_number,
      orderNumber: orders.get(t.work_order_id) ?? "—",
      providerPersonId: t.provider_person_id,
      providerName: who.get(t.provider_person_id) ?? "A provider",
      currency: t.currency,
      grossCents: mine.reduce((n, l) => n + l.gross_cents, 0),
      feeCents: mine.reduce((n, l) => n + l.fee_cents, 0),
      netCents: mine.reduce((n, l) => n + l.net_cents, 0),
    };
  });
}

/** Records the offline payout for one paid request and tells the provider. */
export async function recordPayout(input: { settlementId: string; method: string; externalRef?: string | null; paidAt: string }): Promise<{ payoutNumber: string; netCents: number }> {
  const row = (await payoutQueue()).find((r) => r.settlementId === input.settlementId);
  if (!row) throw new MoneyError("That request is not paid by the buyer yet, or is already paid out", "NOT_FOUND");
  const paidAt = new Date(input.paidAt);
  if (Number.isNaN(paidAt.getTime())) throw new MoneyError("Enter the payout date", "INVALID");
  if (!["ACH", "WIRE", "OTHER"].includes(input.method)) throw new MoneyError("Pick how it was paid", "INVALID");
  const lines = await splitFor([row.settlementId]);
  const payoutNumber = `PO-${randomBytes(3).toString("hex").toUpperCase()}`;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM settlement_requests WHERE id = ${row.settlementId}::uuid FOR UPDATE`;
    const already = await tx.providerPayoutLine.count({ where: { settlement_line_id: { in: lines.map((l) => l.id) } } });
    if (already > 0) throw new MoneyError("Already paid out", "INVALID");
    await tx.providerPayout.create({
      data: {
        payout_number: payoutNumber,
        provider_person_id: row.providerPersonId,
        currency: row.currency,
        gross_cents: row.grossCents,
        fee_cents: row.feeCents,
        net_cents: row.netCents,
        status: "PAID",
        paid_at: paidAt,
        method: input.method,
        external_ref: input.externalRef?.trim() || null,
        lines: {
          create: lines.map((l, i) => ({ line_number: i + 1, settlement_line_id: l.id, gross_cents: l.gross_cents, fee_cents: l.fee_cents, net_cents: l.net_cents })),
        },
      },
    });
  });
  await notify({
    event: "payment.sent",
    personId: row.providerPersonId,
    entityType: "settlement",
    entityId: row.settlementId,
    dedupeKey: `payout:${row.settlementId}`,
    vars: { amount: formatCents(row.netCents, row.currency), settlementId: row.settlementId },
  });
  return { payoutNumber, netCents: row.netCents };
}

export type PayoutHistoryRow = { payoutNumber: string; providerName: string; paidAt: string; method: string; netCents: number; feeCents: number; grossCents: number; externalRef: string | null };

export async function listPayouts(): Promise<PayoutHistoryRow[]> {
  const rows = await prisma.providerPayout.findMany({ orderBy: { paid_at: "desc" }, take: 500 });
  const who = await names(rows.map((r) => r.provider_person_id));
  return rows.map((r) => ({
    payoutNumber: r.payout_number,
    providerName: who.get(r.provider_person_id) ?? "A provider",
    paidAt: r.paid_at ? r.paid_at.toISOString().slice(0, 10) : "—",
    method: r.method ?? "—",
    netCents: r.net_cents,
    feeCents: r.fee_cents,
    grossCents: r.gross_cents,
    externalRef: r.external_ref,
  }));
}
