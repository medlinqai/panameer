
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
//
//
// company left registration entirely: no journey asks for one, so no buyer
// could ever have satisfied this, and it would have refused every work request
// waiting for its event. See the TODO on `acceptOrder` in `lib/orders.ts`, the
// ---------------------------------------------------------------------------

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

/**
 * Owner scope for an EMPLOYER (a work-history job) — brief_per_job_skill_model
 * WS-1.
 *
 * Jobs stopped being decoration when skills moved onto them. An Employer now
 * carries the suite, the role and the skill list that the provider's entire
 * weighted profile is computed from, so "edit this job" is a write against the
 * thing matching ranks on. The id arrives from the client, as it must; what
 * must not is the OWNERSHIP, so it is joined back to the session here rather
 * than trusted.
 *
 *     prisma.employer.update({ where: ownedEmployer(viewer, id), ... })
 *
 * A non-owner gets a not-found, not a forbidden — the same shape as a job that
 * does not exist, which is the correct answer to "does this id belong to
 * someone else".
 */
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

/**
 * Owner scope for a JOB SKILL, reached through whichever parent holds it.
 *
 * `JobSkill` hangs off an Employer OR a Project, so there is no single join to
 * the provider — the OR is the whole reason this is a function and not an
 * inline `where`. Written once here so the two-parent shape cannot be
 * half-remembered at a call site and leave one branch unscoped.
 */
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

