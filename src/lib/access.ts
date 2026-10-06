
//   // Single source of the marketplace visibility threshold (pure, seed-safe).
//   import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
// `isMarketplaceVisible` cannot fall back to a score it cannot see.

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

// Capabilities — the semantic API pages/handlers use. A page asks for a

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

// THE COMPANY GATE (brief_company_model WS4)

export type TransactDenial =
  | "NO_COMPANY"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "COMPANY_TOS";

export type TransactVerdict =
  | { ok: true }
  | { ok: false; reason: TransactDenial; companyName?: string };

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

/** Authoritative capability assertion — fail closed. Throws `AccessDeniedError` */
export function requireCapability(viewer: Viewer, cap: Capability): void {
  if (!hasCapability(viewer, cap)) throw new AccessDeniedError(cap);
}

/** Return a copy of `viewer` with its tenancy fence set to `pAccountId`. */
export function withPAccount(viewer: Viewer, pAccountId: string | null): Viewer {
  return { ...viewer, pAccountId };
}

/** Scope a Prisma `where` to the viewer's P-Account — the tenancy fence for */
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

/** Owner scope for a ProviderProfile query — the profile belonging to the viewer */
export function ownedProviderProfile(viewer: Viewer): {
  person: { user_id: string };
} {
  return { person: { user_id: viewer.userId } };
}

/** Owner scope for an EMPLOYER (a work-history job) — brief_per_job_skill_model */
export function ownedEmployer(viewer: Viewer, employerId: string) {
  return {
    id: employerId,
    providerProfile: ownedProviderProfile(viewer),
  };
}

/** Owner scope for a PROJECT — the finer grain under an Employer. */
export function ownedProject(viewer: Viewer, projectId: string) {
  return {
    id: projectId,
    providerProfile: ownedProviderProfile(viewer),
  };
}

/** Owner scope for a JOB SKILL, reached through whichever parent holds it. */
export function ownedJobSkill(viewer: Viewer, jobSkillId: string) {
  const owner = ownedProviderProfile(viewer);
  return {
    id: jobSkillId,
    OR: [
      { employer: { providerProfile: owner } },
      { project: { providerProfile: owner } },
    ],
  };
}

/** A JobSkill must hang off exactly one parent. */
export function assertOneJobParent(link: {
  employerId?: string | null;
  projectId?: string | null;
}): void {
  const parents = [link.employerId, link.projectId].filter(Boolean).length;
  if (parents !== 1) {
    throw new Error(
      `A job skill must attach to exactly one of employer or project (got ${parents}).`
    );
  }
}

// Marketplace visibility (brief_K — supersedes brief_E/H approval gating).

/** Is this provider marketplace-visible? Operates on the stored columns. */
export function isMarketplaceVisible(p: {
  status: string;
  completeness: number;
  paused_at: Date | null;
  /** WS6 — THE REQUIRED SET, met. This replaced the completeness threshold as */
  meetsRequired: boolean;
}): boolean {
  // THE PERCENTAGE FALLBACK IS GONE.
  return p.status === "ACTIVE" && p.paused_at == null && p.meetsRequired;
}

/** Does this profile carry the CONTACT block visibility requires? */
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

/** The required set, computed from a LOADED profile. */
export function providerMeetsRequired(p: {
  // THE TITLE MOVED TO `Person.title` WS-B).
  role_type_id: string | null;
  skills: unknown[];
  hourly_rate_cents: number | null;
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  person: {
    /* The TITLE, where it now lives (`E595` WS-B). */
    title: string | null;
    photo_url: string | null;
    phone: string | null;
    site?: { addresses?: unknown[] | null } | null;
  };
}): boolean {
  return Boolean(
    p.person.title?.trim() &&
      p.role_type_id &&
      p.skills.length > 0 &&
      (p.hourly_rate_cents != null ||
        p.rate_min_cents != null ||
        p.rate_max_cents != null ||
        p.onsite_rate_cents != null ||
        p.remote_rate_cents != null) &&
      p.person.photo_url &&
      p.person.phone?.trim() &&
      (p.person.site?.addresses?.length ?? 0) > 0
  );
}

/** Prisma `where`-fragment for marketplace-visible providers — use for listings */
/** TEST ACCOUNTS ARE HIDDEN FROM REAL MEMBERS HERE */
/** A PERSON ANOTHER MEMBER MAY SEE . */
export function memberVisibleWhere(viewerIsTest = false) {
  return {
    user: {
      is: {
        is_active: true,
        /* A test account is visible to other test accounts and to nobody else
           — the same rule `E793` set for the marketplace. */
        ...(viewerIsTest ? {} : { is_test: false }),
      },
    },
  };
}

export function marketplaceVisibleWhere(viewerIsTest = false) {
  return {
    status: "ACTIVE" as const,
    paused_at: null,
    // Title · Role · Skill · Rate
    // THE TITLE CLAUSE FOLLOWED THE COLUMN WS-B).
    role_type_id: { not: null },
    skills: { some: {} },
    OR: [
      { hourly_rate_cents: { not: null } },
      { rate_min_cents: { not: null } },
      { rate_max_cents: { not: null } },
      { onsite_rate_cents: { not: null } },
      { remote_rate_cents: { not: null } },
    ],
    // Photo · address · phone all live on the Person.
    person: {
      /** TEST ACCOUNTS ARE HIDDEN FROM REAL MEMBERS */
      /** DEACTIVATED ACCOUNTS LEAVE THE MARKETPLACE TOO */
      user: { is_active: true, ...(viewerIsTest ? {} : { is_test: false }) },
      // THE TITLE MOVED INTO THIS BLOCK WS-B), not beside it: a
      title: { not: null },
      photo_url: { not: null },
      phone: { not: null },
      site: { addresses: { some: {} } },
    },
  };
}

// Platform admin (brief_M) — the EXPLICIT admin path.

/** Assert the viewer is a platform admin — the gate every admin lib call uses */
export function requireAdmin(viewer: Viewer): void {
  requireCapability(viewer, "canAdminister");
}
