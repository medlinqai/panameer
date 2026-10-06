import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { creditInviteForNewUser } from "@/lib/colleague-invite";
import { prisma } from "@/lib/prisma";
/* THE ONE WRITE BOUNDARY for country (`E729` WS-C). */
import { countryColumns } from "@/lib/country";
/* THE ONE DEFINITION of the five proficiencies (`E723`, `E585`). */
import { PROFICIENCY_OPTIONS, PROFICIENCY_LABEL, type ProficiencyValue } from "@/lib/languages";
import { notify } from "@/lib/notifications";
import {
  recomputeProviderRollup,
  SELF_ADDED_WEIGHT,
} from "@/lib/provider-rollup";
import { projectToCard } from "@/lib/project-card";
import { toView as toArtifactView } from "@/lib/artifacts";
import { hashPassword } from "@/lib/password";
import { acceptInviteForUser } from "@/lib/coordinator";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import {
  computeProviderCompleteness,
  missingRequired,
  VISIBILITY_THRESHOLD,
} from "@/lib/completeness";
import type { Viewer } from "@/lib/access";
/* `P2-J3-E590` WS-A0 — the ONE gate. This file used to hand-roll it. */
import { isMarketplaceVisible, providerMeetsRequired } from "@/lib/access";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { createHash } from "node:crypto";
import { recordParseAudit } from "@/lib/resume/audit";
import { matchSkills } from "@/lib/resume/match";
import type { ParsedResume } from "@/lib/resume/parse";
import { USER_TOS_VERSION } from "@/lib/tos";
import { capitalizeName } from "@/lib/display";
import { formatSkillName, matchSkill } from "@/lib/skill-match";
import { autoLinkSameLetters, notifyCatalogReview } from "@/lib/catalog-review";

/** Provider onboarding — all business logic for the /join wizard (API-first, so */

/** The post-verification profile build (PJv2 WS1 / E070) — spec = Scott's */
/** THE COUNTED ITINERARY — six stops (brief_onboarding_slimdown WS1 / E169). */
// THE ITINERARY (brief_per_job_skill_model WS-4).
// THE V3 ITINERARY, RESTORED , 2026-08-31)
// SIX, NOT SEVEN — `company` IS GONE , 2026-09-11)
export const PROVIDER_STEPS = [
  "title", //    1 — what you do
  "roles", //    2 — typed, or pre-filled by the résumé
  "skills", //   3 — typed, or pre-filled by the résumé
  "rate", //     4 — provider only; the match needs a price
  "picture", //  5 — required to publish (WS7 addendum, unchanged)
  "finish", //   6 — Review + publish
] as const;
export type ProviderStep =
  | (typeof PROVIDER_STEPS)[number]
  // STILL RENDERABLE, JUST NOT COUNTED. These screens exist — `tell_us` as the
  | "tell_us"
  // WS-4 — no longer STOPS, still writable. Settings posts them and so does a
  // this union through the first branch and are NOT listed again here — a
  // HOUSE RULE : a retired screen stays on disk, unimported. So
  | "work_history"
  // as `work_history` did above and for the same house rule .
  | "company"
  | "specializations"
  | "education"
  | "languages"
  | "bio"
  // The combined Role→Domain→Skills page WS3 replaced. Kept in the union and in
  | "catalog"
  // THE SECTION EDITORS' OWN STEPS WS-A)
  | "photo"
  | "work_method"
  | "certifications";

/** The uncounted screens that precede the numbered steps. */
export const PRE_STEPS = ["tell_us"] as const;

/** Every step name the save endpoint accepts — the counted itinerary PLUS the */
export const SAVEABLE_STEPS: readonly ProviderStep[] = [
  ...PROVIDER_STEPS,
  "roles",
  "skills",
  // LISTED EXPLICITLY SINCE — it used to arrive through
  "company",
  "catalog",
  "tell_us",
  "specializations",
  "education",
  "languages",
  "bio",
  // THREE STEPS HAD A HANDLER AND NO WHITELIST ENTRY WS-A)
  "photo",
  "work_method",
  "certifications",
];

/** Recruiter journey: no Rate — a recruiter sells other people's time (E070). */
export const RECRUITER_STEPS = [
  "title",
  "roles",
  "skills",
  "picture",
  "finish",
] as const satisfies readonly ProviderStep[];

/** Steps that only exist on the provider journey. */
const PROVIDER_ONLY_STEPS = new Set<ProviderStep>(["education", "rate"]);

/** A RECRUITER is a provider whose `work_method` is RECRUITER — the discriminator */
export function isRecruiterProfile(p: { work_method: string | null }): boolean {
  return p.work_method === "RECRUITER";
}

/** The step list this profile actually walks. */
export function stepsForProfile(p: {
  work_method: string | null;
}): readonly ProviderStep[] {
  return isRecruiterProfile(p) ? RECRUITER_STEPS : PROVIDER_STEPS;
}

// SEVEN . The comment said `10 (PJv2 WS1)` while the array held six —
export const TOTAL_PROVIDER_STEPS = PROVIDER_STEPS.length; // 6 (E418 removed company)

/** 1-based position within the caller's own step list. */
export function providerStepNumber(
  step: ProviderStep,
  steps: readonly ProviderStep[] = PROVIDER_STEPS
): number {
  return steps.indexOf(step) + 1;
}

/** Stepper heading + forward-button label per step. */
export const PROVIDER_STEP_LABELS: Record<
  ProviderStep,
  { stepper: string; next: string }
> = {
  // — the title forwards to the résumé screen and then Role.
  title: { stepper: "Your Title", next: "Next: Your Role" },
  work_history: {
    stepper: "Your Work History",
    next: "Next: Your Rate",
  },
  roles: { stepper: "Your Role", next: "Next: Your Skills" },
  skills: { stepper: "Your Skills", next: "Next: Your Rate" },
  catalog: { stepper: "Your Role & Skills", next: "Next: Your Rate" },
  rate: { stepper: "Your Rate", next: "Next: Your Photo" },
  // — Photo is now the last question before Review on BOTH journeys
  picture: { stepper: "Your Photo", next: "Next: Review Your Profile" },
  // UNCOUNTED SINCE . Kept for `CompanyStep`'s eventual caller at work
  company: { stepper: "Your Company", next: "" },
  finish: {
    stepper: "Review Your Profile",
    next: "Next: Publish Your Profile",
  },
  // Uncounted screens. `next` is unused for these — nothing forwards to them.
  tell_us: { stepper: "Build Your Profile", next: "Next: Your Title" },
  specializations: { stepper: "Your Specializations", next: "" },
  education: { stepper: "Your Education", next: "" },
  languages: { stepper: "Your Languages", next: "" },
  // BOTH WERE ON SCREEN AT ONCE: the empty state read *"No overview yet"* while
  bio: { stepper: "Your Overview", next: "" },
  // NOT WIZARD STOPS, SO THEY CARRY NO STEPPER COPY ( WS-A)
  photo: { stepper: "Photo", next: "" },
  work_method: { stepper: "How You Work", next: "" },
  certifications: { stepper: "Certifications", next: "" },
};

// THE "NEXT:" LABELS ARE DERIVED, NOT TYPED (pitfalls.md — a label must never
export function nextLabelFor(
  step: ProviderStep,
  steps: readonly ProviderStep[]
): string {
  const i = steps.indexOf(step);
  const next = i >= 0 ? steps[i + 1] : undefined;
  if (!next) return "Next: Publish Your Profile";
  if (next === "finish") return "Next: Review Your Profile";
  return `Next: ${PROVIDER_STEP_LABELS[next].stepper}`;
}

/** Steps a user may pass without entering data. Education is explicitly */
const OPTIONAL_STEPS = new Set<ProviderStep>([
  // The Upload/Review screen: uploading is one valid way through it, and entering
  "tell_us",
  // WS1 — these left the itinerary entirely. Listed so that if one is ever put
  // back, it comes back optional rather than silently becoming a blocker.
  "specializations",
  "education",
  "languages",
  "bio",
]);

/** Section names that are NOT wizard steps but are still written by the Settings */
export const LEGACY_SECTIONS = [
  "work_type",
  "region",
  "photo",
  "experience",
  "education_languages",
  "certifications",
  // Split writers that are no longer their own wizard step but are still used
  // by Settings and by the combined `catalog` step (brief_S / E030).
  "category",
  "skills",
  // PJv2 WS1 — no longer wizard STEPS, but still written:
  //   work_method       by the up-front user-type fork (E066 rehomed)
  //   employers         by the Upload/Review step, which now owns work history
  "work_method",
  "employers",
  // WS-4 — the work-history review: per-job suite, role and skill corrections.
  "work_history",
] as const;

const WORK_TYPES = ["HOURLY", "PACKAGES", "AGENCY", "CONTRACT_TO_HIRE"] as const;
// ACCEPTED so an existing row can be re-saved without being rejected by the very
const WORK_METHODS = ["SERVICES", "HOURLY", "PACKAGES", "RECRUITER"] as const;
// "LINKEDIN" is retained ONLY so rows imported before PJv2 WS13 still read; no
// code path writes it any more (E069).
const PROFILE_METHODS = ["LINKEDIN", "RESUME", "MANUAL"] as const;
// THE ALLOWLIST READS THE ONE DEFINITION item 10)
const LANGUAGE_LEVELS: readonly ProficiencyValue[] = PROFICIENCY_OPTIONS.map((o) => o.value);

// E202 — THERE IS NO SKILL CEILING ANY MORE.
/** E017 — a bio must be a real answer, not one word. */
export const MIN_BIO_CHARS = 100;
/** A few lines, not an essay (Run6 WS7 / E087). */
export const MAX_BIO_CHARS = 600;
/** E016 — every profile includes English unless the user changes it. */
export const DEFAULT_LANGUAGE = "English";

