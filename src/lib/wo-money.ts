import { prisma } from "@/lib/prisma";
import { pricedByQuantity } from "@/lib/transaction-spine";

// Work Order Plan header: time (hours + calendar) and dollars (left to be paid), from real records only.
export type WoMoneyInput = {
  nteCents: number | null;
  valueCents: number;
  paidCents: number;
  approvedUnpaidCents: number;
  awaitingApprovalCents: number;
  hoursAuthorized: number | null;
  hoursLogged: number;
  periodStart: string | null;
  periodEnd: string | null;
  today: string;
};

export type WoMoney = {
  capCents: number;
  paidCents: number;
  approvedUnpaidCents: number;
  awaitingApprovalCents: number;
  leftToPayCents: number;
  hoursAuthorized: number | null;
  hoursLogged: number;
  hoursLeft: number | null;
  daysLeft: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

const DAY = 86_400_000;
const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** Pure: left to be paid = cap − paid − approved-unpaid − awaiting approval, never below zero. */
export function woMoney(i: WoMoneyInput): WoMoney {
  const cap = i.nteCents ?? i.valueCents;
  const left = Math.max(0, cap - i.paidCents - i.approvedUnpaidCents - i.awaitingApprovalCents);
  const hoursLeft = i.hoursAuthorized == null ? null : Math.max(0, Math.round((i.hoursAuthorized - i.hoursLogged) * 100) / 100);
  const daysLeft = i.periodEnd ? Math.max(0, Math.round((utc(i.periodEnd) - utc(i.today)) / DAY)) : null;
  return {
    capCents: cap,
    paidCents: i.paidCents,
    approvedUnpaidCents: i.approvedUnpaidCents,
    awaitingApprovalCents: i.awaitingApprovalCents,
    leftToPayCents: left,
    hoursAuthorized: i.hoursAuthorized,
    hoursLogged: Math.round(i.hoursLogged * 100) / 100,
    hoursLeft,
    daysLeft,
    periodStart: i.periodStart,
    periodEnd: i.periodEnd,
  };
}

const lineValue = (l: { basis: string; quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }) =>
  l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0;

/** Reads one order's figures. Caller has already checked the viewer is a party to it. */
export async function loadWoMoney(orderId: string, today = new Date()): Promise<WoMoney | null> {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!o) return null;
  const hourLines = o.lines.filter((l) => pricedByQuantity(l.transaction_type) && (l.uom ?? "HOUR").toUpperCase().startsWith("HOUR"));
  const hourLineIds = new Set(hourLines.map((l) => l.id));
  const reqs = await prisma.settlementRequest.findMany({
    where: { work_order_id: o.id, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } },
    include: { lines: true },
  });
  const paidByReq = new Map(
    (await prisma.paymentLine.groupBy({ by: ["settlement_request_id"], where: { settlement_request_id: { in: reqs.map((r) => r.id) } }, _sum: { amount_cents: true } })).map((g) => [
      g.settlement_request_id,
      g._sum.amount_cents ?? 0,
    ])
  );
  let paid = 0, approvedUnpaid = 0, awaiting = 0, logged = 0;
  for (const r of reqs) {
    const total = r.lines.reduce((n, l) => n + lineValue(l), 0);
    const got = Math.min(total, paidByReq.get(r.id) ?? 0);
    if (r.status === "SUBMITTED") awaiting += total;
    else {
      paid += got;
      approvedUnpaid += total - got;
    }
    logged += r.lines.filter((l) => hourLineIds.has(l.work_order_line_id)).reduce((n, l) => n + Number(l.quantity ?? 0), 0);
  }
  const value = o.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
  return woMoney({
    nteCents: o.not_to_exceed_cents,
    valueCents: value,
    paidCents: paid,
    approvedUnpaidCents: approvedUnpaid,
    awaitingApprovalCents: awaiting,
    hoursAuthorized: hourLines.length ? hourLines.reduce((n, l) => n + Number(l.quantity ?? 0), 0) : null,
    hoursLogged: logged,
    periodStart: o.period_start ? o.period_start.toISOString().slice(0, 10) : null,
    periodEnd: o.period_end ? o.period_end.toISOString().slice(0, 10) : null,
    today: today.toISOString().slice(0, 10),
  });
}
