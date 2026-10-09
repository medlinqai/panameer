import type { Capability } from "@/lib/access";

/** A route needs either a specific capability or just any authenticated user. */
export type RouteRequirement = Capability | "authenticated";

/** Ordered list; the LONGEST matching prefix wins (most specific). */
export const ROUTE_ACCESS: { prefix: string; requires: RouteRequirement }[] = [
  { prefix: "/admin", requires: "canAdminister" },
  { prefix: "/coordinator", requires: "canCoordinate" }, // readied for brief_I
  { prefix: "/settings", requires: "authenticated" },
  { prefix: "/my-services", requires: "canProvideServices" },
  { prefix: "/settings/packages", requires: "canProvideServices" },
  { prefix: "/settings/services", requires: "canProvideServices" },
  { prefix: "/settings/profile", requires: "canProvideServices" },
  { prefix: "/settings/withdrawals", requires: "canProvideServices" },
  { prefix: "/profile", requires: "authenticated" },
  { prefix: "/usage", requires: "authenticated" },
  { prefix: "/your-path", requires: "authenticated" },
  { prefix: "/account-health", requires: "authenticated" },
  { prefix: "/worklist", requires: "authenticated" },
  { prefix: "/hire", requires: "canHireTalent" },
  { prefix: "/work-requests", requires: "canHireTalent" },
  // FIND WORK IS A PROVIDER SURFACE — searching open job postings. This said
  { prefix: "/find-work", requires: "canProvideServices" },
  { prefix: "/find-work/new", requires: "canHireTalent" },
  { prefix: "/reports", requires: "canHireTalent" },
  { prefix: "/search", requires: "authenticated" }, 
  { prefix: "/orders", requires: "authenticated" },
  { prefix: "/pay", requires: "canHireTalent" },
  { prefix: "/payments", requires: "authenticated" },
  { prefix: "/finances", requires: "authenticated" },
  { prefix: "/messages", requires: "authenticated" }, // shared buyer ↔ provider
  { prefix: "/connect", requires: "authenticated" },
  { prefix: "/companies", requires: "authenticated" }, // buyer-safe company pages
  { prefix: "/company", requires: "authenticated" },
  { prefix: "/support", requires: "authenticated" },
  { prefix: "/services/offers", requires: "canProvideServices" },
  { prefix: "/dashboard", requires: "authenticated" }, // role-aware content, not gated
];

export function requirementForPath(pathname: string): RouteRequirement | null {
  let best: { prefix: string; requires: RouteRequirement } | null = null;
  for (const entry of ROUTE_ACCESS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best ? best.requires : null;
}

/** The flag set both a JWT token and a Viewer can supply for a check. */
export type CapabilityFlags = {
  isSystemAdmin: boolean;
  isServiceBuyer: boolean;
  isServiceProvider: boolean;
  isServiceCoordinator: boolean;
  isSupport: boolean;
};

export function meetsRequirement(
  flags: CapabilityFlags,
  req: RouteRequirement
): boolean {
  switch (req) {
    case "authenticated":
      return true;
    case "canAdminister":
      return flags.isSystemAdmin;
    case "canHireTalent":
      return flags.isServiceBuyer;
    case "canProvideServices":
      return flags.isServiceProvider;
    case "canCoordinate":
      return flags.isServiceCoordinator;
    case "canSupport":
      return flags.isSupport;
  }
}

export const PROTECTED_PREFIX_MATCHERS = ROUTE_ACCESS.map(
  (e) => `${e.prefix}/:path*`
);