export class OnboardingError extends Error {
  constructor(
    message: string,
    public code:
      | "EMAIL_TAKEN"
      | "NOT_A_PROVIDER"
      | "NOT_A_BUYER"
      | "NOT_A_REQUESTER"
      | "NOT_VERIFIED"
      | "INVALID"
      | "INCOMPLETE"
      // Distinct from INCOMPLETE because the fix is not on the
      | "GATE_UNMET",
    /** Populated for GATE_UNMET: the named fields, their reasons, their links. */
    public fields?: { key: string; field: string; reason: string; href: string }[]
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}

// ---------------------------------------------------------------------------
// Step 3 — create the account backbone in ONE transaction.
// ---------------------------------------------------------------------------

export type CreateProviderAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** brief_P moved experience level + goal OUT of sign-up and into profile */
  /** Deck sign-up fields (E001 CHANGE 2). */
  country?: string;
  marketingOptIn?: boolean;
  /** Optional coordinator invite token (brief_I) — links the new provider to
   *  the inviting coordinator after account creation, if it matches this email. */
  inviteToken?: string;
};

/** Creates PAccount(PROVIDER) → Company → User → Person(is_service_provider) → */
export async function createProviderAccount(
  input: CreateProviderAccountInput
): Promise<{ userId: string; email: string }> {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (input.password.length < 8) {
    throw new OnboardingError("Password must be at least 8 characters", "INVALID");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new OnboardingError("That email is already registered", "EMAIL_TAKEN");
  }

  const password_hash = await hashPassword(input.password);
  const companyName = `${firstName} ${lastName}`.trim() || email;

  const userId = await prisma.$transaction(async (tx) => {
    const pAccount = await tx.pAccount.create({
      data: { kind: "PROVIDER", name: companyName, status: "ACTIVE" },
    });
    const company = await tx.company.create({
      data: { p_account_id: pAccount.id, name: companyName },
    });
    const user = await tx.user.create({
      data: {
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: "MEMBER",
        // WS6 — THE PROVIDER PATH RECORDED NOTHING. The API has required
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
    });
    const person = await tx.person.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        is_service_provider: true,
      },
    });
    await tx.providerProfile.create({
      data: {
        person_id: person.id,
        // step now writes `Person.title`, which needs no placeholder row.
        notify_product_updates: input.marketingOptIn === true,
        // status defaults PENDING → ACTIVE on email verify (brief_K);
        // validation_status defaults NOT_REQUESTED; completeness starts 0.
      },
    });

    // Sign-up country seeds the backbone Site/Address so the finish page
    // (E019) pre-fills Country instead of asking for it twice.
    if (input.country?.trim()) {
      const site = await tx.site.create({
        data: { company_id: company.id, name: "Primary" },
      });
      await tx.address.create({
        /* BOTH COLUMNS (`E729` WS-C). */
        data: { site_id: site.id, line1: "", ...countryColumns(input.country) },
      });
      await tx.person.update({
        where: { id: person.id },
        data: { site_id: site.id },
      });
    }

    return user.id;
  });

  // If this signup came from a coordinator invite, link the new provider to the
  if (input.inviteToken) {
    try {
      await acceptInviteForUser(userId, input.inviteToken);
    } catch (e) {
      console.error("[onboarding] invite link failed (non-fatal):", e);
    }
  }


  // CREDIT THE INVITATION THAT BROUGHT THEM IN WS-C)
  await creditInviteForNewUser(userId, email);
  return { userId, email };
}

/** Give an ALREADY-AUTHENTICATED user the provider backbone (brief_Q). */
export async function ensureProviderBackbone(
  viewer: Viewer,
  opts: { country?: string; marketingOptIn?: boolean; inviteToken?: string } = {}
): Promise<{ created: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    include: { person: { include: { providerProfile: { select: { id: true } } } } },
  });
  if (!user) throw new OnboardingError("Account not found", "NOT_A_PROVIDER");

  const person = user.person;

  if (person?.providerProfile) return { created: false };

  // A Person that exists but isn't a provider belongs to the buyer side; the
  // provider wizard must not silently convert it.
  if (person && !person.is_service_provider) {
    throw new OnboardingError(
      "This account isn't a provider profile",
      "NOT_A_PROVIDER"
    );
  }

  const firstName = capitalizeName(user.first_name ?? "");
  const lastName = capitalizeName(user.last_name ?? "");
  const companyName = `${firstName} ${lastName}`.trim() || user.email;

  await prisma.$transaction(async (tx) => {
    let personId = person?.id;

    if (!personId) {
      const pAccount = await tx.pAccount.create({
        data: { kind: "PROVIDER", name: companyName, status: "ACTIVE" },
      });
      const company = await tx.company.create({
        data: { p_account_id: pAccount.id, name: companyName },
      });

      let siteId: string | undefined;
      if (opts.country?.trim()) {
        const site = await tx.site.create({
          data: { company_id: company.id, name: "Primary" },
        });
        await tx.address.create({
          /* BOTH COLUMNS (`E729` WS-C). */
          data: { site_id: site.id, line1: "", ...countryColumns(opts.country) },
        });
        siteId = site.id;
      }

      const created = await tx.person.create({
        data: {
          company_id: company.id,
          site_id: siteId,
          user_id: user.id,
          first_name: firstName || user.email.split("@")[0],
          last_name: lastName,
          status: "ACTIVE",
          is_service_provider: true,
          // The OAuth avatar becomes the starting profile photo (brief_Q).
          photo_url: user.image ?? null,
        },
      });
      personId = created.id;
    } else {
      // Person exists (e.g. from a partial flow) but has no provider profile.
      await tx.person.update({
        where: { id: personId },
        data: {
          is_service_provider: true,
          photo_url: person!.photo_url ?? user.image ?? null,
        },
      });
    }

    await tx.providerProfile.create({
      data: {
        person_id: personId,
        /* `headline: ""` REMOVED (`E595` WS-B) — see the sibling create above. */
        notify_product_updates: opts.marketingOptIn === true,
      },
    });
  });

  // Same invite-linking courtesy as the password signup path (brief_I).
  if (opts.inviteToken) {
    try {
      await acceptInviteForUser(viewer.userId, opts.inviteToken);
    } catch (e) {
      console.error("[onboarding] invite link failed (non-fatal):", e);
    }
  }

  return { created: true };
}

/** Correct a mistyped email — allowed only while the account is still */
/** The profile skills traceable to the most recent parsed import (E187). */
function resumeSkillIds(
  imports: { status: string; parsed: unknown }[],
  skills: { skill_id: string; skill: { name: string } }[]
): string[] {
  if (skills.length === 0) return [];
  const latest = imports.find((i) => i.status === "PARSED" && i.parsed);
  const terms = (latest?.parsed as { skills?: unknown } | null | undefined)?.skills;
  if (!Array.isArray(terms)) return [];

  const { matched } = matchSkills(
    terms.filter((t): t is string => typeof t === "string"),
    skills.map((s) => ({ id: s.skill_id, name: s.skill.name }))
  );
  return matched.map((m) => m.id);
}

export async function updateUnverifiedEmail(
  viewer: Viewer,
  newEmailRaw: string
): Promise<{ ok: true }> {
  const newEmail = normalizeEmail(newEmailRaw);
  const user = await prisma.user.findUnique({ where: { id: viewer.userId } });
  if (!user) throw new OnboardingError("Account not found", "NOT_A_PROVIDER");
  if (user.email_verified) {
    throw new OnboardingError("Email is already verified", "INVALID");
  }
  if (newEmail !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw new OnboardingError("That email is already registered", "EMAIL_TAKEN");
    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail },
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Resolve the viewer's draft profile (ownership boundary).
// ---------------------------------------------------------------------------

async function loadDraft(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    include: {
      user: { select: { email: true, email_verified: true } },
      // WS5 — the company step's done-ness is a membership read.
      companyMemberships: { select: { status: true, role: true, company_id: true } },
      site: { include: { addresses: { orderBy: { created_at: "asc" }, take: 1 } } },
      providerProfile: {
        include: {
          pillar: { select: { id: true, code: true, name: true } },
          roleType: { select: { id: true, code: true, name: true, display: true } },
          // WS2 — the full role set, primary included.
          roles: {
            select: {
              roleType: { select: { id: true, code: true, name: true, display: true } },
            },
          },
          specializations: {
            include: { specialization: { select: { id: true, name: true, kind: true } } },
          },
          imports: { orderBy: { created_at: "desc" } },
          // WS-4 — the derived centre of gravity, for the review screen.
          suiteProfiles: true,
          skills: {
            include: {
              skill: {
                select: { id: true, name: true, role_type_id: true, pillar_id: true },
              },
            },
          },
          employers: {
            orderBy: [{ sort_order: "asc" }, { start_date: "desc" }],
            include: {
              artifacts: { orderBy: [{ sort_order: "asc" }] },
              // WS-4 — the module chips on each job card.
              skills: {
                select: { skill_id: true, skill: { select: { name: true } } },
              },
              projects: {
                orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
                include: {
                  roleType: { select: { id: true, name: true } },
                  industry: { select: { id: true, name: true } },
                  applications: {
                    include: { application: { select: { id: true, name: true } } },
                  },
                  outcomes: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
                  validations: {
                    orderBy: { sent_at: "desc" },
                    select: { status: true, sent_at: true, responded_at: true },
                  },
                  artifacts: { orderBy: [{ sort_order: "asc" }] },
                },
              },
            },
          },
          // ALL projects, not only the employer-nested ones. A project with a
          projects: {
            orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
            include: {
              roleType: { select: { id: true, name: true } },
              industry: { select: { id: true, name: true } },
              applications: {
                include: { application: { select: { id: true, name: true } } },
              },
              outcomes: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
              validations: {
                orderBy: { sent_at: "desc" },
                select: { status: true, sent_at: true, responded_at: true },
              },
            },
          },
          education: { orderBy: { created_at: "asc" } },
          languages: { orderBy: { created_at: "asc" } },
          certifications: { orderBy: [{ year: "desc" }, { name: "asc" }] },
        },
      },
    },
  });

  if (!person || !person.is_service_provider || !person.providerProfile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return person;
}

