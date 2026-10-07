import type { Me } from "@/lib/types";

/** The three plan tiers, in order. Only the first two are reachable today. */
export type Plan = "Basic" | "Plus" | "Pro";

function plan(me: Me): Plan {
  if (me.buyerProfile?.subscriptionTier === "BUSINESS_PLUS") return "Plus";
  return "Basic";
}

function roleWord(me: Me): string | null {
  const r = me.person?.roles;
  if (!r) return null;
  // R1: recruiters are off; a coordinator is labelled by their other roles.
  if (r.isServiceProvider) return "Provider";
  if (r.isBuyer) return "Buyer";
  if (r.isRequester) return "Buyer";
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
