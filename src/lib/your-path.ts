import { prisma } from "@/lib/prisma";
import { PATH_STEPS, pathStatus, type PathFacts, type PathRole } from "@/lib/user-levels";

// Your Path: loads the facts for one person; the work-order sign gate reads the same company check.
const SIGNED = ["ACCEPTED", "RELEASED", "ACTIVE", "CLOSED"] as const;

/** Step 4 for one company: legal name + state + tax ID + who gets paid (+ billing method for a buyer). No address. */
export async function companyChecklist(companyId: string, side: PathRole) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, legal_name: true, state_of_filing: true, tin: true, payee_type: true, memberships: { where: { status: "APPROVED" }, select: { person_id: true } } },
  });
  if (!c) return null;
  const items = [
    { item: "Legal name", done: !!(c.legal_name ?? c.name)?.trim() },
    { item: "State of filing + tax ID", done: !!c.state_of_filing?.trim() && !!c.tin?.trim() },
    { item: "Who gets paid", done: true },
  ];
  if (side === "buyer") {
    const billing = await prisma.billingMethod.count({ where: { person_id: { in: c.memberships.map((m) => m.person_id) } } });
    items.push({ item: "Billing method", done: billing > 0 });
  }
  return { company: c.name, items, ready: items.every((i) => i.done) };
}

export async function pathFor(personId: string, asRole?: PathRole) {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      is_service_provider: true,
      is_service_buyer: true,
      user: { select: { email_verified: true } },
      providerProfile: { select: { onboarding_completed_at: true } },
      requesterProfile: { select: { completed_at: true } },
      companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true, role: true }, take: 1 },
    },
  });
  if (!p) return null;
  const role: PathRole = asRole ?? (p.is_service_provider || !p.is_service_buyer ? "provider" : "buyer");
  const m = p.companyMemberships[0];
  const check = m ? await companyChecklist(m.company_id, role) : null;
  const [work, done] = await Promise.all([
    role === "provider"
      ? prisma.workOrder.count({ where: { provider_person_id: personId, status: { in: [...SIGNED] } } })
      : prisma.workRequest.count({ where: { buyer_person_id: personId, status: { not: "DRAFT" } } }),
    role === "provider"
      ? m ? prisma.payoutMethod.count({ where: { company_id: m.company_id } }) : 0
      : prisma.workOrder.count({ where: { buyer_person_id: personId, status: { in: [...SIGNED] } } }),
  ]);
  const facts: PathFacts = {
    emailVerified: !!p.user?.email_verified,
    profileDone: role === "provider" ? !!p.providerProfile?.onboarding_completed_at : !!(p.requesterProfile?.completed_at ?? p.providerProfile?.onboarding_completed_at),
    inCompany: !!m,
    companyVerified: !!check?.ready,
    work: work > 0,
    done: done > 0,
  };
  const s = pathStatus(facts);
  return { role, steps: PATH_STEPS[role], ...s, isAdmin: m?.role === "ADMIN", companyName: check?.company ?? null };
}

export async function pathForUser(userId: string, asRole?: PathRole) {
  const p = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
  return p ? pathFor(p.id, asRole) : null;
}

export class SignGateError extends Error {
  constructor(public gate: { items: { company: string; item: string; done: boolean }[]; isAdmin: boolean }) {
    super("Finish Legal & Tax to sign this work order");
    this.name = "SignGateError";
  }
}

/** The only block on the path: both companies at step 4 before a work order is awarded, issued or signed. */
export async function assertCanSign(actingPersonId: string, buyerPersonId: string, providerPersonId: string) {
  const companyOf = async (personId: string) =>
    (await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true, role: true, person_id: true } })) ?? null;
  const [b, s] = await Promise.all([companyOf(buyerPersonId), companyOf(providerPersonId)]);
  const [bc, sc] = await Promise.all([b ? companyChecklist(b.company_id, "buyer") : null, s ? companyChecklist(s.company_id, "provider") : null]);
  if (bc?.ready && sc?.ready) return;
  const buyerActs = actingPersonId === buyerPersonId;
  // Your own company's items in full; the other side is shown only as Verified / not yet.
  const own = buyerActs ? bc : sc;
  const other = buyerActs ? sc : bc;
  const items = [
    ...(own ? own.items.map((i) => ({ company: own.company, ...i })) : [{ company: "Your company", item: "Join or add your company", done: false }]),
    { company: other?.company ?? (buyerActs ? "The provider" : "The buyer"), item: "Legal & tax", done: !!other?.ready },
  ];
  const mine = buyerActs ? b : s;
  throw new SignGateError({ items, isAdmin: mine?.role === "ADMIN" });
}
