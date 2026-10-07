import { ROUTE_ACCESS } from "@/lib/route-access";

export type PublicCategory = 1 | 2 | 3 | 4 | 5;

export const CATEGORY_NAMES: Record<PublicCategory, string> = {
  1: "MENU + ROOT",
  2: "AUTH DOORS",
  3: "LEGAL",
  4: "TOKEN-ADDRESSED",
  5: "FRONT DOORS",
};

export type PublicRoute = {
  /** Filesystem route, dynamic segments in brackets. */
  route: string;
  category: PublicCategory;
  /** True when everything BELOW this path is public too. */
  subtree?: true;
  status?: "OPEN";
};

export const PUBLIC_ROUTES: PublicRoute[] = [
  { route: "/", category: 1 },
  { route: "/home", category: 1 },
  { route: "/training", category: 1 },
  { route: "/optimize", category: 1 },
  { route: "/talent", category: 1 },
  { route: "/work", category: 1 },
  { route: "/status", category: 1 },
  { route: "/marketplace", category: 1 },
  { route: "/integrate", category: 1 },
  { route: "/capability-domains", category: 1 },
  { route: "/ai-method", category: 1 },
  { route: "/pre-defined-services", category: 1 },
  { route: "/erp-integration", category: 1 },

  { route: "/login", category: 2 },
  { route: "/join", category: 2, subtree: true },

  { route: "/glossary", category: 3 },
  { route: "/terms", category: 3 },
  { route: "/user-agreement", category: 3 },
  { route: "/privacy", category: 3 },
  { route: "/legal", category: 3 },
  { route: "/legal/[slug]", category: 3 },
  { route: "/policies/[slug]", category: 3 },
  { route: "/company-terms", category: 3 },
  { route: "/unsubscribe", category: 3 },
  { route: "/trust", category: 3 },

  { route: "/verify/[credentialId]", category: 4 },
  { route: "/invite/accept", category: 4 },
  { route: "/invite/colleague/[token]", category: 4 },
  { route: "/validate/[token]", category: 4 },
  { route: "/validate/employer/[token]", category: 4 },
  { route: "/recommend/[token]", category: 4 },
  { route: "/verify-email", category: 4 },
  { route: "/forgot-password", category: 4 },
  { route: "/reset-password", category: 4 },
  { route: "/assess/claim/[token]", category: 4 },
  { route: "/assess/r/[token]", category: 4 },
  { route: "/assess/r/[token]/deck", category: 4 },

  { route: "/assess", category: 5 },
  { route: "/explore", category: 5 },
  { route: "/providers/[id]", category: 5 },
  { route: "/pro/[slug]", category: 5 },
  { route: "/in/[slug]", category: 5 },
  { route: "/why-panameer", category: 5 },
  { route: "/work-marketplace", category: 5, status: "OPEN" },

  { route: "/learn/courses", category: 5 },
  { route: "/learn/paths", category: 5 },
  { route: "/learn/[slug]", category: 5 },
  { route: "/learn/[slug]/course/[courseSlug]", category: 5 },
];

export const UNCLASSIFIED_PENDING_DECISION: {
  route: string;
  note: string;
}[] = [
  {
    route: "/assess/scope",
    note: "Phase-2 stub. Renders <ComingSoon> with no session read at all. Sits under /assess (category 5) but the brief's list stops at /assess itself.",
  },
  {
    route: "/assess/submitted",
    note: "The post-submit thank-you. No session read. Reached straight after the wizard, before the magic link creates the account.",
  },
];

/** Every gated prefix, straight from the map the proxy and guards both consume. */
export const GATED_PREFIXES: string[] = ROUTE_ACCESS.map((e) => e.prefix);

/** Does `route` match an allowlist entry (exact, or inside a subtree)? */
export function isPublicRoute(route: string): boolean {
  return PUBLIC_ROUTES.some((p) =>
    p.subtree ? route === p.route || route.startsWith(p.route + "/") : route === p.route
  );
}

/** The category for an allowlisted route, or null. */
export function publicCategory(route: string): PublicCategory | null {
  const hit = PUBLIC_ROUTES.find((p) =>
    p.subtree ? route === p.route || route.startsWith(p.route + "/") : route === p.route
  );
  return hit ? hit.category : null;
}

/** Is `route` covered by a prefix in `ROUTE_ACCESS` (i.e. gated at the edge)? */
export function isGatedPrefix(route: string): boolean {
  return GATED_PREFIXES.some((p) => route === p || route.startsWith(p + "/"));
}
