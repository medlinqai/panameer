import { prisma } from "@/lib/prisma";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { payoutChecklist } from "@/lib/payout-requirements";
import { BUYER_ROAD, PROVIDER_ROAD, lifecycleStatus, type LifecycleFacts } from "@/lib/user-levels";

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
      providerProfile: { select: { id: true, completeness: true, _count: { select: { serviceProducts: { where: { status: "PUBLISHED" } } } } } },
      requesterProfile: { select: { completed_at: true } },
      companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true, role: true, company: { select: { p_account_id: true } } }, take: 1 },
      _count: { select: { companyMemberships: { where: { status: "PENDING" } } } },
    },
  });
  if (!p) return null;
  // BD-E003: a pending company join counts as done on the buyer road, shown as "Waiting for approval".
  const pending = !p.companyMemberships.length && p._count.companyMemberships > 0;
  const m = p.companyMemberships[0];
  const provider = p.is_service_provider;
  const check = m ? await companyChecklist(m.company_id, { payout: provider }) : null;
  const members = m ? (await prisma.companyMembership.findMany({ where: { company_id: m.company_id, status: "APPROVED" }, select: { person_id: true } })).map((x) => x.person_id) : [personId];
  const [contracts, delivered, payouts, payments, proposals, requests] = await Promise.all([
    prisma.workOrder.count({ where: { status: { in: [...SIGNED] }, OR: [{ buyer_person_id: { in: members } }, { provider_person_id: { in: members } }] } }),
    // RV-E002: Deliver — the buyer accepted a deliverable or a timesheet (an approved payment request), or the work order closed.
    provider
      ? Promise.all([
          prisma.workOrder.count({ where: { provider_person_id: { in: members }, status: { in: ["CLOSED", "FINALLY_CLOSED"] } } }),
          prisma.paymentRequest.count({ where: { provider_person_id: { in: members }, status: { in: ["APPROVED", "PAID"] } } }),
        ]).then(([a, b]) => a + b)
      : 0,
    prisma.providerPayout.count({ where: { provider_person_id: { in: members }, paid_at: { not: null } } }),
    m ? prisma.payment.count({ where: { p_account_id: m.company.p_account_id } }) : 0,
    provider ? prisma.proposal.count({ where: { provider_person_id: personId, submitted_at: { not: null } } }) : 0,
    provider ? prisma.paymentRequest.count({ where: { provider_person_id: { in: members }, submitted_at: { not: null } } }) : 0,
  ]);
  const liveRates = provider && p.providerProfile ? await prisma.providerService.count({ where: { provider_profile_id: p.providerProfile.id, active: true, published_at: { not: null }, rate_cents: { not: null } } }) : 0;
  const facts: LifecycleFacts = {
    // Scott 10-15: like the buyer road — sign-up done (company linked or asked to join, or email already verified) = stop 1 done.
    register: !!m || pending || !!p.user?.email_verified,
    verify: !!p.user?.email_verified,
    profile: provider ? (p.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD : !!p.requesterProfile?.completed_at,
    link: !!m,
    list: (p.providerProfile?._count.serviceProducts ?? 0) + liveRates + proposals > 0,
    validate: !!check?.ready,
    contract: contracts > 0,
    sell: contracts > 0,
    deliver: delivered > 0,
    request: requests > 0,
    paid: payouts + payments > 0,
  };
  if (!provider) {
    // BD-E005: the buyer road — found a provider (job, work request, estimate), ordered, approved work, paid.
    const [jobs, wrs, estimates, orders, approved, paid] = await Promise.all([
      prisma.job.count({ where: { buyer_person_id: { in: members }, posted_at: { not: null } } }),
      prisma.workRequest.count({ where: { buyer_person_id: { in: members }, lines: { some: {} } } }),
      prisma.estimateRequest.count({ where: { requester_person_id: { in: members } } }),
      prisma.workOrder.count({ where: { buyer_person_id: { in: members } } }),
      prisma.workOrder.findMany({ where: { buyer_person_id: { in: members } }, select: { id: true } }).then((wos) => prisma.paymentRequest.count({ where: { status: { in: ["APPROVED", "PAID"] }, work_order_id: { in: wos.map((w) => w.id) } } })),
      payments,
    ]);
    const buyerFacts: LifecycleFacts = { link: !!m || pending, find: jobs + wrs + estimates + orders > 0, order: orders > 0, approve: approved > 0, pay: paid > 0 };
    return { steps: BUYER_ROAD, road: "buyer" as const, ...lifecycleStatus(buyerFacts, BUYER_ROAD), waiting: pending ? { key: "link", label: "Waiting for approval" } : null, isAdmin: m?.role === "ADMIN", companyName: check?.company ?? null };
  }
  return { steps: PROVIDER_ROAD, road: "provider" as const, ...lifecycleStatus(facts, PROVIDER_ROAD), waiting: (pending ? { key: "register", label: "Waiting for approval" } : null) as { key: string; label: string } | null, isAdmin: m?.role === "ADMIN", companyName: check?.company ?? null };
}

