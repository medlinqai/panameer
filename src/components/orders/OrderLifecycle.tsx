import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";

// WT-E006: the life cycle (like Oracle Redwood's) — Requested · Ordered · Settled · Paid, each with its amount and date,
// filled up to the current stage, and a bar of Ordered vs Settled vs Paid. On a Work Request with several Work Orders
// the amounts sum across them and each Work Order is listed under it.
type Stage = { key: "requested" | "ordered" | "settled" | "paid"; label: string; cents: number | null; date: string | null; href?: string };

const lineCents = (l: { quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }) => l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export async function OrderLifecycle({ workRequestId, focusOrderId }: { workRequestId: string; focusOrderId?: string }) {
  const wr = await prisma.workRequest.findUnique({ where: { id: workRequestId }, select: { wr_number: true, submitted_at: true, currency: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } });
  if (!wr) return null;
  const orders = await prisma.workOrder.findMany({ where: { work_request_id: workRequestId, status: { not: "CANCELLED" } }, orderBy: { created_at: "asc" }, select: { id: true, order_number: true, status: true, created_at: true, buyer_accepted_at: true, provider_accepted_at: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } });
  const ids = orders.map((o) => o.id);
  const [settled, allRequests] = await Promise.all([
    prisma.paymentRequest.findMany({ where: { work_order_id: { in: ids }, status: { in: ["APPROVED", "PAID"] } }, select: { work_order_id: true, decided_at: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } }),
    prisma.paymentRequest.findMany({ where: { work_order_id: { in: ids } }, select: { id: true } }),
  ]);
  const payments = await prisma.paymentLine.findMany({ where: { payment_request_id: { in: allRequests.map((r) => r.id) } }, select: { amount_cents: true, payment: { select: { received_at: true } } } });
  const currency = wr.currency;
  const requested = wr.lines.reduce((n, l) => n + lineCents(l), 0);
  const orderedOf = (o: (typeof orders)[number]) => o.lines.reduce((n, l) => n + lineCents(l), 0);
  const ordered = orders.reduce((n, o) => n + orderedOf(o), 0);
  const settledCents = settled.reduce((n, s) => n + s.lines.reduce((m, l) => m + lineCents(l), 0), 0);
  const paidCents = payments.reduce((n, p) => n + p.amount_cents, 0);
  const latest = (ds: (Date | null | undefined)[]) => day(ds.filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0]);
  const target = focusOrderId ?? orders[0]?.id;
  const stages: Stage[] = [
    { key: "requested", label: "Requested", cents: wr.submitted_at ? requested : null, date: day(wr.submitted_at) },
    { key: "ordered", label: "Ordered", cents: orders.length ? ordered : null, date: latest(orders.map((o) => o.provider_accepted_at ?? o.created_at)) },
    { key: "settled", label: "Settled", cents: orders.length ? settledCents : null, date: latest(settled.map((s) => s.decided_at)), href: target ? `/orders/${target}?tab=settlements` : undefined },
    { key: "paid", label: "Paid", cents: orders.length ? paidCents : null, date: latest(payments.map((p) => p.payment.received_at)), href: target ? `/orders/${target}?tab=settlements` : undefined },
  ];
  const reached = (s: Stage) => (s.key === "requested" ? !!wr.submitted_at : s.key === "ordered" ? orders.length > 0 : (s.cents ?? 0) > 0);
  const current = stages.findIndex((s) => !reached(s));
  const base = Math.max(ordered, requested, 1);
  const pct = (c: number) => `${Math.min(100, Math.round((c / base) * 100))}%`;
  return (
    <section data-lifecycle className="mt-5 rounded-brand border border-line bg-white p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Life Cycle · {wr.wr_number ?? "Request"}</h2>
      <ol className="mt-3 grid grid-cols-4 gap-2">
        {stages.map((s, i) => {
          const done = reached(s);
          const next = i === current;
          const body = (
            <>
              <span className={done ? "mx-auto grid h-8 w-8 place-items-center rounded-full bg-magenta text-[14px] font-bold text-white" : next ? "mx-auto grid h-8 w-8 place-items-center rounded-full border-2 border-magenta text-[13px] font-bold text-magenta-dark" : "mx-auto grid h-8 w-8 place-items-center rounded-full border-2 border-[#C9CDDC] text-[13px] font-bold text-ink-3"} aria-hidden>{done ? "✓" : i + 1}</span>
              <span className={done || next ? "mt-1.5 block text-[13.5px] font-bold" : "mt-1.5 block text-[13.5px] font-bold text-ink-3"}>{s.label}</span>
              <span className="block text-[12.5px] tabular-nums text-ink-2">{s.cents == null ? "—" : formatCents(s.cents, currency)}</span>
              <span className="block text-[11.5px] text-ink-3">{s.date ?? ""}</span>
            </>
          );
          return (
            <li key={s.key} className="relative text-center" data-stage={s.key} data-done={done ? "yes" : "no"}>
              {i > 0 && <span aria-hidden className={done ? "absolute left-[-50%] right-[50%] top-4 -z-0 h-0.5 bg-magenta" : "absolute left-[-50%] right-[50%] top-4 -z-0 h-0.5 bg-[#C9CDDC]"} />}
              <span className="relative z-10 block">{s.href ? <Link href={s.href} className="block hover:underline">{body}</Link> : body}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4" aria-label="Ordered, settled and paid">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
          <div className="absolute inset-y-0 left-0 bg-ink/25" style={{ width: pct(ordered) }} />
          <div className="absolute inset-y-0 left-0 bg-ink/60" style={{ width: pct(settledCents) }} />
          <div className="absolute inset-y-0 left-0 bg-magenta" style={{ width: pct(paidCents) }} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px] text-ink-2">
          <span>Ordered {formatCents(ordered, currency)}</span><span>Settled {formatCents(settledCents, currency)}</span><span>Paid {formatCents(paidCents, currency)}</span>
        </p>
      </div>
      {orders.length > 1 && (
        <ul className="mt-3 border-t border-line pt-2 text-[13px]">
          {orders.map((o) => <li key={o.id} className="flex justify-between py-1"><Link href={`/orders/${o.id}`} className="font-mono font-semibold hover:underline">{o.order_number}</Link><span className="tabular-nums text-ink-2">{formatCents(orderedOf(o), currency)}</span></li>)}
        </ul>
      )}
    </section>
  );
}
