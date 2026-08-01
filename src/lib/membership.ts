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
 * WS7 replaces the flat "Freelancer Basic" with {Role} {Plan}: Provider Basic,
 * Recruiter Basic, Buyer Basic, each escalating to Plus then Pro. "Freelancer"
 * was the mockup's word, but the product calls them Providers everywhere else
 * and two words for one actor is the thing WS4 is elsewhere purging.
 *
 * A person can be both a provider and a buyer; the provider label wins, because
 * the rail they are looking at is the provider's.
 */
/** The three plan tiers, in order. Only the first two are reachable today. */
export type Plan = "Basic" | "Plus" | "Pro";

/**
 * The plan half of the badge.
 *
 * Still derived — there is no tier column on either profile — but the ladder is
 * named here so the escalation is a data question rather than a code change:
 * when a real tier lands, this reads it and nothing else moves.
 */
function plan(me: Me): Plan {
  if (me.buyerProfile?.subscriptionTier === "BUSINESS_PLUS") return "Plus";
  return "Basic";
}

/**
 * The role half — Provider, Recruiter or Buyer, per WS7.
 *
 * RECRUITER IS THE SERVICE COORDINATOR ACTOR. There is no separate recruiter
 * flag: the model records someone who represents other providers as
 * `is_service_coordinator`, and ProviderProfile.coordinator_person_id points
 * back at them. So the coordinator flag is checked FIRST — a recruiter usually
 * carries the provider flag too (they walk the provider wizard on the recruiter
 * itinerary), and testing provider first would label every recruiter a
 * Provider.
 */
function roleWord(me: Me): string | null {
  const r = me.person.roles;
  if (r.isServiceCoordinator) return "Recruiter";
  if (r.isServiceProvider) return "Provider";
  if (r.isServiceBuyer) return "Buyer";
  if (r.isSupport) return "Support";
  return null;
}

export function membershipBadge(me: Me | null): string | null {
  if (!me) return null;
  const role = roleWord(me);
  if (!role) return null;
  // Support isn't a plan anyone buys.
  if (role === "Support") return role;
  return `${role} ${plan(me)}`;
}
