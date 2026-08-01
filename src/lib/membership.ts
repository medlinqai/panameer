import type { Me } from "@/lib/types";

/**
 * The badge under a person's name in the rail chip
 * (brief_provider_home_page_v2 WS2 / E146.2 — the mockup reads
 * "Scott Walls / Freelancer Basic").
 *
 * DERIVED, not stored, and that is a gap worth naming rather than hiding: there
 * is no provider tier column. Plus is a BUYER-company tier
 * (`BuyerProfile.subscription_tier`, decisions-01), so a provider has nothing to
 * read. Billing is explicitly out of scope for this brief, so the label is
 * computed from what the schema actually knows — and when a real provider tier
 * lands, this is the one function that changes.
 *
 * "Freelancer" is the mockup's word for a provider. A person can be both a
 * provider and a buyer; the provider label wins, because the rail they are
 * looking at is the provider's.
 */
export function membershipBadge(me: Me | null): string | null {
  if (!me) return null;
  const r = me.person.roles;

  if (r.isServiceProvider) {
    // No provider tier exists yet — everyone is Basic until one does.
    return "Freelancer Basic";
  }
  if (r.isServiceBuyer) {
    return me.buyerProfile?.subscriptionTier === "BUSINESS_PLUS"
      ? "Business Plus"
      : "Business Basic";
  }
  if (r.isServiceCoordinator) return "Coordinator";
  if (r.isSupport) return "Support";
  return null;
}
