import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";
import { SETTLEMENT_LABEL, SETTLEMENT_TONE } from "@/lib/oracle-status";
import { Timesheets } from "@/components/orders/Timesheets";
import { timesheetWeeks } from "@/lib/wo-plan";

// WT-E004: Settlements — the timesheets, then each settlement transaction (ST-…) with its status; a paid one links its payment.
export async function OrderSettlements({ orderId, currency }: { orderId: string; currency: string }) {
  const rows = await prisma.paymentRequest.findMany({
    where: { work_order_id: orderId },
    orderBy: { created_at: "desc" },
    select: { id: true, payment_request_number: true, status: true, period_start: true, period_end: true, submitted_at: true, lines: { select: { amount_cents: true, quantity: true, unit_price_cents: true } } },
  });
  const paid = await prisma.paymentLine.findMany({ where: { payment_request_id: { in: rows.map((r) => r.id) } }, select: { payment_request_id: true, payment: { select: { payment_number: true } } } });
  const payOf = new Map(paid.map((p) => [p.payment_request_id, p.payment.payment_number]));
  const weeks = await timesheetWeeks(orderId);
  return (
    <div data-order-settlements>
      {weeks.length > 0 && <Timesheets weeks={weeks} currency={currency} />}
      <h2 className="mt-6 text-[17px] font-bold">Settlement transactions</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-3">None yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {rows.map((r) => {
            const total = r.lines.reduce((n, l) => n + (l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
            const pay = payOf.get(r.id);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-settlement={r.payment_request_number}>
                <div className="min-w-0">
                  <Link href={`/payments/payment-requests/${r.id}`} className="font-mono text-[14px] font-bold hover:underline">{r.payment_request_number}</Link>
                  <p className="text-[13px] text-ink-2">{r.period_start.toISOString().slice(0, 10)} → {r.period_end.toISOString().slice(0, 10)}{r.submitted_at && ` · submitted ${r.submitted_at.toISOString().slice(0, 10)}`}</p>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <b className="tabular-nums">{formatCents(total, currency)}</b>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${SETTLEMENT_TONE[r.status]}`}>{SETTLEMENT_LABEL[r.status]}</span>
                  {pay && <Link href={`/payments/payment-requests/${r.id}`} data-paid-link className="text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Paid · {pay} →</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
