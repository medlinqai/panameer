/**
 * Access control — the Viewer pattern (carried from Medlinq).
 *
 * Every access-checked query helper takes a `viewer` as its FIRST argument,
 * even when currently unused, so access decisions are centralized here and
 * never inlined into components. Grow `deriveAccessFlags` and the `can*`
 * helpers as roles are defined in `claude/architecture.md`.
 */

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
    // The session/JWT does not carry the org (auth is deliberately lean); the
    // caller resolves it from the linked Person via `withPAccount`.
    pAccountId: null,
  };
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
 * Do NOT call this for PUBLIC reads. Published provider profiles and posted
 * work requests are shared surfaces meant to be seen across P-Accounts; scoping
 * them would break discovery. Those reads filter by visibility/status
 * (e.g. `{ published: true }`), never by `p_account_id`.
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
