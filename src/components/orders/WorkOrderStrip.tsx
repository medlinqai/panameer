import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";

// DB-E007: the Work Order's own strip — Buyer Accepts → Provider Accepts → Released → Settled → Paid (same look as the WR path),
// with the Ordered / Settled / Paid bar kept from OrderLifecycle.
const lineCents = (l: { quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }) => l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }) : null);
const RELEASED = ["RELEASED", "ACTIVE", "ON_HOLD", "CLOSED", "FINALLY_CLOSED"];

export async function WorkOrderStrip({ orderId }: { orderId: string }) {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, select: { order_number: true, status: true, currency: true, created_at: true, buyer_accepted_at: true, buyer_released_at: true, provider_accepted_at: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } });
  if (!o) return null;
  const [settled, requests] = await Promise.all([
    prisma.paymentRequest.findMany({ where: { work_order_id: orderId, status: { in: ["APPROVED", "PAID"] } }, select: { decided_at: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } }),
    prisma.paymentRequest.findMany({ where: { work_order_id: orderId }, select: { id: true } }),
  ]);
  const payments = await prisma.paymentLine.findMany({ where: { payment_request_id: { in: requests.map((r) => r.id) } }, select: { amount_cents: true, payment: { select: { received_at: true } } } });
  const ordered = o.lines.reduce((n, l) => n + lineCents(l), 0);
  const settledCents = settled.reduce((n, s) => n + s.lines.reduce((m, l) => m + lineCents(l), 0), 0);
  const paidCents = payments.reduce((n, p) => n + p.amount_cents, 0);
  const latest = (ds: (Date | null | undefined)[]) => ds.filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const released = RELEASED.includes(o.status);
  const buyerAt = o.buyer_accepted_at ?? o.buyer_released_at;
  const steps = [
    { key: "buyer", label: "Buyer Accepts", done: !!buyerAt, date: buyerAt },
    { key: "provider", label: "Provider Accepts", done: !!o.provider_accepted_at, date: o.provider_accepted_at },
    { key: "released", label: "Released", done: released, date: released ? latest([o.provider_accepted_at, o.buyer_released_at, buyerAt]) : null },
    { key: "settled", label: "Settled", done: settledCents > 0, date: latest(settled.map((s) => s.decided_at)), cents: settledCents, href: `/orders/${orderId}?tab=settlements` },
    { key: "paid", label: "Paid", done: paidCents > 0, date: latest(payments.map((p) => p.payment.received_at)), cents: paidCents, href: `/orders/${orderId}?tab=settlements` },
  ];
  const current = steps.find((s) => !s.done)?.key ?? null;
  const base = Math.max(ordered, 1);
  const pct = (c: number) => `${Math.min(100, Math.round((c / base) * 100))}%`;
  return (
    <section data-work-order-strip className="mt-5 rounded-brand border border-line bg-white p-4 sm:p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Order Progress · {o.order_number}</h2>
      <div className="-mx-1 overflow-x-auto pb-1">
        <ol className="mt-3 flex min-w-max gap-x-1 px-1">
          {steps.map((s) => {
            const on = s.key === current;
            const dot = s.done ? "grid h-8 w-8 place-items-center rounded-full bg-ink text-[14px] font-bold text-white" : on ? "grid h-8 w-8 place-items-center rounded-full border-2 border-magenta bg-white ring-2 ring-magenta/30" : "grid h-8 w-8 place-items-center rounded-full border-2 border-[#C9CDDC] bg-white";
            const body = (
              <>
                <span className={dot} aria-hidden>{s.done ? "✓" : ""}</span>
                <span className={s.done || on ? "mt-1.5 block text-[13px] font-bold leading-tight" : "mt-1.5 block text-[13px] font-bold leading-tight text-ink-3"}>{s.label}</span>
                {"cents" in s && s.cents != null && s.cents > 0 && <span className="block text-[12px] tabular-nums text-ink-2">{formatCents(s.cents, o.currency)}</span>}
                {s.done && s.date && <span className="block text-[11.5px] text-ink-2">{day(s.date)}</span>}
              </>
            );
            return (
              <li key={s.key} className="flex w-[104px] flex-col items-center text-center" data-step={s.key} data-state={s.done ? "done" : on ? "current" : "upcoming"}>
                {"href" in s && s.href ? <Link href={s.href} className="flex flex-col items-center hover:underline">{body}</Link> : body}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-3" aria-label="Ordered, settled and paid">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
          <div className="absolute inset-y-0 left-0 bg-ink/25" style={{ width: pct(ordered) }} />
          <div className="absolute inset-y-0 left-0 bg-ink/60" style={{ width: pct(settledCents) }} />
          <div className="absolute inset-y-0 left-0 bg-magenta" style={{ width: pct(paidCents) }} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px] text-ink-2"><span>Ordered {formatCents(ordered, o.currency)}</span><span>Settled {formatCents(settledCents, o.currency)}</span><span>Paid {formatCents(paidCents, o.currency)}</span></p>
      </div>
    </section>
  );
}
