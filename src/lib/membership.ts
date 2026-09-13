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
  /* ⚠ NO PERSON, NO JOB. A signed-in user without a Person holds no actor flags,
     and inventing one would put a job title on an account that has none. */
  const r = me.person?.roles;
  if (!r) return null;
  if (r.isServiceCoordinator) return "Recruiter";
  if (r.isServiceProvider) return "Provider";
  /*
    ── ⚠⚠ BUYER BEFORE REQUESTER (`P1-A1.5-E444`) ─────────────────────────────

    ⚠ SUPERSEDED, quoted not deleted: *"REQUESTER BEFORE BUYER
    (brief_requester_home_v1 WS-A). Both carry `is_service_buyer`; owning a
    RequesterProfile is what separates the person who ASKS for work from the one
    who administers the company's buying."*

    ⚠ THAT PREMISE DIED WITH `E421`, WHICH GAVE A BUYER BOTH PROFILES — a
    `RequesterProfile` for wizard resume AND a `BuyerProfile`. From that day
    "owns a RequesterProfile" was true of every buyer, so this line badged all of
    them "Requester". Seen on screen: *"Bobby Da Buyer (21)"* rendering as
    Requester. ⚠ MEASURED: 45 rows read Requester and 12 read Buyer; the honest
    split is 38 and 11.

    ⚠ THE ORDER IS THE FIX, not a new flag: `BuyerProfile` is the narrower,
    deliberately-created record (only written when the person answered "buyer" at
    the fork), so it is tested FIRST and `RequesterProfile` is what remains.
    ⚠ NEITHER PROFILE → NEITHER JOB. `is_service_buyer` alone is somebody
    mid-signup who has not answered yet (10 rows), and naming them would be a
    guess — which is the defect this brief exists to remove.
  */
  if (r.isBuyer) return "Buyer";
  if (r.isRequester) return "Requester";
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
