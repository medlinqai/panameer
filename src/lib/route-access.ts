import type { Capability } from "@/lib/access";

/**
 * THE single source of truth mapping protected route prefixes → the capability
 * required to enter them (brief_J). Both enforcement layers consume this:
 *   - the edge proxy (`src/proxy.ts`), token-only, first line;
 *   - the server guards (`src/lib/guard.ts`), authoritative.
 *
 * Anything NOT listed here is not role-gated. In-flow / public routes are
 * deliberately absent — a user mid-signup has no role yet:
 *   /join/*, /verify-email, /invite/accept, /login, and public marketplace
 *   reads (/providers/[id]).
 */

/** A route needs either a specific capability or just any authenticated user. */
export type RouteRequirement = Capability | "authenticated";

/** Ordered list; the LONGEST matching prefix wins (most specific). */
export const ROUTE_ACCESS: { prefix: string; requires: RouteRequirement }[] = [
  { prefix: "/admin", requires: "canAdminister" },
  { prefix: "/coordinator", requires: "canCoordinate" }, // readied for brief_I
  { prefix: "/settings", requires: "canProvideServices" }, // provider profile mgmt
  { prefix: "/profile", requires: "canProvideServices" }, // provider self-profile view
  { prefix: "/hire", requires: "canHireTalent" },
  // FIND WORK IS A PROVIDER SURFACE — searching open job postings. This said
  // canHireTalent while nav.ts offered the same route to providers, so the rail
  // showed a provider "Find Work" and the gate then bounced them to
  // /dashboard?noaccess=1. Found by wiring the Home search box at it (E134) and
  // walking into the redirect. The nav was right; the gate was wrong.
  { prefix: "/work", requires: "canProvideServices" },
  { prefix: "/reports", requires: "canHireTalent" },
  { prefix: "/search", requires: "authenticated" }, // rail stub (E134)
  { prefix: "/contracts", requires: "authenticated" }, // rail stub (E134)
  { prefix: "/finances", requires: "authenticated" }, // rail stub (E134)
  { prefix: "/messages", requires: "authenticated" }, // shared buyer ↔ provider
  { prefix: "/dashboard", requires: "authenticated" }, // role-aware content, not gated
];

/**
 * The required capability for a path, or null if the path is not a mapped
 * protected route. Longest-prefix-wins so `/settings/x` beats a shorter match.
 */
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

/**
 * Does a flag set satisfy a requirement? `authenticated` is true by definition
 * — the caller must have already established a token/session before calling.
 * Capabilities are literal (no admin auto-grant); see access.ts.
 */
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

/**
 * Proxy `matcher` patterns derived from the map, so the edge runs on exactly the
 * mapped prefixes and the two can't drift. NOTE: Next reads `config.matcher`
 * statically — keep the literal in proxy.ts in sync with this and the test in
 * that file's comment. Exposed here for reference/tests.
 */
export const PROTECTED_PREFIX_MATCHERS = ROUTE_ACCESS.map(
  (e) => `${e.prefix}/:path*`
);
