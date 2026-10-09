import { prisma } from "@/lib/prisma";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { LIFECYCLE, PROVIDER_ROAD, lifecycleStatus, type LifecycleFacts } from "@/lib/user-levels";

// Lifecycle loader for one person; the work-order gate reads the same Validate Company check.
const SIGNED = ["ACCEPTED", "RELEASED", "ACTIVE", "CLOSED", "ON_HOLD", "FINALLY_CLOSED"] as const;
const isUS = (country: string | null | undefined) => !country?.trim() || /^(us|usa|united states( of america)?)$/i.test(country.trim());

/** Validate Company: legal name + tax ID + W-9 / W-8BEN-E; a provider's company also needs a payout account (always in the legal name). */
export async function companyChecklist(companyId: string, { payout = false } = {}) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, legal_name: true, tin: true, country: true, tax_form_uploaded_at: true, _count: { select: { payoutMethods: true } } },
  });
  if (!c) return null;
  const items = [
    { item: "Legal name", done: !!(c.legal_name ?? c.name)?.trim() },
    { item: "Tax ID", done: !!c.tin?.trim() },
    { item: isUS(c.country) ? "W-9" : "W-8BEN-E", done: !!c.tax_form_uploaded_at },
    ...(payout ? [{ item: "Payout account", done: c._count.payoutMethods > 0 }] : []),
  ];
  return { company: c.name, items, ready: items.every((i) => i.done) };
}

/** Profiled: providers reach the Search Score bar (80 = required set); buyer-only people finish their profile. */
export async function lifecycleFor(personId: string) {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      is_service_provider: true,
      user: { select: { email_verified: true } },
      providerProfile: { select: { completeness: true, _count: { select: { serviceProducts: { where: { status: "PUBLISHED" } } } } } },
      requesterProfile: { select: { completed_at: true } },
      companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true, role: true, company: { select: { p_account_id: true } } }, take: 1 },
    },
  });
  if (!p) return null;
  const m = p.companyMemberships[0];
  const provider = p.is_service_provider;
  const check = m ? await companyChecklist(m.company_id, { payout: provider }) : null;
  const members = m ? (await prisma.companyMembership.findMany({ where: { company_id: m.company_id, status: "APPROVED" }, select: { person_id: true } })).map((x) => x.person_id) : [personId];
  const [contracts, payouts, payments, proposals, requests] = await Promise.all([
    prisma.workOrder.count({ where: { status: { in: [...SIGNED] }, OR: [{ buyer_person_id: { in: members } }, { provider_person_id: { in: members } }] } }),
    prisma.providerPayout.count({ where: { provider_person_id: { in: members }, paid_at: { not: null } } }),
    m ? prisma.payment.count({ where: { p_account_id: m.company.p_account_id } }) : 0,
    provider ? prisma.proposal.count({ where: { provider_person_id: personId, submitted_at: { not: null } } }) : 0,
    provider ? prisma.settlementRequest.count({ where: { provider_person_id: { in: members }, submitted_at: { not: null } } }) : 0,
  ]);
  const facts: LifecycleFacts = {
    verify: !!p.user?.email_verified,
    profile: provider ? (p.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD : !!p.requesterProfile?.completed_at,
    link: !!m,
    list: (p.providerProfile?._count.serviceProducts ?? 0) + proposals > 0,
    validate: !!check?.ready,
    contract: contracts > 0,
    request: requests > 0,
    paid: payouts + payments > 0,
  };
  const steps = provider ? PROVIDER_ROAD : LIFECYCLE;
  return { steps, road: provider ? ("provider" as const) : ("buyer" as const), ...lifecycleStatus(facts, steps), isAdmin: m?.role === "ADMIN", companyName: check?.company ?? null };
}

export async function lifecycleForUser(userId: string) {
  const p = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
  return p ? lifecycleFor(p.id) : null;
}

export class SignGateError extends Error {
  constructor(public gate: { items: { company: string; item: string; done: boolean }[]; isAdmin: boolean }) {
    super("Validate your company to sign this work order");
    this.name = "SignGateError";
  }
}

/** Get Contracted (step 6) needs both companies Validated (step 5) before a work order is awarded, issued or signed. */
export async function assertCanSign(actingPersonId: string, buyerPersonId: string, providerPersonId: string) {
  const companyOf = async (personId: string) =>
    (await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true, role: true } })) ?? null;
  const [b, s] = await Promise.all([companyOf(buyerPersonId), companyOf(providerPersonId)]);
  const [bc, sc] = await Promise.all([b ? companyChecklist(b.company_id) : null, s ? companyChecklist(s.company_id, { payout: true }) : null]);
  if (bc?.ready && sc?.ready) return;
  const buyerActs = actingPersonId === buyerPersonId;
  const own = buyerActs ? bc : sc;
  const other = buyerActs ? sc : bc;
  const items = [
    ...(own ? own.items.map((i) => ({ company: own.company, ...i })) : [{ company: "Your company", item: "Add Company", done: false }]),
    { company: other?.company ?? (buyerActs ? "The provider" : "The buyer"), item: "Validated", done: !!other?.ready },
  ];
  throw new SignGateError({ items, isAdmin: (buyerActs ? b : s)?.role === "ADMIN" });
}