/** The furthest incomplete step to resume at. Only REQUIRED steps are resume */
function computeResumeStep(p: Awaited<ReturnType<typeof loadDraft>>): ProviderStep {
  const pp = p.providerProfile!;
  const done: Record<ProviderStep, boolean> = {
    title: (p.title ?? "").trim() !== "",
    // WS3 — two steps, two conditions. A provider who claimed a role and then
    roles: pp.role_type_id != null,
    skills: pp.skills.length > 0,
    // WS-4 — done when there is at least one job to review.
    work_history: pp.employers.length > 0,
    // The combined page these replaced. Not in any itinerary; satisfied so a
    // stray value can never park anyone on a step that is not offered.
    catalog: true,
    tell_us: true, //        optional — see OPTIONAL_STEPS
    specializations: true, // optional (brief_R)
    education: true, //      optional (E015)
    languages: pp.languages.length > 0,
    bio: !!pp.overview && pp.overview.trim().length >= MIN_BIO_CHARS,
    // A range now (E078c); either end being set means the step was answered.
    rate: pp.rate_min_cents != null || pp.hourly_rate_cents != null,
    // The photo step also collects the CONTACT block — phone and address.
    picture: p.photo_url != null && p.phone != null,
    // SATISFIED UNCONDITIONALLY SINCE , like `catalog` above it.
    company: true,
    finish: pp.onboarding_completed_at != null,
    // ALWAYS `true`, AND THAT IS THE POINT: NEVER A RESUME TARGET.
    photo: true,
    work_method: true,
    certifications: true,
  };
  // Walk the list THIS profile actually has, so a recruiter is never parked on
  // a step (Education, Rate) their journey doesn't include.
  // Résumé is the first step (2026-10-05): a new provider who hasn't chosen how to fill their profile starts there.
  if (!done.title && pp.profile_method == null) return "tell_us";
  for (const step of stepsForProfile(pp)) {
    if (OPTIONAL_STEPS.has(step)) continue;
    if (!done[step]) return step;
  }
  return "finish";
}

/** The full onboarding snapshot the wizard needs to render + resume. */
export async function getOnboardingState(viewer: Viewer) {
  const p = await loadDraft(viewer);
  const pp = p.providerProfile!;
  const emailVerified = p.user?.email_verified != null;
  // A THIRD COPY OF THE GATE, FOUND AND CLOSED WS-A0)
  const visible = isMarketplaceVisible({
    status: pp.status,
    completeness: pp.completeness,
    paused_at: pp.paused_at,
    meetsRequired: providerMeetsRequired({
      ...pp,
      person: { title: p.title, photo_url: p.photo_url, phone: p.phone, site: p.site },
    }),
  });

  const address = p.site?.addresses?.[0] ?? null;

  // WS-A — what THIS provider's own skills imply. Computed for the
  const derived = await deriveRolesFromSkills(pp.id);

  return {
    email: p.user?.email ?? "",
    emailVerified,
    resumeStep: emailVerified ? computeResumeStep(p) : ("verify" as const),
    // WS1 — the client no longer hard-codes the step list: a recruiter walks a
    // shorter journey, and the server is the only place that knows which.
    steps: stepsForProfile(pp),
    // THE WIZARD'S DISPLAYED TOTAL WS-1)
    displayTotalSteps: PROVIDER_STEPS.length + 1,
    isRecruiter: isRecruiterProfile(pp),
    totalSteps: stepsForProfile(pp).length,
    status: pp.status,
    completeness: pp.completeness,
    visibilityThreshold: VISIBILITY_THRESHOLD,
    visible,
    paused: pp.paused_at != null,
    published: pp.onboarding_completed_at != null,
    /** Import gaps for the review page to surface (E019). */
    imports: pp.imports.map((i) => ({
      id: i.id,
      source: i.source,
      status: i.status,
      fileName: i.file_name,
      gaps: (i.gaps as string[] | null) ?? [],
      error: i.error,
      createdAt: i.created_at,
    })),
    profile: {
      workMethod: pp.work_method,
      profileMethod: pp.profile_method,
      workTypes: pp.work_types,
      pillarId: pp.pillar_id,
      pillarName: pp.pillar?.name ?? null,
      // The chosen field is the (Role, Domain) pair (brief_R).
      roleTypeId: pp.role_type_id,
      // WS2 — the full role set. `roleTypeId` above stays the PRIMARY so every
      roleTypeIds: pp.roles.length
        ? pp.roles.map((r) => r.roleType.id)
        : pp.role_type_id
          ? [pp.role_type_id]
          : [],
      // THE PREFILL, NEVER AN ASSIGNMENT ( WS-A). The role page reads
      derivedRoleTypeIds: derived.roleTypeIds,
      derivedPillarId: derived.pillarId,
      derivedFromSkills: derived.evidence,
      roleTypes: pp.roles.length
        ? pp.roles.map((r) => ({
            id: r.roleType.id,
            name: r.roleType.name,
            display: r.roleType.display,
          }))
        : pp.roleType
          ? [
              {
                id: pp.roleType.id,
                name: pp.roleType.name,
                display: pp.roleType.display,
              },
            ]
          : [],
      roleTypeName: pp.roleType?.name ?? null,
      specializationIds: pp.specializations.map((s) => s.specialization_id),
      specializations: pp.specializations.map((s) => ({
        id: s.specialization.id,
        name: s.specialization.name,
        kind: s.specialization.kind,
      })),
      skillIds: pp.skills.map((s) => s.skill_id),
      // THE STEP READS WHAT IS HELD — every row, hidden ones included — because
      skillNames: pp.skills.map((s) => ({
        id: s.skill_id,
        name: s.skill.name,
        roleTypeId: s.skill.role_type_id,
      })),
      // WHICH OF THOSE SKILLS CAME OFF THE RÉSUMÉ (E187).
      resumeSkillIds: resumeSkillIds(pp.imports, pp.skills),
      // THE WIRE KEY STAYS `headline`; the SOURCE is now `Person.title`
      headline: p.title ?? "",
      overview: pp.overview ?? "",
      hourlyRateCents: pp.hourly_rate_cents,
      // WS0/E078c — the advertised range; the hero renders this.
      rateMinCents: pp.rate_min_cents,
      rateMaxCents: pp.rate_max_cents,
      serviceFeeBps: pp.service_fee_bps,
      onsiteRateCents: pp.onsite_rate_cents,
      remoteRateCents: pp.remote_rate_cents,
      currency: pp.currency,
      regionId: pp.region_id,
      photoUrl: p.photo_url,
      firstName: p.first_name,
      lastName: p.last_name,
      // WS7 — READ-ONLY REMNANT. Nothing captures or gates on this any more;
      // it is still projected so an already-stored value stays visible in
      // Settings rather than appearing to have been deleted.
      dateOfBirth: pp.date_of_birth
        ? pp.date_of_birth.toISOString().slice(0, 10)
        : null,
      phone: p.phone,
      phoneVerified: p.phone_verified_at != null,
      address: address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
            country: address.country,
          }
        : null,
      // brief_U / E042 — Employer is the single work-history model; the
      // "Your Employers" step and the review page both read this.
      employers: pp.employers.map((e) => ({
        id: e.id,
        name: e.name,
        roleTitle: e.role_title,
        location: e.location,
        description: e.description,
        logoUrl: e.logo_url,
        isCurrent: e.is_current,
        startDate: e.start_date ? e.start_date.toISOString().slice(0, 10) : null,
        endDate: e.end_date ? e.end_date.toISOString().slice(0, 10) : null,
        // brief_project_model_v2 + _validation — the SAME mapper the employers
        artifacts: e.artifacts.map(toArtifactView),
        projects: e.projects.map(projectToCard),
        // WS-4 — what the review step renders on each job card: the suite badge
        suite: e.software_suite,
        roleTypeId: e.job_role_type_id,
        skills: e.skills.map((s) => ({ id: s.skill_id, name: s.skill.name })),
        // THE PROMPT FIRES ON THIS AND NOTHING ELSE.
        needsSuite: e.software_suite == null && e.skills.length > 0,
      })),
      projects: pp.projects.map(projectToCard),
      // WS-4 — THE WEIGHTED ROLLUP, for the review/publish screen.
      rollup: {
        skills: pp.skills
          .filter((s) => s.weight > 0 || s.source === "SELF_ADDED")
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 12)
          .map((s) => ({
            id: s.skill_id,
            name: s.skill.name,
            monthsTotal: s.months_total,
            lastUsed: s.last_used ? s.last_used.toISOString().slice(0, 10) : null,
            /** Flagged in the UI: claimed, but with no job behind it. */
            selfAdded: s.source === "SELF_ADDED",
          })),
        /** The centre of gravity — "Oracle Cloud 85% · PeopleSoft 15%". */
        suites: pp.suiteProfiles
          .slice()
          .sort((a, b) => b.weight_pct - a.weight_pct)
          .map((s) => ({ suite: s.suite, pct: Math.round(s.weight_pct) })),
      },
      // WS-4 — the company step's prefill: the résumé's current or most-recent
      // Employers read from a résumé are past employers — never offered as the member's company.
      suggestedCompanyName: null,
      education: pp.education.map((e) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        year: e.year,
        startYear: e.start_year,
        endYear: e.end_year,
        description: e.description,
      })),
      languages: pp.languages.map((l) => ({
        id: l.id,
        name: l.name,
        // `level` is canonical (E016); `proficiency` is the pre-brief_P text.
        level: l.level,
        proficiency: l.proficiency,
      })),
      // brief_T / E040 — rendered + editable on the review page.
      certifications: pp.certifications.map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        year: c.year,
        issuedOn: c.issued_on ? c.issued_on.toISOString().slice(0, 10) : null,
        credentialId: c.credential_id,
        url: c.url,
        expiresOn: c.expires_on ? c.expires_on.toISOString().slice(0, 10) : null,
        attachmentPath: c.attachment_path,
        attachmentName: c.attachment_name,
        notes: c.notes,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Save-as-you-go — one handler per step, each persisting on Continue.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StepData = Record<string, any>;

