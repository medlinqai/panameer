/**
 * Access control — the Viewer pattern (carried from Medlinq).
 *
 * Every access-checked query helper takes a `viewer` as its FIRST argument,
 * even when currently unused, so access decisions are centralized here and
 * never inlined into components. Grow `deriveAccessFlags` and the `can*`
 * helpers as roles are defined in `claude/architecture.md`.
 */

// Single source of the marketplace visibility threshold (pure, seed-safe).
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";

export type Role = "ADMIN" | "MEMBER";

export type AccessFlags = {
  isSystemAdmin: boolean;
  isAdmin: boolean;
};

/** Derive access flags ONCE from the persisted role set, so `isAdmin` can't drift. */
export function deriveAccessFlags(input: {
  role: string;
  isSystemAdmin: boolean;
}): AccessFlags {
  const isAdmin = input.isSystemAdmin || input.role === "ADMIN";
  return { isSystemAdmin: input.isSystemAdmin, isAdmin };
}

/**
 * The identity + capabilities passed as the first arg to access-checked helpers.
 *
 * `pAccountId` is the tenancy fence for PRIVATE data. It is null when the viewer
 * has no org yet (e.g. the system admin before onboarding, or a freshly signed-up
 * user). It is resolved from the viewer's linked Person, not carried in the JWT,
 * so auth stays untouched — enrich a session-built Viewer with `withPAccount`.
 */
export type Viewer = {
  userId: string;
  role: string;
  isSystemAdmin: boolean;
  isAdmin: boolean;
  // Actor-role flags — "roles as variables", carried in the JWT/session and
  // derived from the linked Person (brief_J). Pages ask for CAPABILITIES (below),
  // never these raw flags directly.
  isServiceBuyer: boolean;
  isServiceProvider: boolean;
  isServiceCoordinator: boolean;
  isSupport: boolean;
  pAccountId: string | null;
};

/** Build a Viewer from a NextAuth session (or null if unauthenticated). */
export function viewerFromSession(
  session:
    | {
        user?: {
          id?: string;
          role?: string;
          isSystemAdmin?: boolean;
          isAdmin?: boolean;
          isServiceBuyer?: boolean;
          isServiceProvider?: boolean;
          isServiceCoordinator?: boolean;
          isSupport?: boolean;
        };
      }
    | null
    | undefined
): Viewer | null {
  const u = session?.user;
  if (!u?.id) return null;
  return {
    userId: u.id,
    role: u.role ?? "MEMBER",
    isSystemAdmin: u.isSystemAdmin ?? false,
    isAdmin: u.isAdmin ?? false,
    isServiceBuyer: u.isServiceBuyer ?? false,
    isServiceProvider: u.isServiceProvider ?? false,
    isServiceCoordinator: u.isServiceCoordinator ?? false,
    isSupport: u.isSupport ?? false,
    // The session/JWT does not carry the org (auth is deliberately lean); the
    // caller resolves it from the linked Person via `withPAccount`.
    pAccountId: null,
  };
}

// ---------------------------------------------------------------------------
// Capabilities — the semantic API pages/handlers use. A page asks for a
// capability ("can this viewer hire talent?"), never a raw column name. These
// are the authoritative definitions the route map and guards resolve against.
//
// Capabilities are LITERAL (canHireTalent === is_service_buyer). System admin
// is its own axis (canAdminister) and does NOT auto-grant the actor
// capabilities — the seeded demo admin already carries provider/coordinator
// flags where it needs them.
// ---------------------------------------------------------------------------

export type Capability =
  | "canAdminister"
  | "canHireTalent"
  | "canProvideServices"
  | "canCoordinate"
  | "canSupport";

export const canAdminister = (v: Viewer): boolean => v.isSystemAdmin;
export const canHireTalent = (v: Viewer): boolean => v.isServiceBuyer;
export const canProvideServices = (v: Viewer): boolean => v.isServiceProvider;
export const canCoordinate = (v: Viewer): boolean => v.isServiceCoordinator;
export const canSupport = (v: Viewer): boolean => v.isSupport;

/** Resolve a capability by name against a viewer. */
export function hasCapability(viewer: Viewer, cap: Capability): boolean {
  switch (cap) {
    case "canAdminister":
      return canAdminister(viewer);
    case "canHireTalent":
      return canHireTalent(viewer);
    case "canProvideServices":
      return canProvideServices(viewer);
    case "canCoordinate":
      return canCoordinate(viewer);
    case "canSupport":
      return canSupport(viewer);
  }
}

/** Thrown by `requireCapability` when a viewer lacks the required capability. */
export class AccessDeniedError extends Error {
  constructor(public capability: Capability) {
    super(`Access denied: requires ${capability}`);
    this.name = "AccessDeniedError";
  }
}

/**
 * Authoritative capability assertion — fail closed. Throws `AccessDeniedError`
 * unless the viewer holds `cap`. Used by the server-side page/route guards.
 */
export function requireCapability(viewer: Viewer, cap: Capability): void {
  if (!hasCapability(viewer, cap)) throw new AccessDeniedError(cap);
}

/** Return a copy of `viewer` with its tenancy fence set to `pAccountId`. */
export function withPAccount(viewer: Viewer, pAccountId: string | null): Viewer {
  return { ...viewer, pAccountId };
}

