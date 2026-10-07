import { prisma } from "@/lib/prisma";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { LIFECYCLE, lifecycleStatus, type LifecycleFacts } from "@/lib/user-levels";

// Lifecycle loader for one person; the work-order gate reads the same Validate Company check.
const SIGNED = ["ACCEPTED", "RELEASED", "ACTIVE", "CLOSED"] as const;
const isUS = (country: string | null | undefined) => !country?.trim() || /^(us|usa|united states( of america)?)$/i.test(country.trim());

/** Step 5 for one company: legal name + tax ID + W-9 (US) or W-8BEN-E (outside the US). */
export async function companyChecklist(companyId: string) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, legal_name: true, tin: true, country: true, tax_form_uploaded_at: true },
  });
  if (!c) return null;
  const items = [
    { item: "Legal name", done: !!(c.legal_name ?? c.name)?.trim() },
    { item: "Tax ID", done: !!c.tin?.trim() },
    { item: isUS(c.country) ? "W-9" : "W-8BEN-E", done: !!c.tax_form_uploaded_at },
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
      providerProfile: { select: { completeness: true } },
      requesterProfile: { select: { completed_at: true } },
      companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true, role: true, company: { select: { p_account_id: true } } }, take: 1 },
    },
  });
  if (!p) return null;
  const m = p.companyMemberships[0];
  const check = m ? await companyChecklist(m.company_id) : null;
  const members = m ? (await prisma.companyMembership.findMany({ where: { company_id: m.company_id, status: "APPROVED" }, select: { person_id: true } })).map((x) => x.person_id) : [personId];
  const [contracts, payouts, payments] = await Promise.all([
    prisma.workOrder.count({ where: { status: { in: [...SIGNED] }, OR: [{ buyer_person_id: { in: members } }, { provider_person_id: { in: members } }] } }),
    prisma.providerPayout.count({ where: { provider_person_id: { in: members }, paid_at: { not: null } } }),
    m ? prisma.payment.count({ where: { p_account_id: m.company.p_account_id } }) : 0,
  ]);
  const facts: LifecycleFacts = {
    verified: !!p.user?.email_verified,
    profiled: p.is_service_provider ? (p.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD : !!p.requesterProfile?.completed_at,
    linked: !!m,
    validated: !!check?.ready,
    contracted: contracts > 0,
    paid: payouts + payments > 0,
  };
  return { steps: LIFECYCLE, ...lifecycleStatus(facts), isAdmin: m?.role === "ADMIN", companyName: check?.company ?? null };
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
  const [bc, sc] = await Promise.all([b ? companyChecklist(b.company_id) : null, s ? companyChecklist(s.company_id) : null]);
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