/** Every editable profile section. The onboarding wizard uses PROVIDER_STEPS */
export type ProfileSection = ProviderStep | (typeof LEGACY_SECTIONS)[number];

/** Apply ONE profile section — pure persistence + validation, no gating. */
/** The collection a REPLACE-ALL section is about to overwrite (E121). */
function replaceList(data: StepData, key: string, section: string): StepData[] {
  const value = data[key];
  if (value === undefined || value === null) {
    throw new OnboardingError(
      `The "${section}" section replaces its whole list, so "${key}" must be supplied (send [] to clear it).`,
      "INVALID"
    );
  }
  if (!Array.isArray(value)) {
    throw new OnboardingError(`"${key}" must be a list`, "INVALID");
  }
  return value as StepData[];
}

export async function applyProviderSection(
  profileId: string,
  personId: string,
  section: ProfileSection,
  data: StepData
): Promise<void> {
  switch (section) {
    case "work_type": {
      const workTypes: string[] = Array.isArray(data.workTypes)
        ? data.workTypes
        : [];
      const invalid = workTypes.find(
        (w) => !WORK_TYPES.includes(w as (typeof WORK_TYPES)[number])
      );
      if (invalid) throw new OnboardingError("Invalid work type", "INVALID");
      await prisma.providerProfile.update({
        where: { id: profileId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { work_types: workTypes as any },
      });
      break;
    }

    case "work_method": {
      // E009 — the Provider vs Recruiter fork. A recruiter sells the services
      const method = data.workMethod;
      if (!WORK_METHODS.includes(method)) {
        throw new OnboardingError("Pick how you work", "INVALID");
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: { work_method: method },
      });
      await prisma.person.update({
        where: { id: personId },
        data: { is_service_coordinator: method === "RECRUITER" },
      });
      break;
    }

    case "category": {
      // MULTIPLE ROLES (WS2 / E172, E173) — this supersedes the locked "one main
      const roleTypeIds: string[] = Array.isArray(data.roleTypeIds)
        ? [...new Set(data.roleTypeIds.map(String))]
        : data.roleTypeId
          ? [String(data.roleTypeId)]
          : [];
      if (roleTypeIds.length === 0) {
        throw new OnboardingError("Pick at least one role", "INVALID");
      }

      const realRoles = await prisma.roleType.findMany({
        where: { id: { in: roleTypeIds } },
        select: { id: true },
      });
      if (realRoles.length !== roleTypeIds.length) {
        throw new OnboardingError("Unknown role selected", "INVALID");
      }

      // The primary is the first one sent — the UI marks it, and a single-role
      // provider has exactly one, which is the common case.
      const primaryRoleId = roleTypeIds[0];

      // The primary DOMAIN, derived rather than asked. A supplied pillarId is
      let pillarId: string | null =
        typeof data.pillarId === "string" && data.pillarId ? data.pillarId : null;
      if (pillarId) {
        const ok = await prisma.skill.findFirst({
          where: { pillar_id: pillarId, role_type_id: primaryRoleId },
          select: { id: true },
        });
        if (!ok) pillarId = null;
      }
      if (!pillarId) {
        // THE PROVIDER'S OWN SKILLS DECIDE THE DOMAIN ( WS-A)
        const mine = await deriveRolesFromSkills(profileId);
        pillarId =
          mine.roleTypeIds[0] === primaryRoleId && mine.pillarId ? mine.pillarId : null;

        if (!pillarId) {
          const grouped = await prisma.skill.groupBy({
            by: ["pillar_id"],
            /* `E481` — a domain whose skills are all retired is not suggested. */
            where: { role_type_id: primaryRoleId, pillar_id: { not: null }, ...OFFERABLE },
            _count: { _all: true },
            orderBy: { _count: { id: "desc" } },
            take: 1,
          });
          pillarId = grouped[0]?.pillar_id ?? null;
        }
      }

      await prisma.$transaction([
        prisma.providerProfile.update({
          where: { id: profileId },
          data: { role_type_id: primaryRoleId, pillar_id: pillarId },
        }),
        prisma.providerProfileRole.deleteMany({
          where: { provider_profile_id: profileId },
        }),
        prisma.providerProfileRole.createMany({
          data: roleTypeIds.map((role_type_id) => ({
            provider_profile_id: profileId,
            role_type_id,
          })),
        }),
      ]);

      // THE PRUNE IS GONE. THE FILTER MOVED TO THE READ
      break;
    }

    case "employers": {
      // brief_U — employers are created/edited through the dedicated
      break;
    }

    // WS-4 — THE WORK-HISTORY REVIEW: per-job suite, role and skill corrections.
    case "work_history": {
      const jobs = Array.isArray(data.jobs) ? (data.jobs as StepData[]) : [];
      if (jobs.length === 0) break;

      // OWNERSHIP IS RE-CHECKED HERE, not assumed from the session.
      const owned = await prisma.employer.findMany({
        where: {
          provider_profile_id: profileId,
          id: { in: jobs.map((j) => String(j.employerId ?? "")).filter(Boolean) },
        },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((e) => e.id));

      for (const job of jobs) {
        const employerId = String(job.employerId ?? "");
        if (!ownedIds.has(employerId)) continue;

        const patch: Record<string, unknown> = {};
        if ("suite" in job) patch.software_suite = job.suite ?? null;
        if ("roleTypeId" in job) patch.job_role_type_id = job.roleTypeId ?? null;
        if (Object.keys(patch).length > 0) {
          await prisma.employer.update({ where: { id: employerId }, data: patch });
        }

        if (Array.isArray(job.skillIds)) {
          const wanted = [...new Set((job.skillIds as unknown[]).map(String))];
          // REPLACE, not merge. The chips on that one job are the complete
          await prisma.jobSkill.deleteMany({ where: { employer_id: employerId } });
          if (wanted.length > 0) {
            // Only real catalog rows — a client-supplied id is not a skill.
            const real = await prisma.skill.findMany({
              // NO `status` FILTER HERE, DELIBERATELY . This
              where: { id: { in: wanted } },
              select: { id: true },
            });
            await prisma.jobSkill.createMany({
              data: real.map((s) => ({ employer_id: employerId, skill_id: s.id })),
              skipDuplicates: true,
            });
          }
        }
      }
      break;
    }

    // WS3 — the combined page became two steps, each saving its own half.
    // THE STEP NAMES AND THE SECTION NAMES ARE DIFFERENT NAMESPACES, and this
    case "catalog": {
      await applyProviderSection(profileId, personId, "category", data);
      await applyProviderSection(profileId, personId, "skills", data);
      break;
    }

    case "specializations": {
      // brief_R — cross-cutting multi-select (products / methodologies /
      // industries). OPTIONAL: an empty list is a valid answer, so this
      // replaces the whole set rather than requiring one.
      const ids: string[] = replaceList(
        data,
        "specializationIds",
        "specializations"
      ) as unknown as string[];

      // E031 — add-on-the-fly. A provider's real specialization may simply not
      const custom: string[] = Array.isArray(data.customSpecializations)
        ? data.customSpecializations
        : [];
      let newSpecs = 0;
      const freshSpecs: string[] = [];
      for (const raw of custom) {
        const name = formatSkillName(String(raw).trim().slice(0, 80));
        if (!name) continue;
        const existing = await prisma.specialization.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });
        if (existing) {
          if (!ids.includes(existing.id)) ids.push(existing.id);
          continue;
        }
        // BY CODE, NEVER `findFirst()` . Two ServiceCatalog
        const catalogId = await activeCatalogId();
        if (!catalogId) break;
        // A PROVIDER TYPING A TERM IS NOW A SUGGESTION
        const created = await prisma.specialization.create({
          data: {
            catalog_id: catalogId,
            name,
            // NO `kind` — see above. Whatever the column defaults to is not
            // NOT OFFERED TO ANYONE ELSE. `status: SUGGESTED` is excluded by
            status: "SUGGESTED",
            // Sorts after the seeded vocabulary.
            sort_order: 900,
            // The seed's retirement pass reads `origin` and may only delete
            is_custom: true,
            origin: "PROVIDER",
          },
        });
        ids.push(created.id);
        newSpecs++;
        freshSpecs.push(created.id);
      }

      if (ids.length > 0) {
        const found = await prisma.specialization.count({
          where: { id: { in: ids } },
        });
        if (found !== ids.length) {
          throw new OnboardingError("Unknown specialization selected", "INVALID");
        }
      }
      await prisma.$transaction([
        prisma.providerProfileSpecialization.deleteMany({
          where: { provider_profile_id: profileId },
        }),
        ...(ids.length
          ? [
              prisma.providerProfileSpecialization.createMany({
                data: ids.map((specialization_id) => ({
                  provider_profile_id: profileId,
                  specialization_id,
                })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);
      if (newSpecs) {
        await autoLinkSameLetters({ specs: freshSpecs });
        await notifyCatalogReview(undefined, profileId);
      }
      break;
    }

    case "skills": {
      // E014 — skills are CONDITIONAL on the field chosen at step 6 and capped
      // at 15. Settings (brief_H) still posts a `roleTypeId`, so both scoping
      // keys are accepted; whichever is supplied is enforced.
      const skillIds: string[] = Array.isArray(data.skillIds)
        ? [...data.skillIds]
        : [];

      // E031 — add-on-the-fly skills. Created INSIDE the chosen (Role, Domain)
      const customSkills: string[] = Array.isArray(data.customSkills)
        ? data.customSkills
        : [];
      // WS2 — an add-on-the-fly skill is filed under a DECLARED role.
      const declaredRoles = await prisma.providerProfileRole.findMany({
        where: { provider_profile_id: profileId },
        select: { role_type_id: true },
      });
      const claimed = new Set(declaredRoles.map((r) => r.role_type_id));
      const profileRow = await prisma.providerProfile.findUnique({
        where: { id: profileId },
        select: { role_type_id: true, pillar_id: true },
      });
      if (profileRow?.role_type_id) claimed.add(profileRow.role_type_id);

      const requestedRole =
        typeof data.customSkillRoleId === "string" && data.customSkillRoleId
          ? data.customSkillRoleId
          : (data.roleTypeId as string | undefined) ?? profileRow?.role_type_id ?? null;
      const customRoleId =
        requestedRole && claimed.has(requestedRole)
          ? requestedRole
          : profileRow?.role_type_id ?? null;
      const customPillarId =
        (typeof data.pillarId === "string" && data.pillarId
          ? data.pillarId
          : profileRow?.pillar_id) ?? null;

      let newTerms = 0;
      const freshSkills: string[] = [];
      if (customSkills.length > 0 && customRoleId && customPillarId) {
        // BY CODE, NEVER `findFirst()` . Two ServiceCatalog
        const catalogId2 = await activeCatalogId();
        const catalogRow = catalogId2 ? { id: catalogId2 } : null;
        // MATCH THE WHOLE CATALOG BEFORE CREATING ANYTHING
        const catalogRows = await prisma.skill.findMany({
          /* `E481` — a retired row is never matched onto a typed skill. */
          where: OFFERABLE,
          select: { id: true, name: true, is_custom: true },
        });
        // provider-authored one, the same preference `resolveApplicationIds`
        const catalogSkills = catalogRows.map((c) => ({
          id: c.id,
          name: c.name,
          isCustom: c.is_custom,
        }));

        for (const raw of customSkills) {
          const name = formatSkillName(String(raw).trim().slice(0, 120));
          if (!name || !catalogRow) continue;
          // EXACT-ISH LINKS THE EXISTING ROW AND CREATES NOTHING. This is the
          const m = matchSkill(name, catalogSkills);
          if (m.kind === "exact") {
            if (!skillIds.includes(m.skill.id)) skillIds.push(m.skill.id);
            continue;
          }
          const skill = await prisma.skill.upsert({
            where: {
              catalog_id_role_type_id_pillar_id_name: {
                catalog_id: catalogRow.id,
                role_type_id: customRoleId,
                pillar_id: customPillarId,
                name,
              },
            },
            update: {},
            create: {
              catalog_id: catalogRow.id,
              role_type_id: customRoleId,
              pillar_id: customPillarId,
              name,
              is_custom: true,
              origin: "PROVIDER",
              review_pending: true,
            },
          });
          if (Date.now() - skill.created_at.getTime() < 60_000) {
            newTerms++;
            freshSkills.push(skill.id);
          }
          if (!skillIds.includes(skill.id)) skillIds.push(skill.id);
        }
      }

      if (skillIds.length === 0) {
        throw new OnboardingError("Pick at least one skill", "INVALID");
      }
      // WS1/E102 + E110 — the single-domain lock is GONE.
      const skills = await prisma.skill.findMany({
        // NO `status` FILTER HERE, DELIBERATELY . This
        where: { id: { in: skillIds } },
        select: { id: true },
      });
      if (skills.length !== skillIds.length) {
        throw new OnboardingError("Unknown skill selected", "INVALID");
      }

      // THIS IS THE TRAP THE BRIEF SENT ME LOOKING FOR, AND IT IS REAL.
      // THIS STEP REPLACES THE PROVIDER'S OWN PICKS AND NOTHING ELSE
      await prisma.$transaction([
        prisma.providerSkill.deleteMany({
          where: {
            provider_profile_id: profileId,
            source: "SELF_ADDED",
            ...(skillIds.length > 0 ? { skill_id: { notIn: skillIds } } : {}),
          },
        }),
        prisma.providerSkill.createMany({
          data: skillIds.map((skill_id) => ({
            provider_profile_id: profileId,
            skill_id,
            source: "SELF_ADDED" as const,
            weight: SELF_ADDED_WEIGHT,
          })),
          // — a pick the provider already holds must not be re-inserted
          skipDuplicates: true,
        }),
      ]);
      if (newTerms) {
        await autoLinkSameLetters({ skills: freshSkills });
        await notifyCatalogReview(undefined, profileId);
      }
      break;
    }

    case "title": {
      // THE TITLE STEP WRITES `Person.title` NOW WS-B)
      const title: string = (data.headline ?? "").trim();
      if (!title) throw new OnboardingError("Title is required", "INVALID");
      // Owner-scoped through the profile, exactly as before: the person is
      const owner = await prisma.providerProfile.findUnique({
        where: { id: profileId },
        select: { person_id: true },
      });
      if (!owner) throw new OnboardingError("No provider profile", "NOT_A_PROVIDER");
      await prisma.person.update({
        where: { id: owner.person_id },
        data: { title },
      });
      break;
    }

    case "experience": {
      const list: StepData[] = replaceList(data, "experiences", "experience");
      const clean = list
        .map((e) => ({
          employer: (e.employer ?? "").trim(),
          roleTitle: (e.roleTitle ?? "").trim(),
          description: e.description?.trim() || null,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate ? new Date(e.endDate) : null,
          /* `E549` — affirmative only; see the write below. */
          isCurrent: e.isCurrent === true,
          projects: (Array.isArray(e.projects) ? e.projects : [])
            .map((pr: StepData) => ({
              name: (pr.name ?? "").trim(),
              description: pr.description?.trim() || null,
            }))
            .filter((pr: { name: string }) => pr.name),
        }))
        .filter((e) => e.employer && e.roleTitle);

      // brief_project_model_v2 — imported projects are left UNCLASSIFIED.
      await prisma.$transaction(async (tx) => {
        await tx.employer.deleteMany({
          where: { provider_profile_id: profileId },
        });
        for (const [i, e] of clean.entries()) {
          await tx.employer.create({
            data: {
              provider_profile_id: profileId,
              name: e.employer,
              role_title: e.roleTitle,
              description: e.description,
              start_date: e.startDate,
              /* A current role carries no end date. */
              end_date: e.isCurrent ? null : e.endDate,
              // AFFIRMATIVE ONLY — THE THIRD PLACE.
              is_current: Boolean(e.startDate) && e.isCurrent,
              sort_order: i * 10,
              projects: {
                create: e.projects.map(
                  (pr: { name: string; description: string | null }) => ({
                    provider_profile_id: profileId,
                    name: pr.name,
                    description: pr.description,
                    client_name: e.employer,
                  })
                ),
              },
            },
          });
        }
      });
      break;
    }

    case "education_languages": {
      const education: StepData[] = replaceList(
        data,
        "education",
        "education_languages"
      );
      const languages: StepData[] = replaceList(
        data,
        "languages",
        "education_languages"
      );
      // E164 — THIS WRITER WAS LOSING HALF THE ROW.
      const cleanEdu = education
        .map((e) => {
          const legacyYear = typeof e.year === "number" ? e.year : null;
          return {
            institution: (e.institution ?? "").trim(),
            degree: e.degree?.trim() || null,
            field: e.field?.trim() || null,
            year: legacyYear,
            start_year: toYear(e.startYear) ?? legacyYear,
            end_year: toYear(e.endYear),
            description: e.description?.trim() || null,
          };
        })
        .filter((e) => e.institution);
      const cleanLang = languages
        .map((l) => ({
          name: (l.name ?? "").trim(),
          proficiency: l.proficiency?.trim() || null,
          level: (LANGUAGE_LEVELS as readonly string[]).includes(String(l.level))
            ? (String(l.level) as (typeof LANGUAGE_LEVELS)[number])
            : null,
        }))
        .filter((l) => l.name);
      await prisma.$transaction([
        prisma.education.deleteMany({ where: { provider_profile_id: profileId } }),
        prisma.language.deleteMany({ where: { provider_profile_id: profileId } }),
        ...(cleanEdu.length
          ? [
              prisma.education.createMany({
                data: cleanEdu.map((e) => ({
                  provider_profile_id: profileId,
                  ...e,
                })),
              }),
            ]
          : []),
        ...(cleanLang.length
          ? [
              prisma.language.createMany({
                data: cleanLang.map((l) => ({
                  provider_profile_id: profileId,
                  ...l,
                })),
              }),
            ]
          : []),
      ]);
      break;
    }

    case "education": {
      // E015 — optional, but when entries ARE given each needs a school.
      // Dates are start/end YEARS ("Dates Attended"), not full dates.
      const list: StepData[] = replaceList(data, "education", "education");
      const clean = list
        .map((e) => ({
          institution: (e.institution ?? "").trim(),
          degree: e.degree?.trim() || null,
          field: e.field?.trim() || null,
          start_year: toYear(e.startYear),
          end_year: toYear(e.endYear),
          description: e.description?.trim() || null,
        }))
        .filter((e) => e.institution);
      for (const e of clean) {
        if (e.start_year && e.end_year && e.end_year < e.start_year) {
          throw new OnboardingError(
            "An education entry ends before it starts",
            "INVALID"
          );
        }
      }
      await prisma.$transaction([
        prisma.education.deleteMany({ where: { provider_profile_id: profileId } }),
        ...(clean.length
          ? [
              prisma.education.createMany({
                data: clean.map((e) => ({ provider_profile_id: profileId, ...e })),
              }),
            ]
          : []),
      ]);
      break;
    }

    case "languages": {
      // E016 — at least one language; English is seeded by the client as the
      // default row, so this only has to enforce the floor.
      const list: StepData[] = replaceList(data, "languages", "languages");
      const clean = list
        .map((l) => ({
          name: (l.name ?? "").trim(),
          // THE CAST IS THE NARROWING, AND IT IS SAFE BECAUSE `includes` IS THE GUARD
          level: LANGUAGE_LEVELS.includes(l.level as ProficiencyValue)
            ? (l.level as ProficiencyValue)
            : null,
        }))
        .filter((l) => l.name);
      if (clean.length === 0) {
        throw new OnboardingError("Add at least one language", "INVALID");
      }
      // E034 — BOTH fields are required; a language with no proficiency tells a
      // buyer nothing, and the step previously saved happily without one.
      const missingLevel = clean.find((l) => !l.level);
      if (missingLevel) {
        throw new OnboardingError(
          `Choose a proficiency for ${missingLevel.name}.`,
          "INVALID"
        );
      }
      const seen = new Set<string>();
      for (const l of clean) {
        const key = l.name.toLowerCase();
        if (seen.has(key)) {
          throw new OnboardingError(`${l.name} is listed twice`, "INVALID");
        }
        seen.add(key);
      }
      await prisma.$transaction([
        prisma.language.deleteMany({ where: { provider_profile_id: profileId } }),
        prisma.language.createMany({
          data: clean.map((l) => ({
            provider_profile_id: profileId,
            name: l.name,
            level: l.level,
            // Mirror into the legacy text column so pre-brief_P readers
            // (ProfileView, settings) keep rendering a value.
            proficiency: l.level ? LANGUAGE_LEVEL_LABELS[l.level] : null,
          })),
        }),
      ]);
      break;
    }

    case "bio": {
      // E017 — required AND long enough to be a real answer, not one word.
      const overview: string = (data.overview ?? "").trim();
      if (!overview) throw new OnboardingError("Bio is required", "INVALID");
      if (overview.length < MIN_BIO_CHARS) {
        throw new OnboardingError(
          `Tell clients a bit more — at least ${MIN_BIO_CHARS} characters (you have ${overview.length}).`,
          "INVALID"
        );
      }
      if (overview.length > MAX_BIO_CHARS) {
        throw new OnboardingError(
          `Keep your overview to about ${MAX_BIO_CHARS} characters — a few lines is what the profile shows best.`,
          "INVALID"
        );
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: { overview },
      });
      break;
    }

    case "rate": {
      const toCents = (v: unknown): number | null => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          throw new OnboardingError("Invalid rate", "INVALID");
        }
        return Math.round(n * 100);
      };
      const hourly = toCents(data.hourlyDollars);
      const onsite = toCents(data.onsiteDollars);
      const remote = toCents(data.remoteDollars);

      // condition below could not tell a caller that never mentions these
      const sentOnsite = data.onsiteDollars !== undefined;
      const sentRemote = data.remoteDollars !== undefined;

      // E018 — the wizard posts a single required hourly rate. Settings
      // (brief_H) still posts the onsite/remote pair, so accept either shape.
      if (hourly == null && onsite == null && remote == null) {
        throw new OnboardingError("Enter an onsite or offsite rate", "INVALID");
      }
      if (hourly != null && hourly === 0) {
        throw new OnboardingError("Your rate must be more than $0", "INVALID");
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: {
          ...(hourly != null ? { hourly_rate_cents: hourly } : {}),
          ...(sentOnsite ? { onsite_rate_cents: onsite } : {}),
          ...(sentRemote ? { remote_rate_cents: remote } : {}),
          currency: typeof data.currency === "string" ? data.currency : undefined,
        },
      });
      break;
    }

    case "tell_us": {
      // E012 — records WHICH creation path was taken. The import itself is
      // handled by the upload/parse endpoint; this just remembers the choice.
      const method = data.profileMethod;
      if (!PROFILE_METHODS.includes(method)) {
        throw new OnboardingError("Pick how you'd like to continue", "INVALID");
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: { profile_method: method },
      });
      break;
    }

    case "finish": {
      // E019 — the "You're Done!" details. Photo is uploaded separately
      // DATE OF BIRTH IS NO LONGER CAPTURED (WS7 / E178).
      // E036 — phone verification is STUBBED. We store the number the provider
      if (typeof data.phone === "string" && data.phone.trim()) {
        await prisma.person.update({
          where: { id: personId },
          data: { phone: data.phone.trim() },
        });
      }

      if (data.address && typeof data.address === "object") {
        await saveProviderAddress(personId, data.address as StepData);
      }
      break;
    }

    case "region": {
      const regionId: string = data.regionId;
      const region = regionId
        ? await prisma.region.findUnique({ where: { id: regionId } })
        : null;
      if (!region) throw new OnboardingError("Pick a region", "INVALID");
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: { region_id: region.id },
      });
      break;
    }

    // The COMPANY step writes NOTHING here (WS5).
    case "company": {
      break;
    }

    // `picture` is the WS1 step name; `photo` is the long-standing section name
    // Settings posts. Same write, both spellings accepted.
    case "picture":
    case "photo": {
      // Optional step. The URL is produced by POST /api/profile/photo (a real
      // owner-scoped Supabase Storage upload, brief_O); null clears it back to
      // the initials fallback.
      const photoUrl: string | null =
        typeof data.photoUrl === "string" && data.photoUrl.trim()
          ? data.photoUrl.trim()
          : null;
      await prisma.person.update({
        where: { id: personId },
        data: { photo_url: photoUrl },
      });
      break;
    }



    case "certifications": {
      // brief_T / E040 — now carries the credential fields brief_S added to the
      // model (credential id, verify URL, expiry) alongside name/issuer/year.
      const list: StepData[] = replaceList(data, "certifications", "certifications");
      const toYearOrNull = (v: unknown) =>
        typeof v === "number" ? v : v ? Number(v) || null : null;

      const toDateOrNull = (v: unknown) => {
        if (!v || typeof v !== "string") return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
      };

      // brief_U / E044 — a certification is STANDALONE: it belongs to the
      const clean = list
        .map((c) => ({
          name: (c.name ?? "").trim(),
          issuer: c.issuer?.trim() || null,
          year: toYearOrNull(c.year),
          issued_on: toDateOrNull(c.issuedOn),
          credential_id: c.credentialId?.trim() || null,
          url: c.url?.trim() || null,
          expires_on: toDateOrNull(c.expiresOn),
          attachment_path: c.attachmentPath?.trim() || null,
          attachment_name: c.attachmentName?.trim() || null,
          notes: c.notes?.trim() || null,
        }))
        .filter((c) => c.name);

      // THE OWNER IS THE USER, AND IT IS RESOLVED FROM THE PERSON THIS WRITER
      const certOwner = await prisma.person.findUnique({
        where: { id: personId },
        select: { user_id: true },
      });
      if (!certOwner?.user_id) {
        // REFUSED, NOT GUESSED. A Person with no User cannot own a credential
        throw new OnboardingError(
          "This profile has no account attached, so certifications cannot be saved.",
          "INVALID"
        );
      }
      const certUserId = certOwner.user_id;

      await prisma.$transaction([
        // SCOPED TO THIS PROFILE, NOT TO THE USER. The editor is replacing the
        prisma.certification.deleteMany({
          where: { provider_profile_id: profileId, issued_from: "SELF_REPORTED" },
        }),
        ...(clean.length
          ? [
              prisma.certification.createMany({
                data: clean.map((c) => ({
                  user_id: certUserId,
                  provider_profile_id: profileId,
                  ...c,
                })),
              }),
            ]
          : []),
      ]);
      break;
    }

  }

  // THE DOMAIN IS SELF-CORRECTING, NOT PERMANENT PART D)
  if (section === "skills") {
    const stored = await prisma.providerProfile.findUnique({
      where: { id: profileId },
      select: { role_type_id: true, pillar_id: true },
    });
    if (stored?.role_type_id) {
      const derived = await deriveRolesFromSkills(profileId);
      if (
        derived.roleTypeIds[0] === stored.role_type_id &&
        derived.pillarId &&
        derived.pillarId !== stored.pillar_id
      ) {
        await prisma.providerProfile.update({
          where: { id: profileId },
          data: { pillar_id: derived.pillarId },
        });
      }
    }
  }

  // Every save recomputes stored completeness (brief_K) — the marketplace
  // visibility gate reads this column, so it must stay current on every write.
  await recomputeCompleteness(profileId);

  // …and the weighted skill rollup (WS-2), for the sections that touch jobs.
  if (SECTIONS_AFFECTING_ROLLUP.has(section)) {
    await recomputeProviderRollup(profileId);
  }
}