/**
 * Scope a Prisma `where` to the viewer's P-Account — the tenancy fence for
 * PRIVATE business queries. Use this for anything that must not cross tenants
 * (a company's people, a buyer's draft work requests, billing, etc.).
 *
 * Throws if the viewer has no P-Account: a private query with an unknown fence
 * must fail loudly, never silently return another tenant's — or everyone's —
 * rows. System admins are NOT auto-exempted here; give admin tools an explicit,
 * separate path so a missing fence can never leak by default.
 *
 * ── Marketplace boundary ──────────────────────────────────────────────────
 * Do NOT call this for PUBLIC reads. Visible provider profiles and posted work
 * requests are shared surfaces meant to be seen across P-Accounts; scoping them
 * would break discovery. Those reads filter by visibility (the derived
 * status/completeness/paused predicate — see `marketplaceVisibleWhere()`),
 * never by `p_account_id`.
 */
export function scopedToPAccount<T extends Record<string, unknown>>(
  viewer: Viewer,
  where: T
): T & { p_account_id: string } {
  if (!viewer.pAccountId) {
    throw new Error(
      "scopedToPAccount: viewer has no P-Account; refusing to run an unscoped private query."
    );
  }
  return { ...where, p_account_id: viewer.pAccountId };
}

/**
 * Owner scope for a ProviderProfile query — the profile belonging to the viewer,
 * via the User↔Person 1:1 link. Every read/write in the provider Settings area
 * (brief_H) runs through this, so a viewer can only ever touch their OWN profile.
 * There is deliberately no way to target a profile by id — ownership is derived
 * from the session, never from client input, so cross-account access fails closed.
 *
 * Use as the `where` fragment for `providerProfile.findFirst` /
 * `updateMany`-style ownership checks:
 *   prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer) })
 */
export function ownedProviderProfile(viewer: Viewer): {
  person: { user_id: string };
} {
  return { person: { user_id: viewer.userId } };
}

// ---------------------------------------------------------------------------
// Marketplace visibility (brief_K — supersedes brief_E/H approval gating).
//
// A provider is visible in the marketplace when their account is ACTIVE, their
// profile is at least VISIBILITY_THRESHOLD (80%) complete, and they have not
// paused their listing. There is NO publish flag — visibility is DERIVED.
// Validation is a separate merit track and does NOT affect base visibility.
//
// Keep this predicate here, never inlined in components (conventions).
// The threshold itself is the single source in `completeness.ts` (imported).
// ---------------------------------------------------------------------------

/** Is this provider marketplace-visible? Operates on the stored columns. */
export function isMarketplaceVisible(p: {
  status: string;
  completeness: number;
  paused_at: Date | null;
  /**
   * PJv2 WS7 — identity is now an EXPLICIT condition, not merely a weight
   * inside `completeness`. At 80% a provider could clear the threshold while
   * still missing their date of birth, phone and address: 12 of 110 points is
   * not enough to force it. Visibility means completeness + identity + the
   * status/validation track — and explicitly NOT the old goal self-pick (E067).
   *
   * Optional so pre-WS7 callers that only pass the three scalar fields keep
   * compiling; when it is absent the identity condition is not applied, which
   * is the previous behaviour rather than a silent new refusal.
   */
  hasIdentity?: boolean;
}): boolean {
  return (
    p.status === "ACTIVE" &&
    p.completeness >= VISIBILITY_THRESHOLD &&
    p.paused_at == null &&
    (p.hasIdentity ?? true)
  );
}

/** Does this profile carry the identity block visibility requires (WS7)? */
export function hasIdentityBlock(p: {
  date_of_birth: Date | string | null;
  person?: {
    phone?: string | null;
    site?: { addresses?: unknown[] | null } | null;
  } | null;
}): boolean {
  return Boolean(
    p.date_of_birth &&
      p.person?.phone?.trim() &&
      (p.person?.site?.addresses?.length ?? 0) > 0
  );
}

/**
 * Prisma `where`-fragment for marketplace-visible providers — use for listings
 * and the public detail read so the DB never returns a hidden profile.
 */
export function marketplaceVisibleWhere() {
  return {
    status: "ACTIVE" as const,
    completeness: { gte: VISIBILITY_THRESHOLD },
    paused_at: null,
    // WS7 — kept in lockstep with `isMarketplaceVisible`. If the DB predicate
    // and the in-memory one disagree, a listing shows a profile whose detail
    // page then refuses to render it.
    date_of_birth: { not: null },
    person: {
      phone: { not: null },
      site: { addresses: { some: {} } },
    },
  };
}

// ---------------------------------------------------------------------------
// Platform admin (brief_M) — the EXPLICIT admin path.
//
// The admin console reads/writes are platform-wide BY DESIGN. This is NOT a
// tenancy-scope bypass: `scopedToPAccount` is the fence for TENANT users, and
// admin has a SEPARATE, explicit gate. Every admin lib call runs `requireAdmin`
// first (fail closed on `canAdminister`) and then queries across all
// P-Accounts. Keeping the entry point here — not inlined per query — makes the
// platform-wide boundary auditable in one place.
// ---------------------------------------------------------------------------

/**
 * Assert the viewer is a platform admin — the gate every admin lib call uses
 * before running an unscoped, platform-wide query. Throws AccessDeniedError
 * (canAdminister) otherwise. NOT a tenancy bypass — a deliberate, separate path.
 */
export function requireAdmin(viewer: Viewer): void {
  requireCapability(viewer, "canAdminister");
}
