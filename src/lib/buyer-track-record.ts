import { prisma } from "@/lib/prisma";
import { companyChecklist } from "@/lib/your-path";

// Buyer Track Record (2026-10-07): built only from real activity. No history → "New buyer on Panameer", never zeros.
export type TrackRecord = {
  companyId: string;
  companyName: string;
  validated: boolean;
  memberSince: string;
  issued: number;
  completed: number;
  /** Null until payment terms exist: there is no due date to be on time against. */
  paidOnTimePct: number | null;
  avgDaysToPay: number | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  erp: string | null;
  isNew: boolean;
};
const LIVE = ["ISSUED", "ACCEPTED", "RELEASED", "ACTIVE", "CLOSED"] as const;
const DAY = 86_400_000;

export async function buyerTrackRecord(companyId: string): Promise<TrackRecord | null> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, created_at: true, entity_validated_at: true, industry_id: true, vertical: true, size_band: true, erp_used: true, country: true, p_account_id: true,
      memberships: { where: { status: "APPROVED" }, select: { person_id: true } },
      sites: { select: { addresses: { select: { city: true, state: true, country: true }, take: 1 } }, take: 1 },
    },
  });
  if (!c) return null;
  const members = c.memberships.map((m) => m.person_id);
  const [orders, check, industry, lines] = await Promise.all([
    members.length ? prisma.workOrder.findMany({ where: { buyer_person_id: { in: members }, status: { in: [...LIVE] } }, select: { status: true } }) : [],
    companyChecklist(companyId),
    c.industry_id ? prisma.specialization.findUnique({ where: { id: c.industry_id }, select: { name: true } }) : null,
    prisma.paymentLine.findMany({ where: { payment: { p_account_id: c.p_account_id } }, select: { settlement_request_id: true, payment: { select: { received_at: true } } } }),
  ]);
  const requests = lines.length ? await prisma.settlementRequest.findMany({ where: { id: { in: lines.map((l) => l.settlement_request_id) } }, select: { id: true, submitted_at: true } }) : [];
  const submitted = new Map(requests.map((r) => [r.id, r.submitted_at]));
  const days = lines.map((l) => { const s = submitted.get(l.settlement_request_id); return s && l.payment.received_at ? (l.payment.received_at.getTime() - s.getTime()) / DAY : null; }).filter((d): d is number => d != null && d >= 0);
  const a = c.sites[0]?.addresses[0];
  return {
    companyId: c.id,
    companyName: c.name,
    validated: !!c.entity_validated_at || !!check?.ready,
    memberSince: c.created_at.toISOString(),
    issued: orders.length,
    completed: orders.filter((o) => o.status === "CLOSED").length,
    paidOnTimePct: null,
    avgDaysToPay: days.length ? Math.round(days.reduce((n, d) => n + d, 0) / days.length) : null,
    industry: industry?.name ?? c.vertical ?? null,
    size: c.size_band,
    location: a ? [a.city, a.state, a.country].filter(Boolean).join(", ") || c.country : c.country,
    erp: c.erp_used,
    isNew: orders.length === 0,
  };
}

/** The buyer person's company track record (null when they have no company). */
export async function trackRecordForPerson(personId: string) {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  return m ? buyerTrackRecord(m.company_id) : null;
}