/** The sections whose writes change what the weighted rollup would compute. */
const SECTIONS_AFFECTING_ROLLUP = new Set<string>([
  "experience",
  "work_history_review",
]);

// ---------------------------------------------------------------------------
// Small helpers used by the brief_P steps.
// ---------------------------------------------------------------------------

/** Display labels for the E016 proficiency levels. */
// THE SECOND LABEL TABLE, RETIRED ( item 10). It is `PROFICIENCY_LABEL` now, and
export const LANGUAGE_LEVEL_LABELS = PROFICIENCY_LABEL;

/** Coerce a year-ish value to a plausible 4-digit year, or null. */
function toYear(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  const thisYear = new Date().getFullYear();
  // Allow a decade of future dates for in-progress / expected graduation.
  if (n < 1900 || n > thisYear + 10) return null;
  return n;
}

/** Persist the provider's address on the BACKBONE (E019) rather than bolting */
// EXPORTED FOR SETTINGS (brief 10 WS-B). It is the ONE writer of a
export async function saveProviderAddress(personId: string, addr: StepData): Promise<void> {
  const line1 = (addr.line1 ?? "").trim();
  if (!line1) return; // nothing to save yet — the finish page saves partially

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, company_id: true, site_id: true },
  });
  if (!person) return;

  const fields = {
    line1,
    line2: addr.line2?.trim() || null,
    city: addr.city?.trim() || null,
    state: addr.state?.trim() || null,
    postal_code: addr.postalCode?.trim() || null,
    /* BOTH COLUMNS (`E729` WS-C). */
    ...countryColumns(addr.country),
  };

  let siteId = person.site_id;
  if (!siteId) {
    const site = await prisma.site.create({
      data: { company_id: person.company_id, name: "Primary" },
    });
    siteId = site.id;
    await prisma.person.update({
      where: { id: person.id },
      data: { site_id: siteId },
    });
  }

  const existing = await prisma.address.findFirst({
    where: { site_id: siteId },
    orderBy: { created_at: "asc" },
  });
  if (existing) {
    await prisma.address.update({ where: { id: existing.id }, data: fields });
  } else {
    await prisma.address.create({ data: { site_id: siteId, ...fields } });
  }
}

