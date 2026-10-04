import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";

// Run 13: who did what, when — read from the timestamps the records already carry.
export type HistoryEvent = { at: string; who: string; what: string };

const settlementTotal = (lines: { basis: string; quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }[]) =>
  lines.reduce((n, l) => n + (l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0), 0);

async function names(ids: (string | null | undefined)[]) {
  const list = ids.filter((x): x is string => !!x);
  const rows = await prisma.person.findMany({ where: { id: { in: list } }, select: { id: true, first_name: true, last_name: true } });
  return new Map(rows.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
}

async function settlementEvents(ids: string[], who: Map<string, string>, withNumber: boolean): Promise<HistoryEvent[]> {
  if (ids.length === 0) return [];
  const reqs = await prisma.settlementRequest.findMany({ where: { id: { in: ids } }, include: { lines: true } });
  const deciders = await names(reqs.map((r) => r.decided_by_person_id));
  const out: HistoryEvent[] = [];
  for (const r of reqs) {
    const label = withNumber ? `payment request ${r.settlement_number} ` : "";
    const amount = formatCents(settlementTotal(r.lines), r.currency);
    if (r.submitted_at) out.push({ at: r.submitted_at.toISOString(), who: who.get(r.provider_person_id) ?? "Provider", what: `submitted ${label}for ${amount}` });
    if (r.decided_at && r.status !== "SUBMITTED") {
      const by = deciders.get(r.decided_by_person_id ?? "") ?? "Buyer";
      if (r.status === "REJECTED") out.push({ at: r.decided_at.toISOString(), who: by, what: `sent back ${label}— ${r.decision_note ?? ""}`.trim() });
      else out.push({ at: r.decided_at.toISOString(), who: by, what: `approved ${label}`.trim() });
    }
  }
  const lines = await prisma.paymentLine.findMany({ where: { settlement_request_id: { in: ids } }, include: { payment: true } });
  for (const l of lines) {
    const num = reqs.find((r) => r.id === l.settlement_request_id)?.settlement_number ?? "";
    out.push({ at: l.payment.received_at.toISOString(), who: "Panameer", what: `recorded the buyer's payment ${l.payment.payment_number}: ${formatCents(l.amount_cents, l.payment.currency)}${withNumber ? ` to ${num}` : ""}` });
  }
  const sLineIds = reqs.flatMap((r) => r.lines.map((l) => l.id));
  const payoutLines = await prisma.providerPayoutLine.findMany({ where: { settlement_line_id: { in: sLineIds } }, select: { providerPayout: true } });
  const seen = new Set<string>();
  for (const p of payoutLines) {
    if (seen.has(p.providerPayout.id) || !p.providerPayout.paid_at) continue;
    seen.add(p.providerPayout.id);
    out.push({ at: p.providerPayout.paid_at.toISOString(), who: "Panameer", what: `paid the provider ${formatCents(p.providerPayout.net_cents, p.providerPayout.currency)} (${p.providerPayout.payout_number})` });
  }
  return out;
}

const sortAsc = (e: HistoryEvent[]) => e.sort((a, b) => a.at.localeCompare(b.at));

export async function orderHistory(orderId: string): Promise<HistoryEvent[]> {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId } });
  if (!o) return [];
  const who = await names([o.buyer_person_id, o.provider_person_id]);
  const buyer = who.get(o.buyer_person_id) ?? "Buyer";
  const provider = who.get(o.provider_person_id) ?? "Provider";
  const out: HistoryEvent[] = [{ at: o.created_at.toISOString(), who: buyer, what: `created work order ${o.order_number}` }];
  if (o.provider_accepted_at) out.push({ at: o.provider_accepted_at.toISOString(), who: provider, what: "accepted the work order" });
  if (o.buyer_released_at) out.push({ at: o.buyer_released_at.toISOString(), who: buyer, what: "released the work order — work can start" });
  const reqs = await prisma.settlementRequest.findMany({ where: { work_order_id: o.id }, select: { id: true } });
  out.push(...(await settlementEvents(reqs.map((r) => r.id), who, true)));
  if (o.status === "CLOSED") out.push({ at: o.updated_at.toISOString(), who: "", what: "work order closed" });
  const events = await prisma.workOrderEvent.findMany({ where: { work_order_id: o.id }, orderBy: { created_at: "asc" } });
  const eventWho = await names(events.map((e) => e.person_id));
  for (const e of events) out.push({ at: e.created_at.toISOString(), who: eventWho.get(e.person_id ?? "") ?? "", what: e.text });
  return sortAsc(out);
}

export async function settlementHistory(settlementId: string): Promise<HistoryEvent[]> {
  const s = await prisma.settlementRequest.findUnique({ where: { id: settlementId }, select: { id: true, work_order_id: true, provider_person_id: true } });
  if (!s) return [];
  const o = await prisma.workOrder.findUnique({ where: { id: s.work_order_id }, select: { buyer_person_id: true } });
  const who = await names([s.provider_person_id, o?.buyer_person_id]);
  return sortAsc(await settlementEvents([s.id], who, false));
}
