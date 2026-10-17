import { prisma } from "@/lib/prisma";

// SO-E003/E005: a seller is registered once Review is finished — or they were already live, or have a company (the old order).
// RF-E001 (Scott 10-17): Résumé · Seller · Company · Review. Old keys map: profile → resume, locations → company.
export const SELLER_REG_STEPS = ["resume", "seller", "company", "locations", "review"] as const;
export type SellerRegStep = (typeof SELLER_REG_STEPS)[number];
const OLD_STEP: Record<string, SellerRegStep> = { profile: "resume" };
export const regStep = (s: string | null | undefined): SellerRegStep | null => (s ? OLD_STEP[s] ?? ((SELLER_REG_STEPS as readonly string[]).includes(s) ? (s as SellerRegStep) : null) : null);

export async function sellerRegistration(personId: string) {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      providerProfile: { select: { id: true, registration_step: true, registration_completed_at: true, onboarding_completed_at: true } },
      _count: { select: { companyMemberships: { where: { status: { in: ["APPROVED", "PENDING"] } } } } },
    },
  });
  const pp = p?.providerProfile;
  const registered = !!pp && (!!pp.registration_completed_at || !!pp.onboarding_completed_at || (!pp.registration_step && p!._count.companyMemberships > 0));
  return { profileId: pp?.id ?? null, step: regStep(pp?.registration_step), registered, live: !!pp?.onboarding_completed_at };
}