/** Recompute + persist a provider's `completeness` (0–100) from the single */
/** — THE SCORER'S INPUT, BUILT ONCE AND READ TWICE. */
// THE ROLE IS DERIVED FROM THE PROVIDER'S OWN SKILLS WS-A)

export type DerivedRoles = {
  /** Ordered by THIS provider's skill count, desc. `[0]` is the primary. */
  roleTypeIds: string[];
  /** The primary role's top domain BY THIS PROVIDER'S SKILLS. */
  pillarId: string | null;
  /** How many matched skills backed the answer — 0 means nothing was derived. */
  evidence: number;
};

/** What this provider's own skills say their role(s) are. */
export async function deriveRolesFromSkills(profileId: string): Promise<DerivedRoles> {
  const held = await prisma.providerSkill.findMany({
    where: { provider_profile_id: profileId },
    select: {
      skill: {
        select: { role_type_id: true, pillar_id: true, status: true },
      },
    },
  });

  // — a RETIRED skill still counts as evidence of what this person
  const rows = held
    .map((h) => h.skill)
    .filter((sk): sk is NonNullable<typeof sk> => !!sk && sk.status === "ACTIVE");

  if (rows.length === 0) return { roleTypeIds: [], pillarId: null, evidence: 0 };

  const byRole = new Map<string, number>();
  for (const r of rows) {
    if (!r.role_type_id) continue;
    byRole.set(r.role_type_id, (byRole.get(r.role_type_id) ?? 0) + 1);
  }
  /* TIES BREAK ON THE ROLE ID so the order cannot flicker between equals. */
  const roleTypeIds = [...byRole.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);

  if (roleTypeIds.length === 0) return { roleTypeIds: [], pillarId: null, evidence: 0 };

  /* THE DOMAIN, SAME RULE: this provider's skills WITHIN the primary role. */
  const primary = roleTypeIds[0];
  const byPillar = new Map<string, number>();
  for (const r of rows) {
    if (r.role_type_id !== primary || !r.pillar_id) continue;
    byPillar.set(r.pillar_id, (byPillar.get(r.pillar_id) ?? 0) + 1);
  }
  const pillarId =
    [...byPillar.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    null;

  return { roleTypeIds, pillarId, evidence: rows.length };
}

/** THE SCORER'S `include`, AS ONE CONSTANT */
export const COMPLETENESS_INCLUDE = {
      skills: { include: { skill: { select: { role_type_id: true } } } },
      /* `E517` — the selection the filter reads. */
      roles: { select: { role_type_id: true } },
      specializations: true,
      employers: true,
      education: true,
      languages: true,
      certifications: true,
      // WS-A — Solo Projects is its own scored line now, and a
      projects: { select: { employer_id: true, start_date: true } },
      person: {
        select: {
          // THE TITLE LIVES HERE NOW ( WS-B) — the scorer's `headline`
          title: true,
          photo_url: true,
          phone: true,
          phone_verified_at: true,
          // scored line and is NOT the same fact as `hasAddress`, which is a
          site: {
            select: {
              addresses: {
                select: { line1: true, city: true, state: true, country: true },
                take: 1,
              },
            },
          },
          // THE MEMBERSHIP SELECT LEFT WITH THE WEIGHT .
        },
      },
} as const;

/** THE INPUT SHAPE, AS A PURE FUNCTION. No database, no session, no clock. */
export function completenessInputFrom(
  profile: NonNullable<Awaited<ReturnType<typeof loadForCompleteness>>>
) {
  return {
    headline: profile.person.title,
    overview: profile.overview,
    work_method: profile.work_method,
    pillar_id: profile.pillar_id,
    role_type_id: profile.role_type_id,
    onsite_rate_cents: profile.onsite_rate_cents,
    remote_rate_cents: profile.remote_rate_cents,
    hourly_rate_cents: profile.hourly_rate_cents,
    // COMPLETENESS COUNTS SHOWN, NOT HELD
    skills: shownSkills(selectedRoleIds(profile), profile.skills, (s) => s.skill.role_type_id),
    languages: profile.languages,
    employers: profile.employers,
    education: profile.education,
    certifications: profile.certifications,
    specializations: profile.specializations,
    photoUrl: profile.person.photo_url,
    // An address row exists only once a street line has been entered.
    hasAddress: Boolean(profile.person.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(profile.person.phone?.trim()),
    phoneVerified: profile.person.phone_verified_at != null,

    /* ── THE `E590` LINES. ALL SUPPLIED HERE, THE ONE WRITE PATH. ────── */
    hasLocation: Boolean(
      profile.person.site?.addresses?.[0]?.city?.trim() ||
        profile.person.site?.addresses?.[0]?.state?.trim() ||
        profile.person.site?.addresses?.[0]?.country?.trim()
    ),
    // A SOLO PROJECT IS ONE NO EMPLOYER CLAIMS — the same derivation the
    soloProjects: profile.projects.filter((pr) => pr.employer_id == null),
    // DERIVED, NEVER SELF-REPORTED ( retired the self-reported level).
    hasExperienceYears:
      profile.employers.some((e) => e.start_date != null) ||
      profile.projects.some((pr) => pr.start_date != null),

    /* `null` MEANS UNANSWERED. See the column comments on `ProviderProfile`. */
    declaredNoWorkHistoryAt: profile.declared_no_work_history_at,
    declaredNoEducationAt: profile.declared_no_education_at,
    declaredNoSpecializationsAt: profile.declared_no_specializations_at,
    declaredNoCertificationsAt: profile.declared_no_certifications_at,
    declaredNoSoloProjectsAt: profile.declared_no_solo_projects_at,
  };
}

/** The one-profile load, in the shared shape. */
async function loadForCompleteness(profileId: string) {
  return prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: COMPLETENESS_INCLUDE,
  });
}

