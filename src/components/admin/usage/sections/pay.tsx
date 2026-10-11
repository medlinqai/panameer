import { prisma } from "@/lib/prisma";
import { daysBetween, fmtDays, inCur, listHref, median, metric, type Ctx } from "@/lib/admin-usage/core";
import { isoDay, type Lists } from "@/lib/admin-usage/lists";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E010: Pay — payment requests submitted / approved / rejected / paid, median days submit → approve and submit → paid,
// money in vs paid out per month (two separate charts, no dual axis).
async function data(c: Ctx) {
  const [prs, lines, payments, payouts, accounts] = await Promise.all([
    prisma.paymentRequest.findMany({ where: { submitted_at: { not: null } }, select: { id: true, payment_request_number: true, status: true, submitted_at: true, decided_at: true, provider_person_id: true } }),
    prisma.paymentLine.findMany({ select: { payment_request_id: true, created_at: true } }),
    prisma.payment.findMany({ select: { amount_cents: true, received_at: true, p_account_id: true } }),
    prisma.providerPayout.findMany({ where: { paid_at: { not: null } }, select: { net_cents: true, paid_at: true, provider_person_id: true } }),
    prisma.company.findMany({ select: { p_account_id: true, memberships: { where: { status: "APPROVED" }, select: { person_id: true } } } }),
  ]);
  const paidAt = new Map<string, Date>();
  for (const l of lines) if (!paidAt.get(l.payment_request_id) || l.created_at < paidAt.get(l.payment_request_id)!) paidAt.set(l.payment_request_id, l.created_at);
  const realAccount = new Set(accounts.filter((a) => a.memberships.some((m) => c.personOk(m.person_id))).map((a) => a.p_account_id));
  return {
    prs: prs.filter((p) => c.personOk(p.provider_person_id)),
    paidAt,
    payments: payments.filter((p) => c.includeTest || realAccount.has(p.p_account_id)),
    payouts: payouts.filter((p) => c.personOk(p.provider_person_id)),
  };
}

/** One point per month of the period (dollars). */
function monthly(c: Ctx, rows: { at: Date | null; cents: number }[]) {
  const months: string[] = [];
  for (let d = new Date(Date.UTC(c.from.getUTCFullYear(), c.from.getUTCMonth(), 1)); d <= c.to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(d.toISOString().slice(0, 10));
  const m = new Map(months.map((k) => [k.slice(0, 7), 0]));
  for (const r of rows) if (r.at && inCur(c, r.at)) { const k = r.at.toISOString().slice(0, 7); if (m.has(k)) m.set(k, m.get(k)! + r.cents); }
  return months.map((day) => ({ day, n: Math.round((m.get(day.slice(0, 7)) ?? 0) / 100) }));
}
const list = (title: string, rows: { id: string; payment_request_number: string; submitted_at: Date | null; status: string }[]) => ({ title, head: ["Payment request", "Submitted", "Status"], rows: rows.map((p) => ({ cells: [p.payment_request_number, isoDay(p.submitted_at), p.status], href: `/payments/payment-requests/${p.id}` })) });

export async function payLists(c: Ctx): Promise<Lists> {
  return {
    submitted: async () => list(`Submitted (${c.label})`, (await data(c)).prs.filter((p) => inCur(c, p.submitted_at))),
    approved: async () => list(`Approved (${c.label})`, (await data(c)).prs.filter((p) => (p.status === "APPROVED" || p.status === "PAID") && inCur(c, p.decided_at))),
    rejected: async () => list(`Rejected (${c.label})`, (await data(c)).prs.filter((p) => p.status === "REJECTED" && inCur(c, p.decided_at))),
    paid: async () => { const d = await data(c); return list(`Paid (${c.label})`, d.prs.filter((p) => p.status === "PAID" && inCur(c, d.paidAt.get(p.id)))); },
  };
}

export async function Pay({ c }: { c: Ctx }) {
  const d = await data(c);
  const approved = d.prs.filter((p) => (p.status === "APPROVED" || p.status === "PAID") && p.decided_at);
  const toApprove = approved.filter((p) => inCur(c, p.decided_at)).map((p) => daysBetween(p.submitted_at!, p.decided_at!));
  const toPaid = d.prs.filter((p) => p.status === "PAID" && inCur(c, d.paidAt.get(p.id))).map((p) => daysBetween(p.submitted_at!, d.paidAt.get(p.id)!));
  return (
    <div className="space-y-3">
      <Tiles>
        <Tile label="Submitted" {...metric(c, d.prs.map((p) => p.submitted_at))} href={listHref(c, "submitted")} />
        <Tile label="Approved" {...metric(c, approved.map((p) => p.decided_at))} href={listHref(c, "approved")} />
        <Tile label="Rejected" {...metric(c, d.prs.filter((p) => p.status === "REJECTED").map((p) => p.decided_at))} href={listHref(c, "rejected")} />
        <Tile label="Paid" {...metric(c, d.prs.filter((p) => p.status === "PAID").map((p) => d.paidAt.get(p.id)))} href={listHref(c, "paid")} />
      </Tiles>
      <Bars title="How Long It Takes" subtitle={`median days, ${c.label}`} rows={[
        { label: "Submit → approve", n: Math.round((median(toApprove) ?? 0) * 10) / 10 },
        { label: "Submit → paid", n: Math.round((median(toPaid) ?? 0) * 10) / 10 },
      ]} />
      <p className="text-[12.5px] text-ink-2">Submit → approve {fmtDays(median(toApprove))} · submit → paid {fmtDays(median(toPaid))}</p>
      <Grid2>
        <UsageChart title="Money In per Month ($)" subtitle="payments received from buyers" points={monthly(c, d.payments.map((p) => ({ at: p.received_at, cents: p.amount_cents })))} />
        <UsageChart title="Paid Out per Month ($)" subtitle="payouts to providers (net)" points={monthly(c, d.payouts.map((p) => ({ at: p.paid_at, cents: p.net_cents })))} />
      </Grid2>
    </div>
  );
}
