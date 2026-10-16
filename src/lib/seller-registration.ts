import { prisma } from "@/lib/prisma";

// SO-E003/E005: a seller is registered once Review is finished — or they were already live, or have a company (the old order).
export const SELLER_REG_STEPS = ["seller", "profile", "company", "locations", "review"] as const;
export type SellerRegStep = (typeof SELLER_REG_STEPS)[number];

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
  return { profileId: pp?.id ?? null, step: (pp?.registration_step as SellerRegStep | null) ?? null, registered, live: !!pp?.onboarding_completed_at };
}