/** Unchanged contract: the input for ONE profile, or null if it does not exist. */
export async function buildCompletenessInput(profileId: string) {
  const profile = await loadForCompleteness(profileId);
  if (!profile) return null;
  return completenessInputFrom(profile);
}

/** THE SAME INPUT FOR MANY PROFILES, IN ONE QUERY */
export async function buildCompletenessInputs(
  profileIds: string[]
): Promise<Map<string, ReturnType<typeof completenessInputFrom>>> {
  if (profileIds.length === 0) return new Map();
  const rows = await prisma.providerProfile.findMany({
    where: { id: { in: profileIds } },
    include: COMPLETENESS_INCLUDE,
  });
  return new Map(rows.map((r) => [r.id, completenessInputFrom(r)]));
}

/** Recompute + persist a provider's `completeness` (0–100). */
export async function recomputeCompleteness(profileId: string): Promise<number> {
  const input = await buildCompletenessInput(profileId);
  if (!input) return 0;
  const completeness = computeProviderCompleteness(input);
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: { completeness },
  });
  return completeness;
}

/** Save-as-you-go for the onboarding wizard — behind the email-verify gate, then */
export async function saveProviderStep(
  viewer: Viewer,
  step: ProviderStep,
  data: StepData
) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  // WS3 — the STEP "roles" writes the SECTION "category". Every other step name
  const section: ProfileSection = step === "roles" ? "category" : (step as ProfileSection);
  await applyProviderSection(p.providerProfile!.id, p.id, section, data);
  return getOnboardingState(viewer);
}

