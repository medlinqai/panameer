import type { BillingCycle, PaymentTerms, PaymentTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import { publishGate } from "@/lib/my-catalog";

// O-E004: the services a provider sells, each with a rate and billing terms. Owner-scoped from the session.
export type ProviderServiceInput = {
  name: string;
  serviceTypeId?: string | null;
  description?: string | null;
  minimumQuantity?: number | null;
  expenses?: "AT_COST" | "INCLUDED" | "NOT_APPLICABLE" | null;
  serviceType: "SERVICE_BY_QTY" | "SERVICE_BY_AMT";
  uom?: string | null;
  rateCents?: number | null;
  billingCycle: BillingCycle;
  paymentTerms: PaymentTerms;
  paymentTrigger: PaymentTrigger;
};

export type ProviderServiceRow = ProviderServiceInput & { id: string; active: boolean; published: boolean; serviceTypeName: string | null };

async function profileId(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  return p.id;
}

export async function listProviderServices(viewer: Viewer): Promise<ProviderServiceRow[]> {
  const pid = await profileId(viewer);
  const rows = await prisma.providerService.findMany({ where: { provider_profile_id: pid }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  const types = new Map((await prisma.serviceType.findMany({ where: { id: { in: rows.map((r) => r.service_type_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return rows.map((r) => ({ id: r.id, name: r.name, serviceTypeId: r.service_type_id, serviceTypeName: r.service_type_id ? types.get(r.service_type_id) ?? null : null, description: r.description, minimumQuantity: r.minimum_quantity == null ? null : Number(r.minimum_quantity), expenses: (r.expenses as ProviderServiceInput["expenses"]) ?? null, published: !!r.published_at, serviceType: r.service_type === "SERVICE_BY_AMT" ? "SERVICE_BY_AMT" : "SERVICE_BY_QTY", uom: r.uom, rateCents: r.rate_cents, billingCycle: r.billing_cycle, paymentTerms: r.payment_terms, paymentTrigger: r.payment_trigger, active: r.active }));
}

function data(input: ProviderServiceInput) {
  const name = (input.name ?? "").trim().slice(0, 200);
  if (!name) throw new OnboardingError("A service needs a name", "INVALID");
  const rate = input.rateCents == null ? null : Math.round(Number(input.rateCents));
  if (rate == null || !Number.isFinite(rate) || rate <= 0) throw new OnboardingError(input.serviceType === "SERVICE_BY_AMT" ? "Enter the not-to-exceed amount" : "Enter the rate", "INVALID");
  const byQty = input.serviceType === "SERVICE_BY_QTY";
  return {
    name,
    service_type: input.serviceType,
    uom: byQty ? (input.uom || "HOUR").toUpperCase().slice(0, 16) : null,
    rate_cents: rate,
    billing_cycle: input.billingCycle,
    payment_terms: input.paymentTerms,
    payment_trigger: input.paymentTrigger,
    ...(input.serviceTypeId !== undefined ? { service_type_id: input.serviceTypeId || null } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim().slice(0, 4000) || null } : {}),
    ...(input.minimumQuantity !== undefined ? { minimum_quantity: input.minimumQuantity && input.minimumQuantity > 0 ? input.minimumQuantity : null } : {}),
    ...(input.expenses !== undefined ? { expenses: input.expenses ?? null } : {}),
  };
}

/** CAT-E002/E004: save as draft, or publish — publishing needs a validated seller company. */
export async function saveProviderService(viewer: Viewer, id: string | null, input: ProviderServiceInput, publish = false) {
  const pid = await profileId(viewer);
  if (publish) {
    const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
    const gate = person ? await publishGate(person.id) : { ok: false, reason: null };
    if (!gate.ok) throw new OnboardingError("You can publish once your company is validated.", "INVALID");
  }
  const d = { ...data(input), published_at: publish ? new Date() : null };
  if (!id) return prisma.providerService.create({ data: { provider_profile_id: pid, ...d }, select: { id: true } });
  const done = await prisma.providerService.updateMany({ where: { id, provider_profile_id: pid }, data: d });
  if (done.count === 0) throw new OnboardingError("That service isn't yours", "INVALID");
  return { id };
}

/** Retired, not deleted: order lines keep their snapshot, and the id stays valid for punchout carts already returned. */
export async function retireProviderService(viewer: Viewer, id: string) {
  const pid = await profileId(viewer);
  await prisma.providerService.updateMany({ where: { id, provider_profile_id: pid }, data: { active: false } });
}
