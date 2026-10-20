import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { identityVisibleTo, providerLabel, providerNumbers } from "@/lib/provider-number";
import { PENDING_ON_LABEL, WORK_ORDER_LABEL, waitingOn } from "@/lib/oracle-status";
import { nextNumber } from "@/lib/numbering";
import { USER_TOS_VERSION } from "@/lib/tos";

// MS-E001: the Panameer Terms of Service serve as one global MSA; every Work Order is a SOW under the Active one.
export const MSA_TITLE = "Panameer Master Services Agreement (Terms of Service)";
export const MSA_URL = "/terms";

/** The Panameer company (its code numbers the MSA). */
async function panameerCompanyId(): Promise<string> {
  const c = await prisma.company.findFirst({ where: { code: "PANAM" }, select: { id: true } }) ?? await prisma.company.findFirst({ where: { name: "Panameer" }, orderBy: { created_at: "asc" }, select: { id: true } });
  if (c) return c.id;
  const acct = await prisma.pAccount.create({ data: { kind: "BOTH", name: "Panameer" }, select: { id: true } });
  return (await prisma.company.create({ data: { p_account_id: acct.id, name: "Panameer", code: "PANAM" }, select: { id: true } })).id;
}

/** The Active MSA for the current ToS version — created (and the old one Superseded) when the version changes. */
export async function activeMsa() {
  const live = await prisma.agreement.findFirst({ where: { kind: "MSA", status: "ACTIVE" }, orderBy: { effective_date: "desc" } });
  if (live && live.version === USER_TOS_VERSION) return live;
  const number = await nextNumber("MS", { companyId: await panameerCompanyId() });
  const created = await prisma.agreement.create({ data: { agreement_number: number, kind: "MSA", title: MSA_TITLE, version: USER_TOS_VERSION, effective_date: new Date(), document_url: MSA_URL } });
  if (live) await prisma.agreement.update({ where: { id: live.id }, data: { status: "SUPERSEDED" } });
  return created;
}

// ── MS-E003: the SOWs (Work Orders) under an MSA, as this viewer may see them ─────────────────────────────────────

export type SowRow = { id: string; number: string; buyer: string; provider: string; status: string; valueCents: number; settledCents: number; paidCents: number; period: string; currency: string };

const lineCents = (l: { quantity: unknown; unit_price_cents: number | null; amount_cents: number | null }) => l.amount_cents ?? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));

/** Buyer company: its Work Orders; provider: theirs; Panameer admin: all (optionally filtered by buyer account / provider). */
export async function sowsUnder(viewer: Viewer, agreementId: string, f: { buyer?: string; provider?: string } = {}): Promise<SowRow[]> {
  const admin = viewer.isSystemAdmin || viewer.isAdmin;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, company: { select: { p_account_id: true } } } });
  if (!me && !admin) return [];
  const where = admin
    ? { agreement_id: agreementId, ...(f.buyer ? { p_account_id: f.buyer } : {}), ...(f.provider ? { provider_person_id: f.provider } : {}) }
    : { agreement_id: agreementId, OR: [{ p_account_id: me!.company.p_account_id }, { buyer_person_id: me!.id }, { provider_person_id: me!.id }] };
  const orders = await prisma.workOrder.findMany({ where, orderBy: { created_at: "desc" }, select: { id: true, order_number: true, status: true, currency: true, p_account_id: true, provider_person_id: true, buyer_accepted_at: true, provider_accepted_at: true, period_start: true, period_end: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } });
  const ids = orders.map((o) => o.id);
  const [accounts, providers, requests] = await Promise.all([
    prisma.company.findMany({ where: { p_account_id: { in: orders.map((o) => o.p_account_id) } }, orderBy: { created_at: "asc" }, select: { p_account_id: true, name: true } }),
    prisma.person.findMany({ where: { id: { in: orders.map((o) => o.provider_person_id) } }, select: { id: true, first_name: true, last_name: true, providerProfile: { select: { id: true } } } }),
    prisma.paymentRequest.findMany({ where: { work_order_id: { in: ids } }, select: { id: true, work_order_id: true, status: true, lines: { select: { quantity: true, unit_price_cents: true, amount_cents: true } } } }),
  ]);
  const paid = await prisma.paymentLine.findMany({ where: { payment_request_id: { in: requests.map((r) => r.id) } }, select: { payment_request_id: true, amount_cents: true } });
  const companyOf = new Map<string, string>();
  for (const c of accounts) if (!companyOf.has(c.p_account_id)) companyOf.set(c.p_account_id, c.name);
  // AN rules: a provider shows as their Provider number until this viewer may see who they are.
  const seen = await identityVisibleTo(viewer, providers.map((p) => p.id));
  const numbers = await providerNumbers(providers.filter((p) => p.providerProfile && !seen.has(p.id)).map((p) => p.providerProfile!.id));
  const nameOf = new Map(providers.map((p) => [p.id, seen.has(p.id) || !p.providerProfile ? `${p.first_name} ${p.last_name}`.trim() : providerLabel(numbers.get(p.providerProfile.id))]));
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "…");
  return orders.map((o) => {
    const mine = requests.filter((r) => r.work_order_id === o.id);
    const w = waitingOn(o);
    return {
      id: o.id, number: o.order_number, buyer: companyOf.get(o.p_account_id) ?? "—", provider: nameOf.get(o.provider_person_id) ?? "—",
      status: w ? PENDING_ON_LABEL[w] : WORK_ORDER_LABEL[o.status], currency: o.currency,
      valueCents: o.lines.reduce((n, l) => n + lineCents(l), 0),
      settledCents: mine.filter((r) => r.status === "APPROVED" || r.status === "PAID").reduce((n, r) => n + r.lines.reduce((m, l) => m + lineCents(l), 0), 0),
      paidCents: paid.filter((p) => mine.some((r) => r.id === p.payment_request_id)).reduce((n, p) => n + p.amount_cents, 0),
      period: o.period_start || o.period_end ? `${day(o.period_start)} → ${day(o.period_end)}` : "—",
    };
  });
}