export async function lifecycleForUser(userId: string) {
  const p = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
  return p ? lifecycleFor(p.id) : null;
}

/** WN-E001: what a buyer's company needs to place an order — legal name, billing address, invoice email. Never tax forms. */
export async function buyerOrderChecklist(companyId: string) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, legal_name: true, invoice_email: true, sites: { select: { addresses: { where: { is_bill_to: true }, select: { line1: true }, take: 1 } } } },
  });
  if (!c) return null;
  const items = [
    { item: "Legal name", done: !!(c.legal_name ?? c.name)?.trim(), href: "/company/legal?edit=legal#legal-tax" },
    { item: "Billing address", done: c.sites.some((s) => s.addresses.some((a) => a.line1.trim())), href: "/company/legal#billing" },
    { item: "Invoice email", done: !!c.invoice_email?.trim(), href: "/company/legal#billing" },
  ];
  return { company: c.name, items, ready: items.every((i) => i.done) };
}

export type SignGateItem = { company: string; item: string; done: boolean; href?: string };
export class SignGateError extends Error {
  constructor(public gate: { items: SignGateItem[]; isAdmin: boolean }) {
    super("Finish your company details to sign this work order");
    this.name = "SignGateError";
  }
}

/** WN-E001: an order / work order needs the buyer's company with legal name + billing address + invoice email, and the
 *  provider's company linked. No Tax ID, W-9 or W-8 for either side here — those wait for the payout (WN-E002). */
export async function assertCanSign(actingPersonId: string, buyerPersonId: string, providerPersonId: string) {
  const companyOf = async (personId: string) =>
    (await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true, role: true } })) ?? null;
  const [b, s] = await Promise.all([companyOf(buyerPersonId), companyOf(providerPersonId)]);
  const bc = b ? await buyerOrderChecklist(b.company_id) : null;
  if (bc?.ready && s) return;
  const buyerActs = actingPersonId === buyerPersonId;
  const providerCo = s ? (await prisma.company.findUnique({ where: { id: s.company_id }, select: { name: true } }))?.name ?? "The provider" : null;
  const items: SignGateItem[] = buyerActs
    ? [
        ...(bc ? bc.items.map((i) => ({ company: bc.company, ...i })) : [{ company: "Your company", item: "Add Company", done: false, href: "/company?join=1#join" }]),
        { company: providerCo ?? "The provider", item: "Linked", done: !!s },
      ]
    : [
        ...(s ? [] : [{ company: "Your company", item: "Add Company", done: false, href: "/company?join=1#join" }]),
        { company: bc?.company ?? "The buyer", item: "Billing details", done: !!bc?.ready },
      ];
  throw new SignGateError({ items, isAdmin: (buyerActs ? b : s)?.role === "ADMIN" });
}

/** RV-E004 / WN-E002: can the provider's company be paid out? Its country's Payout Requirements — the only place they're read. */
export async function providerPayReady(providerPersonId: string): Promise<boolean> {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: providerPersonId, status: "APPROVED" }, select: { company_id: true } });
  return !!m && !!(await payoutChecklist(m.company_id))?.ready;
}

/** RD-E003: the provider signed a work order before tax & banking — ask once (bell + worklist + email). */
export async function nudgeTaxBanking(providerPersonId: string) {
  if (await providerPayReady(providerPersonId)) return;
  const { notify } = await import("@/lib/notifications");
  await notify({ event: "work.tax_banking_needed", personId: providerPersonId, entityType: "person", entityId: providerPersonId, dedupeKey: `tax_banking.needed:${providerPersonId}`, vars: {} });
}