/**
 * A JobSkill must hang off exactly one parent.
 *
 * Prisma cannot express an XOR, and a row attached to both an Employer and a
 * Project would be double-counted by the rollup — the skill would inherit two
 * job durations and read as twice the depth it is. Checked at the write, where
 * a readable error beats a constraint violation, and stated here so both the
 * API and the parser import path check the same thing.
 */
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
   * Title · Role · Skill · Rate · Photo · address · phone; bio, education,
   * specializations, languages and date of birth are not in it.
   * ⚠ `Company` LEFT THE SET IN `P1-A1.4-E418` — no journey asks for one, and a
   * requirement the wizard cannot satisfy is the invisible-profile bug itself.
   *
   * ── ⚠⚠⚠ REQUIRED AS OF `P2-J3-E590` WS-A0. THERE IS ONE GATE NOW. ────────
   *
   * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the optionality and the reason
   * given for it:
   * // Optional so a caller that only has the three scalar columns still compiles
   * // and behaves as before rather than silently refusing everyone.
   * // meetsRequired?: boolean;
   *
   * ⚠⚠ THAT COMFORT WAS THE DEFECT (`E585`). "Behaves as before" meant falling
   * back to `completeness >= VISIBILITY_THRESHOLD`, so the app carried TWO
   * gates: 3 call sites asked whether the required set was met, and 5 asked
   * whether a SCORE cleared 80. ⚠ MEASURED 2026-09-20: the two disagreed on
   * **6 real profiles** — visible on five surfaces, invisible on three, at the
   * same moment.
   *
   * ⚠⚠ MAKING IT REQUIRED IS THE POINT, NOT A TIDY-UP. Scott's standing
   * pattern: *"A forgetful sender being a compile error rather than a silent
   * gap is worth more than any check we could write after the fact."* The type
   * checker found all five sites; this brief had already miscounted by hand
   * twice.
   */
  meetsRequired: boolean;
}): boolean {
  /*
    ⚠⚠⚠ THE PERCENTAGE FALLBACK IS GONE. ⚠ SUPERSEDED, quoted not deleted
    (`E164`):
    // return (
    //   p.status === "ACTIVE" &&
    //   p.paused_at == null &&
    //   (p.meetsRequired ?? p.completeness >= VISIBILITY_THRESHOLD)
    // );
    ⚠⚠ WHILE THAT `??` EXISTED THE SCORE WAS STILL A GATE, and every reassurance
    that a weight change is safe was false. `E590` re-weights `completeness.ts`;
    it can only do that once nothing gates on the number.
  */
  return p.status === "ACTIVE" && p.paused_at == null && p.meetsRequired;
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
 * compensate for a missing required item. The two predicates are kept clause
 * for clause, and that is the whole reason this exists rather than a threshold.
 *
 * ⚠ THE COMPANY CLAUSE CAME OUT OF BOTH IN ONE CHANGE (`P1-A1.4-E418`).
 * ⚠ SUPERSEDED, quoted not deleted:
 *     `p.person.companyMemberships.some((m) => m.status === "APPROVED")`
 * and the example that justified the whole function: *"A profile with every
 * enrichment but no company scores 96 — comfortably over any threshold — while
 * the DB predicate correctly excludes it."* ⚠ THAT EXAMPLE IS SPENT, not wrong:
 * with no company step, EVERY provider is the profile it describes, so the
 * clause stopped separating the complete from the incomplete and started hiding
 * all of them. The agreement between the two predicates is what matters and it
 * is preserved — both lost the same clause.
 *
 * DELIBERATELY DEMANDING ABOUT ITS INPUT: every field is required, so a caller
 * that simply didn't load one gets a compile error rather than a silent refusal.
 * ⚠ `companyMemberships` IS NO LONGER ON THE INPUT — it is removed from the type
 * ON PURPOSE, so a caller still loading it for this gate fails to compile
 * instead of quietly passing data nothing reads.
 */
export function providerMeetsRequired(p: {
  /*
    ⚠⚠⚠ THE TITLE MOVED TO `Person.title` (`P0-E595` WS-B). ⚠ SUPERSEDED,
    quoted not deleted (`E164`): this took `headline: string | null` at the top
    level, off the provider profile.
    ⚠⚠ IT IS PART OF THE REQUIRED SET AND STAYS PART OF IT — `E581` records
    that a title is required precisely so a buyer can find somebody. Only the
    column it lives in changed.
    ⚠ Removing it from the top level is deliberate: a caller still passing
    `headline` now fails to compile rather than quietly satisfying a gate with a
    field nothing reads.
  */
  role_type_id: string | null;
  skills: unknown[];
  hourly_rate_cents: number | null;
  rate_min_cents: number | null;
  rate_max_cents: number | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  person: {
    /* ⚠ The TITLE, where it now lives (`E595` WS-B). */
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
/**
 * ── ⚠⚠⚠ TEST ACCOUNTS ARE HIDDEN FROM REAL MEMBERS HERE (`P2-ALL-E793`) ─────
 *
 * ⚠ **SCOTT, 2026-10-03:** test accounts are *"hidden from real members (search,
 * Explore, suggestions, public counts) but visible to each other."*
 * ⚠⚠ **IT GOES IN THIS PREDICATE BECAUSE THIS IS THE ONE PREDICATE** — ten
 * callers share it (search, Explore, masked profiles, instructors, mentors, the
 * requester home), so a new marketplace surface inherits the rule instead of
 * having to remember it (`E585`).
 *
 * ⚠⚠ **THE DEFAULT HIDES THEM, AND THE DEFAULT IS THE SAFE DIRECTION.** A caller
 * that forgets to pass the viewer's flag shows a real member a clean
 * marketplace; the cost is that a TEST viewer may not see other test profiles on
 * a surface that has not been updated yet, which is a visible inconvenience to a
 * tester rather than a leak to a buyer.
 * ⚠ `person.user.is_test` — `ProviderProfile.person_id` → `Person.user_id` →
 * `User.is_test`; `Person.user` is optional, so a profile with no user at all is
 * NOT excluded by this clause (it was already excluded by the visibility rules
 * above it).
 */
export function marketplaceVisibleWhere(viewerIsTest = false) {
  return {
    status: "ACTIVE" as const,
    paused_at: null,
    // Title · Role · Skill · Rate
    /*
      ⚠⚠ THE TITLE CLAUSE FOLLOWED THE COLUMN (`P0-E595` WS-B). ⚠ SUPERSEDED,
      quoted not deleted (`E164`): `headline: { not: "" },`
      ⚠⚠⚠ THE MIRROR AND THE PREDICATE MUST AGREE OR A PROFILE IS VISIBLE TO ONE
      AND NOT THE OTHER — `E585` records that risk in terms. `providerMeetsRequired`
      now reads `p.person.title?.trim()`, so this reads the same field on the
      same table, and `null` is excluded along with the empty string because a
      person who never set one has `null`, not `""`.
    */
    role_type_id: { not: null },
    skills: { some: {} },
    OR: [
      { hourly_rate_cents: { not: null } },
      { rate_min_cents: { not: null } },
      { rate_max_cents: { not: null } },
      { onsite_rate_cents: { not: null } },
      { remote_rate_cents: { not: null } },
    ],
    /* Photo · address · phone all live on the Person.
       ⚠ SUPERSEDED, quoted not deleted (`E418`):
         `companyMemberships: { some: { status: "APPROVED" as const } },`
       and the label above it, which read `Photo · Company · address · phone`.
       It went with the clause in `providerMeetsRequired` — the two must agree,
       and a listing that hides every provider is not a stricter gate, it is an
       empty marketplace. */
    person: {
      /**
       * ── ⚠⚠⚠ TEST ACCOUNTS ARE HIDDEN FROM REAL MEMBERS (`P2-ALL-E793`) ────
       *
       * ⚠ **SCOTT, 2026-10-03:** test accounts are *"hidden from real members
       * (search, Explore, suggestions, public counts) but visible to each
       * other."* ⚠⚠ It lives in THIS predicate because this is the ONE
       * predicate — ten callers share it, so a new marketplace surface
       * inherits the rule rather than remembering it (`E585`).
       *
       * ⚠⚠⚠ **IT IS MERGED INTO THIS `person` CLAUSE, NOT SPREAD ABOVE IT, AND
       * THE GATE IS WHY.** My first version added a second `person` key higher
       * up; object literals take the LAST key, so this clause silently
       * overwrote it and the filter did nothing. ⚠ `check:test-accounts`
       * asserts the returned OBJECT rather than grepping the source, which is
       * the only reason that was caught.
       *
       * ⚠ The default hides them: a caller that forgets the viewer's flag shows
       * a real member a clean marketplace. The cost is a tester possibly not
       * seeing other test profiles on a surface not yet updated — an
       * inconvenience to a tester rather than a leak to a buyer.
       */
      /**
       * ── ⚠⚠⚠ DEACTIVATED ACCOUNTS LEAVE THE MARKETPLACE TOO (`P2-ALL-E796`) ──
       *
       * ⚠ **SCOTT:** deactivate is soft — it *"signs them out, hides them from
       * members, keeps all data."* ⚠⚠ **`is_active` ALREADY BLOCKED SIGN-IN AND
       * DID NOT HIDE ANYBODY** — measured 2026-10-03: its only readers were
       * `auth.ts`, `oauth.ts` and `verification.ts`, so a deactivated provider
       * still appeared in search, Explore and every suggestion. The second half
       * of the promise was simply missing.
       * ⚠ It goes beside the test filter for the same reason: ten callers share
       * this predicate, so a new marketplace surface inherits both rules.
       * ⚠⚠ `is_active: true` and NOT `{ not: false }` — the column is
       * non-nullable with a default, so the positive form is the exact question.
       */
      user: { is_active: true, ...(viewerIsTest ? {} : { is_test: false }) },
      /* ⚠⚠ THE TITLE MOVED INTO THIS BLOCK (`P0-E595` WS-B), not beside it: a
         second `person` key in the same object literal is a duplicate property,
         and the later one silently wins. ⚠ It would have dropped the photo,
         phone and address clauses from the gate entirely — a marketplace that
         showed everybody. */
      title: { not: null },
      photo_url: { not: null },
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
