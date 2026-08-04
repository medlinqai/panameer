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

// ---------------------------------------------------------------------------
// THE COMPANY GATE (brief_company_model WS4)
//
// Company membership is the identity primitive: no APPROVED membership on a
// company that has accepted the company ToS → the viewer cannot TRANSACT.
//
// WHY THIS ISN'T A `Capability`. That union is resolved synchronously from the
// JWT by both the guards AND the edge proxy, which has no database. Company
// state is a database read and can change between logins — an admin approving
// you must take effect without you signing out — so it is a separate, async
// check that pages and API routes call explicitly.
//
// PANAMEER STAFF ARE EXEMPT. They are employees performing setup, not a party
// to any contract, and gating them on a customer company would lock the
// operator out of their own console.
// ---------------------------------------------------------------------------

export type TransactDenial =
  | "NO_COMPANY"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "COMPANY_TOS";

export type TransactVerdict =
  | { ok: true }
  | { ok: false; reason: TransactDenial; companyName?: string };

/**
 * Can this viewer enter a transaction — post a Work Request, propose on work?
 *
 * Reads memberships through the injected loader so `access.ts` stays free of a
 * Prisma import (the edge proxy imports this module's types). `lib/guard.ts`
 * supplies the real loader.
 */
export function verifyTransactAbility(
  viewer: Viewer,
  binding: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    tosCurrent: boolean;
    company: { name: string };
  } | null
): TransactVerdict {
  if (viewer.isSystemAdmin) return { ok: true };
  if (!binding) return { ok: false, reason: "NO_COMPANY" };
  if (binding.status === "PENDING") {
    return { ok: false, reason: "PENDING_APPROVAL", companyName: binding.company.name };
  }
  if (binding.status === "REJECTED") {
    return { ok: false, reason: "REJECTED", companyName: binding.company.name };
  }
  if (!binding.tosCurrent) {
    return { ok: false, reason: "COMPANY_TOS", companyName: binding.company.name };
  }
  return { ok: true };
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
   * WS6 — THE REQUIRED SET, met. This replaced the completeness threshold as
   * the driver of visibility.
   *
   * A percentage was a reasonable proxy while the wizard asked eleven
   * questions. With six it is an indirect way of stating something the product
   * can now state directly, and an indirect gate is how "I answered everything
   * and I'm still invisible" happens — the arithmetic is silent. The set is
   * Title · Role · Skill · Rate · Photo · Company · address · phone; bio,
   * education, specializations, languages and date of birth are not in it.
   *
   * Optional so a caller that only has the three scalar columns still compiles
   * and behaves as before rather than silently refusing everyone.
   */
  meetsRequired?: boolean;
}): boolean {
  return (
    p.status === "ACTIVE" &&
    p.paused_at == null &&
    (p.meetsRequired ?? p.completeness >= VISIBILITY_THRESHOLD)
  );
}

/**
 * Does this profile carry the CONTACT block visibility requires?
 *
 * DATE OF BIRTH IS GONE (WS7). It was in here, and it is the single line that
 * would have kept every provider who walked the new six-step flow invisible:
 * the wizard stopped asking for it, this kept demanding it, and nothing would
 * have said so. Identity for marketplace purposes is now what a buyer actually
 * needs to reach someone — an address and a phone number.
 */
export function hasIdentityBlock(p: {
  date_of_birth?: Date | string | null;
  person?: {
    phone?: string | null;
    site?: { addresses?: unknown[] | null } | null;
  } | null;
}): boolean {
  return Boolean(
    p.person?.phone?.trim() && (p.person?.site?.addresses?.length ?? 0) > 0
  );
}

/**
 * The required set, computed from a LOADED profile.
 *
 * The in-memory gate and `marketplaceVisibleWhere` have to agree, and the
 * completeness score alone cannot carry that agreement: optional points can
 * compensate for a missing required item. A profile with every enrichment but
 * no company scores 96 — comfortably over any threshold — while the DB
 * predicate correctly excludes it. That disagreement is the listing-shows-what-
 * the-detail-page-refuses inversion, so the callers compute this instead.
 *
 * DELIBERATELY DEMANDING ABOUT ITS INPUT: every field is required, because a
 * caller that simply didn't load `companyMemberships` would otherwise get
 * "no company" and hide a perfectly valid provider. Missing data must be a
 * compile error, not a silent refusal.
 */
export function providerMeetsRequired(p: {
  headline: string | null;
  role_type_id: string | null;
  skills: unknown[];
  hourly_rate_cents: number | null;
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  person: {
    photo_url: string | null;
    phone: string | null;
    site?: { addresses?: unknown[] | null } | null;
    companyMemberships: { status: string }[];
  };
}): boolean {
  return Boolean(
    p.headline?.trim() &&
      p.role_type_id &&
      p.skills.length > 0 &&
      (p.hourly_rate_cents != null ||
        p.rate_min_cents != null ||
        p.rate_max_cents != null ||
        p.onsite_rate_cents != null ||
        p.remote_rate_cents != null) &&
      p.person.photo_url &&
      p.person.phone?.trim() &&
      (p.person.site?.addresses?.length ?? 0) > 0 &&
      p.person.companyMemberships.some((m) => m.status === "APPROVED")
  );
}

/**
 * Prisma `where`-fragment for marketplace-visible providers — use for listings
 * and the public detail read so the DB never returns a hidden profile.
 *
 * KEPT IN LOCKSTEP with `isMarketplaceVisible` and `missingRequired`. If the DB
 * predicate and the in-memory one disagree, a listing shows a profile whose
 * detail page then refuses to render it — which is worse than either being
 * wrong on its own, because it looks like a broken page rather than a hidden
 * profile. Every clause below is one item of the required set.
 */
export function marketplaceVisibleWhere() {
  return {
    status: "ACTIVE" as const,
    paused_at: null,
    // Title · Role · Skill · Rate
    headline: { not: "" },
    role_type_id: { not: null },
    skills: { some: {} },
    OR: [
      { hourly_rate_cents: { not: null } },
      { rate_min_cents: { not: null } },
      { rate_max_cents: { not: null } },
      { onsite_rate_cents: { not: null } },
      { remote_rate_cents: { not: null } },
    ],
    // Photo · Company · address · phone all live on the Person.
    person: {
      photo_url: { not: null },
      phone: { not: null },
      site: { addresses: { some: {} } },
      companyMemberships: { some: { status: "APPROVED" as const } },
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