/** hands the provider to the review page. */
export async function publishProfile(viewer: Viewer) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  const pp = p.providerProfile!;

  // THE PUBLISH GATE IS THE REQUIRED SET (WS6) — and it is the same set the
  const missing = missingRequired({
    headline: p.title,
    role_type_id: pp.role_type_id,
    skills: pp.skills,
    photoUrl: p.photo_url,
    hourly_rate_cents: pp.hourly_rate_cents,
    rate_min_cents: pp.rate_min_cents,
    rate_max_cents: pp.rate_max_cents,
    onsite_rate_cents: pp.onsite_rate_cents,
    remote_rate_cents: pp.remote_rate_cents,
    hasAddress: Boolean(p.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(p.phone?.trim()),
    overview: pp.overview,
    specializations: pp.specializations,
    languages: pp.languages,
    hasLocation: Boolean(p.site?.addresses?.[0]?.city?.trim() || p.site?.addresses?.[0]?.state?.trim() || p.site?.addresses?.[0]?.country?.trim()),
  });

  if (missing.length > 0) {
    throw new OnboardingError(
      `Before publishing, add ${formatList(missing)}.`,
      "INCOMPLETE"
    );
  }

  const wasAlreadyPublished = pp.onboarding_completed_at != null;
  await prisma.providerProfile.update({
    where: { id: pp.id },
    data: { onboarding_completed_at: pp.onboarding_completed_at ?? new Date() },
  });
  await recomputeCompleteness(pp.id);

  // TWO EVENTS AT ONE WRITE POINT (`P1-ALL`), because the spec defines two
  if (!wasAlreadyPublished) {
    await notify({
      event: "profile.ready",
      personId: pp.person_id,
      entityType: "ProviderProfile",
      entityId: pp.id,
      dedupeKey: `profile.ready:${pp.id}`,
    });
    await notify({
      event: "profile.published",
      personId: pp.person_id,
      entityType: "ProviderProfile",
      entityId: pp.id,
      dedupeKey: `profile.published:${pp.id}`,
    });
  }

  // WS-G — THE CORRECTION SIGNAL, captured at review-save.
  await recordPublishAudit(pp.id);
  await recordGapFlags(pp.id);
  return getOnboardingState(viewer);
}

/** WS5 — record which optional sections this profile left empty. */
async function recordGapFlags(profileId: string): Promise<void> {
  try {
    const pp = await prisma.providerProfile.findUnique({
      where: { id: profileId },
      select: {
        overview: true,
        _count: {
          select: {
            education: true,
            specializations: true,
            languages: true,
            employers: true,
            certifications: true,
          },
        },
      },
    });
    if (!pp) return;
    const data = {
      no_bio: !pp.overview?.trim(),
      no_education: pp._count.education === 0,
      no_specializations: pp._count.specializations === 0,
      no_languages: pp._count.languages === 0,
      no_work_history: pp._count.employers === 0,
      no_certifications: pp._count.certifications === 0,
      computed_at: new Date(),
    };
    await prisma.profileGapFlags.upsert({
      where: { provider_profile_id: profileId },
      update: data,
      create: { provider_profile_id: profileId, ...data },
    });
  } catch (e) {
    console.error("[onboarding] gap flags write failed (non-fatal):", e);
  }
}

/** Compare the most recent AI parse against the profile as it now stands. */
async function recordPublishAudit(profileId: string): Promise<void> {
  try {
    const imp = await prisma.profileImport.findFirst({
      where: { provider_profile_id: profileId, ai_model: { not: null } },
      orderBy: { created_at: "desc" },
      select: {
        raw_text: true,
        parsed: true,
        ai_model: true,
        ai_provider: true,
        /* `E487` — the prompt that RAN. */
        ai_prompt_version: true,
        ai_input_tokens: true,
        ai_output_tokens: true,
        ai_cost_usd: true,
        ai_latency_ms: true,
      },
    });
    if (!imp?.parsed || !imp.raw_text) return;

    const hash = createHash("sha256").update(imp.raw_text).digest("hex");
    const already = await prisma.resumeParseAudit.findFirst({
      where: { provider_profile_id: profileId, resume_hash: hash },
      select: { id: true },
    });
    if (already) return;

    const final = await currentProfileAsParsed(profileId);
    await recordParseAudit({
      providerProfileId: profileId,
      resumeText: imp.raw_text,
      model: imp.ai_model!,
      provider: imp.ai_provider ?? "unknown",
      inputTokens: imp.ai_input_tokens,
      outputTokens: imp.ai_output_tokens,
      costUsd: imp.ai_cost_usd ? Number(imp.ai_cost_usd) : null,
      latencyMs: imp.ai_latency_ms,
      parsed: imp.parsed as unknown as ParsedResume,
      /* `E487` — the version that RAN, carried forward from the parse. */
      promptVersion: imp.ai_prompt_version,
      final,
    });
  } catch (e) {
    console.error("[resume] publish audit failed (non-fatal):", e);
  }
}

/** The saved profile, in the same shape a parse produces, so the two compare. */
async function currentProfileAsParsed(profileId: string): Promise<ParsedResume> {
  const pp = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: {
      // person now. `headline: true,`
      person: { select: { title: true } },
      overview: true,
      employers: {
        select: {
          name: true,
          role_title: true,
          description: true,
          start_date: true,
          end_date: true,
        },
      },
      education: {
        select: {
          institution: true,
          degree: true,
          field: true,
          start_year: true,
          end_year: true,
          description: true,
        },
      },
      skills: { select: { skill: { select: { name: true } } } },
      languages: { select: { name: true } },
    },
  });
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    // ( WS-B). `headline: pp?.headline ?? null,`
    headline: pp?.person?.title ?? null,
    overview: pp?.overview ?? null,
    // Built from what is already STORED, not from a document — this shape feeds
    certifications: [],
    experienceLevel: null,
    experienceYears: null,
    /* `E294` — this shape re-reads a SAVED profile back into `ParsedResume`;
       projects are read from their own rows elsewhere, not reconstructed here.
       Empty, never absent, so the field is always present. */
    projects: [],
    experiences: (pp?.employers ?? []).map((e) => ({
      employer: e.name,
      roleTitle: e.role_title ?? "",
      description: e.description ?? null,
      startDate: iso(e.start_date),
      endDate: iso(e.end_date),
    })),
    education: (pp?.education ?? []).map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startYear: e.start_year,
      endYear: e.end_year,
      description: e.description,
    })),
    skills: (pp?.skills ?? []).map((s) => s.skill.name),
    languages: (pp?.languages ?? []).map((l) => l.name),
    gaps: [],
  };
}

/** "a, b and c" — for readable multi-field validation messages. */
function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Buyer onboarding (brief_G) — the lighter sibling of the provider flow.

const SUBSCRIPTION_TIERS = ["BASIC", "BUSINESS_PLUS"] as const;

export type CreateBuyerAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  tosAccepted: boolean;
};

/** Creates PAccount(BUYER) → Company → User → Person(is_service_buyer) → draft */
export async function createBuyerAccount(
  input: CreateBuyerAccountInput
): Promise<{ userId: string; email: string }> {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!input.tosAccepted) {
    throw new OnboardingError("You must accept the Terms of Service", "INVALID");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new OnboardingError("That email is already registered", "EMAIL_TAKEN");
  }

  const password_hash = await hashPassword(input.password);
  const companyName = `${firstName} ${lastName}`.trim() || email;

  const userId = await prisma.$transaction(async (tx) => {
    const pAccount = await tx.pAccount.create({
      data: { kind: "BUYER", name: companyName, status: "ACTIVE" },
    });
    const company = await tx.company.create({
      data: { p_account_id: pAccount.id, name: companyName },
    });
    const user = await tx.user.create({
      data: {
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: "MEMBER",
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
    });
    const person = await tx.person.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        is_service_buyer: true,
      },
    });
    await tx.buyerProfile.create({
      data: {
        person_id: person.id,
        // subscription_tier defaults to BASIC; the tier step may upgrade it.
      },
    });
    return user.id;
  });


  // CREDIT THE INVITATION THAT BROUGHT THEM IN WS-C)
  await creditInviteForNewUser(userId, email);
  return { userId, email };
}

/** Resolve the viewer's buyer identity (ownership boundary). */
async function loadBuyer(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    include: {
      user: { select: { email: true, email_verified: true } },
      buyerProfile: true,
    },
  });
  if (!person || !person.is_service_buyer || !person.buyerProfile) {
    throw new OnboardingError("No buyer profile for this user", "NOT_A_BUYER");
  }
  return person;
}

/** Buyer wizard state: verify gate + tier. No review/approval (buyers go live). */
export async function getBuyerState(viewer: Viewer) {
  const p = await loadBuyer(viewer);
  const emailVerified = p.user?.email_verified != null;
  return {
    email: p.user?.email ?? "",
    emailVerified,
    // Short flow: verify first, then tier. Once verified, land on tier.
    resumeStep: emailVerified ? ("tier" as const) : ("verify" as const),
    subscriptionTier: p.buyerProfile!.subscription_tier,
    trialStartedAt: p.buyerProfile!.trial_started_at,
    firstName: p.first_name,
  };
}

/** Set the buyer's subscription tier. BUSINESS_PLUS records a trial start (no */
export async function setBuyerTier(
  viewer: Viewer,
  tier: (typeof SUBSCRIPTION_TIERS)[number]
) {
  const p = await loadBuyer(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  if (!SUBSCRIPTION_TIERS.includes(tier)) {
    throw new OnboardingError("Invalid subscription tier", "INVALID");
  }
  await prisma.buyerProfile.update({
    where: { id: p.buyerProfile!.id },
    data: {
      subscription_tier: tier,
      trial_started_at: tier === "BUSINESS_PLUS" ? new Date() : null,
    },
  });
  return getBuyerState(viewer);
}
