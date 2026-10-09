import type { BillingCycle, PaymentTerms, PaymentTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";

// O-E004: the services a provider sells, each with a rate and billing terms. Owner-scoped from the session.
export type ProviderServiceInput = {
  name: string;
  serviceType: "SERVICE_BY_QTY" | "SERVICE_BY_AMT";
  uom?: string | null;
  rateCents?: number | null;
  billingCycle: BillingCycle;
  paymentTerms: PaymentTerms;
  paymentTrigger: PaymentTrigger;
};

export type ProviderServiceRow = ProviderServiceInput & { id: string; active: boolean };

async function profileId(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  return p.id;
}

export async function listProviderServices(viewer: Viewer): Promise<ProviderServiceRow[]> {
  const pid = await profileId(viewer);
  const rows = await prisma.providerService.findMany({ where: { provider_profile_id: pid }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  return rows.map((r) => ({ id: r.id, name: r.name, serviceType: r.service_type === "SERVICE_BY_AMT" ? "SERVICE_BY_AMT" : "SERVICE_BY_QTY", uom: r.uom, rateCents: r.rate_cents, billingCycle: r.billing_cycle, paymentTerms: r.payment_terms, paymentTrigger: r.payment_trigger, active: r.active }));
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
  } as const;
}

export async function saveProviderService(viewer: Viewer, id: string | null, input: ProviderServiceInput) {
  const pid = await profileId(viewer);
  if (!id) return prisma.providerService.create({ data: { provider_profile_id: pid, ...data(input) } });
  const done = await prisma.providerService.updateMany({ where: { id, provider_profile_id: pid }, data: data(input) });
  if (done.count === 0) throw new OnboardingError("That service isn't yours", "INVALID");
}

/** Retired, not deleted: order lines keep their snapshot, and the id stays valid for punchout carts already returned. */
export async function retireProviderService(viewer: Viewer, id: string) {
  const pid = await profileId(viewer);
  await prisma.providerService.updateMany({ where: { id, provider_profile_id: pid }, data: { active: false } });
}
