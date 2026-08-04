import { prisma } from "@/lib/prisma";
import { projectToCard } from "@/lib/project-card";
import { toView as toArtifactView } from "@/lib/artifacts";
import { hashPassword } from "@/lib/password";
import { acceptInviteForUser } from "@/lib/coordinator";
import {
  computeProviderCompleteness,
  missingRequired,
  VISIBILITY_THRESHOLD,
} from "@/lib/completeness";
import type { Viewer } from "@/lib/access";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { createHash } from "node:crypto";
import { recordParseAudit } from "@/lib/resume/audit";
import type { ParsedResume } from "@/lib/resume/parse";
import { USER_TOS_VERSION } from "@/lib/tos";
import { capitalizeName } from "@/lib/display";

/**
 * Provider onboarding — all business logic for the /join wizard (API-first, so
 * the mobile app reuses it). Access control is by identity: every read/write is
 * keyed on `viewer.userId` and the Person 1:1-linked to it, so a viewer can
 * only ever touch their own draft profile.
 */

/**
 * The post-verification profile build (PJv2 WS1 / E070) — spec = Scott's
 * "Overview of Reg Steps by User Type" diagram.
 *
 * The Upwork-derived opening (Experience Level, Goal, a standalone "How Do You
 * Work") is GONE: two of those were self-reported guesses we now derive or no
 * longer need (E068/E067), and the third is a USER-TYPE fork that belongs at the
 * front of the journey, not three screens deep (E066).
 *
 * TITLE FIRST, then the steps mirror the profile's own sections, so the wizard
 * and the finished profile read in the same order.
 *
 *   Provider  (10): Title → RDS → Upload/Review → Specializations → Education
 *                   → Languages → Bio → Rate → Picture → Review All
 *   Recruiter  (8): the same, minus Education and Rate — a recruiter sells other
 *                   people's time, so neither is theirs to state.
 *
 * `RECRUITER_STEPS` is a strict subset, which is what lets one `ProviderStep`
 * type, one label table and one save path serve both.
 */
/**
 * THE COUNTED ITINERARY — six stops (brief_onboarding_slimdown WS1 / E169).
 *
 * The wizard was ELEVEN trainstops. The thesis behind this cut: capture only
 * what makes a provider MATCHABLE (skills, rate) and CONTACTABLE (photo,
 * company, address, phone), AI-prefill everything else onto the review page
 * unprompted, and nudge the deliberate gaps by email later.
 *
 * Bio, Education and Specializations are NOT deleted — they stay in the model,
 * stay AI-prefilled from the résumé, and stay editable on the review page. They
 * simply stop being stops, and they no longer gate publish (WS6).
 *
 * ⚠ LANGUAGES IS AN INFERENCE, FLAGGED. The brief names Bio / Education /
 * Specializations / DOB as removed and lists the six steps exhaustively —
 * Languages appears in neither list. It is treated like the other three (kept,
 * AI-prefilled, editable on review, not a stop, not a gate) because that is
 * what the brief's own principle implies for anything outside the required set.
 * If Languages was meant to stay a stop, this is the one line to change.
 *
 * `tell_us` — the résumé upload / AI entry — is deliberately NOT in this list.
 * The brief keeps it "up-front… preceding the steps", so it renders before step
 * 1 without a number. It was already excluded from resume targets, so nothing
 * downstream treated it as a milestone anyway.
 */
export const PROVIDER_STEPS = [
  "title", //     1 — what you do
  "roles", //     2 — WS3: role(s), multi-select
  "skills", //    3 — WS3: its own page, filtered by the chosen roles
  "rate", //      4 — provider only; the match needs a price
  "picture", //   5 — required to publish (WS7 addendum, unchanged)
  "company", //   6 — the entity a work order is with (brief_company_model)
  "finish", //    7 — Review + publish
] as const;
export type ProviderStep =
  | (typeof PROVIDER_STEPS)[number]
  /*
    STILL RENDERABLE, JUST NOT COUNTED. These screens exist — `tell_us` as the
    pre-step, the other four as review-page sections and Settings targets — so
    they stay in the type and in the save switch. Dropping them from the union
    would delete the ability to WRITE the data, which is not what the brief
    asks: it asks for them to stop being prompted.
  */
  | "tell_us"
  | "specializations"
  | "education"
  | "languages"
  | "bio"
  /*
    The combined Role→Domain→Skills page WS3 replaced. Kept in the union and in
    the save switch because Settings still posts it and an older client tab
    mid-flow will too — refusing it would 400 a surface this brief doesn't
    touch. It is simply no longer in the itinerary.
  */
  | "catalog";

/** The uncounted screens that precede the numbered steps. */
export const PRE_STEPS = ["tell_us"] as const;

/**
 * Every step name the save endpoint accepts — the counted itinerary PLUS the
 * screens that still write data without being stops. The API validates against
 * this; validating against the itinerary would refuse a review-page bio edit.
 */
export const SAVEABLE_STEPS: readonly ProviderStep[] = [
  ...PROVIDER_STEPS,
  "catalog",
  "tell_us",
  "specializations",
  "education",
  "languages",
  "bio",
];

/** Recruiter journey: no Rate — a recruiter sells other people's time (E070). */
export const RECRUITER_STEPS = [
  "title",
  "roles",
  "skills",
  "picture",
  "company",
  "finish",
] as const satisfies readonly ProviderStep[];

/** Steps that only exist on the provider journey. */
const PROVIDER_ONLY_STEPS = new Set<ProviderStep>(["education", "rate"]);

/**
 * A RECRUITER is a provider whose `work_method` is RECRUITER — the discriminator
 * the up-front fork now sets, instead of a mid-wizard question.
 */
export function isRecruiterProfile(p: { work_method: string | null }): boolean {
  return p.work_method === "RECRUITER";
}

/** The step list this profile actually walks. */
export function stepsForProfile(p: {
  work_method: string | null;
}): readonly ProviderStep[] {
  return isRecruiterProfile(p) ? RECRUITER_STEPS : PROVIDER_STEPS;
}

export const TOTAL_PROVIDER_STEPS = PROVIDER_STEPS.length; // 10 (PJv2 WS1)

/** 1-based position within the caller's own step list. */
export function providerStepNumber(
  step: ProviderStep,
  steps: readonly ProviderStep[] = PROVIDER_STEPS
): number {
  return steps.indexOf(step) + 1;
}

/**
 * Stepper heading + forward-button label per step.
 *
 * The "Next: …" labels name the step that follows on the PROVIDER journey; the
 * wizard overrides the label for a recruiter where the next step differs, so
 * the button never promises a step that user will not see.
 */
export const PROVIDER_STEP_LABELS: Record<
  ProviderStep,
  { stepper: string; next: string }
> = {
  title: { stepper: "Your Title", next: "Next: Your Role" },
  roles: { stepper: "Your Role", next: "Next: Your Skills" },
  skills: { stepper: "Your Skills", next: "Next: Your Rate" },
  catalog: { stepper: "Your Role & Skills", next: "Next: Your Rate" },
  rate: { stepper: "Your Rate", next: "Next: Your Photo" },
  picture: { stepper: "Your Photo", next: "Next: Your Company" },
  company: { stepper: "Your Company", next: "Next: Review Your Profile" },
  finish: {
    stepper: "Review Your Profile",
    next: "Next: Publish Your Profile",
  },
  // Uncounted screens. `next` is unused for these — nothing forwards to them.
  tell_us: { stepper: "Build Your Profile", next: "Next: Your Title" },
  specializations: { stepper: "Your Specializations", next: "" },
  education: { stepper: "Your Education", next: "" },
  languages: { stepper: "Your Languages", next: "" },
  bio: { stepper: "Your Bio", next: "" },
};

/*
  THE "NEXT:" LABELS ARE DERIVED, NOT TYPED (pitfalls.md — a label must never
  promise a step that no longer exists).

  The recruiter journey skips Rate, so a hardcoded "Next: Your Rate" on the
  Role step lies to half the users of that step. `nextLabelFor` reads the
  ACTUAL itinerary the caller is walking; the table above is the fallback for
  the provider path and the source of the stepper headings.
*/
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

/**
 * Steps a user may pass without entering data. Education is explicitly
 * optional-with-a-Skip (E015): not everyone has one, but we still ask.
 * `tell_us` is a method CHOICE — picking "manual" is a valid way through it.
 */
const OPTIONAL_STEPS = new Set<ProviderStep>([
  // The Upload/Review pre-step: uploading is one valid way through it, and
  // entering everything by hand is the other. Never a resume target.
  "tell_us",
  // WS1 — these left the itinerary entirely. Listed so that if one is ever put
  // back, it comes back optional rather than silently becoming a blocker.
  "specializations",
  "education",
  "languages",
  "bio",
]);

/**
 * Section names that are NOT wizard steps but are still written by the Settings
 * area (brief_H). `experience` here is work HISTORY (employers/projects) — not
 * to be confused with the `experience_level` step.
 */
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
] as const;

const WORK_TYPES = ["HOURLY", "PACKAGES", "AGENCY", "CONTRACT_TO_HIRE"] as const;
const WORK_METHODS = ["HOURLY", "PACKAGES", "RECRUITER"] as const;
// "LINKEDIN" is retained ONLY so rows imported before PJv2 WS13 still read; no
// code path writes it any more (E069).
const PROFILE_METHODS = ["LINKEDIN", "RESUME", "MANUAL"] as const;
const LANGUAGE_LEVELS = [
  "BASIC",
  "CONVERSATIONAL",
  "FLUENT",
  "NATIVE_OR_BILINGUAL",
] as const;

/** E014 — a provider may list at most 15 skills. */
export const MAX_SKILLS = 15;
/** E017 — a bio must be a real answer, not one word. */
export const MIN_BIO_CHARS = 100;
/**
 * A few lines, not an essay (Run6 WS7 / E087).
 *
 * Was 4500 — roughly forty lines. This field becomes the profile's OVERVIEW, and
 * the hero it renders into is built for a short paragraph; a long one throws the
 * whole hero/Overview balance out (E076). The hero also read-more-clamps (E060),
 * but a clamp is damage control: it hides the overrun from the buyer and leaves
 * the provider believing the whole thing is being read. The INPUT cap is the real
 * fix, because it is the only version of this that tells the author the truth
 * while they are still writing.
 *
 * 600 characters is about four to six lines at profile width. The MINIMUM is
 * unchanged (E017) — the point is a ceiling, not a harder floor.
 */
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
  /**
   * brief_P moved experience level + goal OUT of sign-up and into profile
   * steps 1 and 2 (E003/E004), so both are optional here. The schema defaults
   * (MID_CAREER / NONE) hold until the provider reaches those steps.
   */
  /** Deck sign-up fields (E001 CHANGE 2). */
  country?: string;
  marketingOptIn?: boolean;
  /** Optional coordinator invite token (brief_I) — links the new provider to
   *  the inviting coordinator after account creation, if it matches this email. */
  inviteToken?: string;
};

/**
 * Creates PAccount(PROVIDER) → Company → User → Person(is_service_provider) →
 * draft ProviderProfile, atomically, persisting the held experience + goal.
 * A provider is their own company (Company name defaults to their full name).
 */
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
        /*
          WS6 — THE PROVIDER PATH RECORDED NOTHING. The API has required
          `tosAccepted: literal(true)` since brief_P, the form has a required
          checkbox, and neither wrote a row: every provider who ticked it has no
          acceptance on file. The buyer path did write the timestamp. Found by
          reading the three signup paths side by side for this brief.
        */
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
        headline: "", // set at the Title step
        // Both default in the schema; brief_P collects them at steps 1–2.
        // The deck's "send me helpful emails" opt-in (E001) maps onto the
        // preference store brief_H already created — no new column needed.
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
        data: { site_id: site.id, line1: "", country: input.country.trim() },
      });
      await tx.person.update({
        where: { id: person.id },
        data: { site_id: site.id },
      });
    }

    return user.id;
  });

  // If this signup came from a coordinator invite, link the new provider to the
  // inviter (brief_I). Reuses the authoritative acceptInviteForUser, which
  // enforces the email matches the invite — a mismatch just skips linking and
  // never fails the signup.
  if (input.inviteToken) {
    try {
      await acceptInviteForUser(userId, input.inviteToken);
    } catch (e) {
      console.error("[onboarding] invite link failed (non-fatal):", e);
    }
  }

  return { userId, email };
}

/**
 * Give an ALREADY-AUTHENTICATED user the provider backbone (brief_Q).
 *
 * OAuth sign-in creates the `User` only — signing in with Google says nothing
 * about whether someone is a buyer or a provider, so `linkOAuthUser`
 * deliberately stops at identity. This is the other half: called from the
 * provider join flow, where the intent IS known, it builds
 * PAccount(PROVIDER) → Company → Person(is_service_provider) → draft
 * ProviderProfile for a user who has no Person yet.
 *
 * Idempotent — a user who already has a provider profile just gets it back, so
 * a double-submit or a refresh mid-flow can't create a second company.
 */
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
          data: { site_id: site.id, line1: "", country: opts.country.trim() },
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
        headline: "",
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

/**
 * Correct a mistyped email — allowed only while the account is still
 * unverified. Updates the User's email + name-derived Company/Person nothing
 * else; the caller re-issues verification to the new address.
 */
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
          // null `employer_id` is deliberately unattached (delivered between or
          // outside companies), and reading projects only through employers is
          // what made those invisible on the Review while the published profile
          // showed them (brief_profile_layout_v2 §4).
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

/**
 * The furthest incomplete step to resume at. Only REQUIRED steps are resume
 * targets — optional steps (tell-us, education) are encountered walking forward
 * but never send a returning user backward. Because the wizard enforces linear
 * order, the first incomplete required step IS the furthest reached.
 *
 * A provider who already pressed Publish resumes on the finish step, so the
 * wizard hands them straight to the review page rather than re-walking them.
 */
function computeResumeStep(p: Awaited<ReturnType<typeof loadDraft>>): ProviderStep {
  const pp = p.providerProfile!;
  const done: Record<ProviderStep, boolean> = {
    title: pp.headline.trim() !== "",
    /*
      WS3 — two steps, two conditions. A provider who claimed a role and then
      closed the tab resumes onto SKILLS, not back onto the role they already
      answered. The domain is derived, so it is not part of either condition.
    */
    roles: pp.role_type_id != null,
    skills: pp.skills.length > 0,
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
    /*
      The photo step also collects the CONTACT block — phone and address.

      DATE OF BIRTH IS GONE from this condition (WS1, completed by WS7). It was
      part of "done" here, so with DOB no longer asked anywhere a returning
      provider would have been parked on this step forever, unable to finish.
      That is the removal half of the invisible-profile bug class: a condition
      that outlives the question it was checking.
    */
    picture: p.photo_url != null && p.phone != null,
    // Done when a company binding EXISTS AND IS APPROVED. A pending join is not
    // done — the provider is waiting on somebody, and resuming them past it
    // would let them publish with no entity behind the profile.
    company: p.companyMemberships.some((m) => m.status === "APPROVED"),
    finish: pp.onboarding_completed_at != null,
  };
  // Walk the list THIS profile actually has, so a recruiter is never parked on
  // a step (Education, Rate) their journey doesn't include.
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
  // Marketplace visibility is completeness-gated (brief_K), no submit step.
  const visible =
    pp.status === "ACTIVE" &&
    pp.completeness >= VISIBILITY_THRESHOLD &&
    pp.paused_at == null;

  const address = p.site?.addresses?.[0] ?? null;

  return {
    email: p.user?.email ?? "",
    emailVerified,
    resumeStep: emailVerified ? computeResumeStep(p) : ("verify" as const),
    // WS1 — the client no longer hard-codes the step list: a recruiter walks a
    // shorter journey, and the server is the only place that knows which.
    steps: stepsForProfile(pp),
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
      /*
        WS2 — the full role set. `roleTypeId` above stays the PRIMARY so every
        existing reader keeps working; this is additive. Falls back to the
        primary for profiles written before the join table existed, so an
        older profile reads as a one-role provider rather than a role-less one.
      */
      roleTypeIds: pp.roles.length
        ? pp.roles.map((r) => r.roleType.id)
        : pp.role_type_id
          ? [pp.role_type_id]
          : [],
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
      skillNames: pp.skills.map((s) => ({ id: s.skill_id, name: s.skill.name })),
      headline: pp.headline,
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
        // API uses. This projection used to list a handful of columns by hand,
        // so the wizard's project modal opened a v2 project with its client,
        // role, tools, outcomes and contact email all blank — and saving from
        // there wrote those blanks back. One mapper, one place to forget a
        // field.
        artifacts: e.artifacts.map(toArtifactView),
        projects: e.projects.map(projectToCard),
      })),
      projects: pp.projects.map(projectToCard),
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

/**
 * Every editable profile section. The onboarding wizard uses PROVIDER_STEPS;
 * the Settings area (brief_H) additionally edits the LEGACY_SECTIONS — work
 * method, employers, certifications — on the same live profile.
 */
export type ProfileSection = ProviderStep | (typeof LEGACY_SECTIONS)[number];

/**
 * Apply ONE profile section — pure persistence + validation, no gating.
 * Shared by onboarding (`saveProviderStep`, behind the verify gate) and the
 * Settings area (`saveProviderSection`, owner-scoped) so the write logic —
 * including the one-main-RoleType rule and cents conversion — lives in exactly
 * one place. `personId` is needed for the photo (lives on Person).
 */
/**
 * The collection a REPLACE-ALL section is about to overwrite (E121).
 *
 * Six sections delete every row for the profile and recreate from the payload.
 * Each used to read its list as `Array.isArray(data.x) ? data.x : []`, which
 * makes a missing key mean "clear it" — and that is how a Walk6 POST with the
 * wrong key name deleted four employers while returning 200.
 *
 * The route validates shapes now, but this is the writer's own guard: a caller
 * reaching `applyProviderSection` directly (a script, a seed, a future endpoint)
 * gets the same refusal. An ABSENT key throws; an EMPTY ARRAY is honoured,
 * because deliberately clearing a section is a legitimate thing to do and the
 * two must stay distinguishable.
 */
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
      // of OTHERS, which is the app's Coordinator role (brief_I), so choosing
      // it grants the coordinator actor flag. The provider flag is NOT removed:
      // a recruiter still has their own provider profile, and dropping it would
      // strand them outside /join/provider mid-wizard.
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
      /*
        MULTIPLE ROLES (WS2 / E172, E173) — this supersedes the locked "one main
        RoleType" rule. A techno-functional consultant genuinely works as both
        Application-Specific and Technology-Specific, and forcing one meant the
        skills step could only ever offer half their catalog.

        `role_type_id` on the profile SURVIVES as the primary — what the profile
        leads with and what every existing derivation reads. The join table
        carries the full set including that primary, so nothing has to union two
        sources to answer "which roles?".

        DOMAIN IS STILL WRITTEN. It left the UI (WS3), not the data: a Skill's
        identity is its (role, domain) pair, and `pillar_id` remains the
        profile's primary domain. It is now DERIVED from the first chosen
        role's skills rather than picked, so the pair stays coherent without
        asking a question the brief removed.
      */
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

      /*
        The primary DOMAIN, derived rather than asked. A supplied pillarId is
        honoured when it belongs to the primary role (Settings still posts one);
        otherwise take the primary role's first domain by skill count so the
        (role, domain) pair on the profile is always a real pair.
      */
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
        const grouped = await prisma.skill.groupBy({
          by: ["pillar_id"],
          where: { role_type_id: primaryRoleId, pillar_id: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        });
        pillarId = grouped[0]?.pillar_id ?? null;
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

      /*
        PRUNE BY ROLE, NOT BY THE (role, domain) PAIR.

        This used to delete every skill whose role OR domain differed from the
        single chosen pair. Under multi-role that is data loss by construction:
        choosing a second role would wipe the skills you picked under the first,
        and with domain gone from the UI the domain half of the test now
        matches skills the provider can legitimately see and pick.

        The prune still earns its place — a résumé import matches across the
        whole catalog, so a skill can arrive from a role the provider never
        claimed, and the skills step would neither show it nor accept it on
        save. Scoped to the ROLES they actually chose, it removes exactly those
        strandable rows and nothing else.
      */
      await prisma.providerSkill.deleteMany({
        where: {
          provider_profile_id: profileId,
          skill: { role_type_id: { notIn: roleTypeIds } },
        },
      });
      break;
    }

    case "employers": {
      // brief_U — employers are created/edited through the dedicated
      // owner-scoped endpoint (`/api/provider/employers`), which validates each
      // id against the viewer's own profile. Continuing past the step has
      // nothing left to persist; this case exists so the step is a legal POST
      // target and so completeness is recomputed on the way through.
      break;
    }

    /*
      WS3 — the combined page became two steps, each saving its own half.

      They can now be left half-written by design: claiming a role and stopping
      is a legitimate place to pause, and the resume logic sends that provider
      to Skills rather than back to a question they answered. The old "save as
      one unit" argument was about a cross-domain skill surviving into the next
      step, and that is handled where it belongs — the role writer prunes skills
      outside the claimed ROLES (WS2).
    */
    /*
      ⚠ THE STEP NAMES AND THE SECTION NAMES ARE DIFFERENT NAMESPACES, and this
      switch is the SECTION one.

      WS3 first put `case "roles"` and `case "skills"` here. `applyProviderSection`
      already has a "skills" section further down, so the new case shadowed it
      and delegated to "skills" — itself — and every skills save died with
      "Maximum call stack size exceeded", surfacing as a 500 and "Add at least
      one skill" on a profile that had picked three. The build was clean and the
      UI walk passed, because nothing had tried to SAVE.

      The step→section mapping belongs in `saveProviderStep`, which is where it
      is now. This case stays as it always was: the combined page's section,
      still reachable from Settings.
    */
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
      // be in the seeded vocabulary yet; refusing it would cost us the signal.
      // Custom entries join the SAME vocabulary (deduped case-insensitively) so
      // the next provider can pick it from the list rather than retyping it.
      const custom: string[] = Array.isArray(data.customSpecializations)
        ? data.customSpecializations
        : [];
      for (const raw of custom) {
        const name = String(raw).trim().slice(0, 80);
        if (!name) continue;
        const existing = await prisma.specialization.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });
        if (existing) {
          if (!ids.includes(existing.id)) ids.push(existing.id);
          continue;
        }
        const catalog = await prisma.serviceCatalog.findFirst({
          select: { id: true },
        });
        if (!catalog) break;
        const created = await prisma.specialization.create({
          data: {
            catalog_id: catalog.id,
            name,
            kind: "PRODUCT",
            // Sorts after the seeded vocabulary.
            sort_order: 900,
            is_custom: true,
          },
        });
        ids.push(created.id);
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
      // so they satisfy the same scoping rule as catalog skills and show up on
      // that field's list for everyone afterwards. The catalog is seed-driven
      // today; an admin editor is a later brief.
      const customSkills: string[] = Array.isArray(data.customSkills)
        ? data.customSkills
        : [];
      /*
        WS2 — an add-on-the-fly skill is filed under a DECLARED role.

        `customSkillRoleId` is what the UI sends when a provider has more than
        one role and picks which the new skill belongs to; it defaults to the
        primary. The role must be one they actually claimed — otherwise a client
        could seed the catalog under any role at all, and the skill would then
        be invisible to its own author on the next visit.

        The domain still comes from the profile's primary pillar, because a
        Skill's uniqueness key is the full (catalog, role, domain, name) path —
        `pitfalls.md`: a name is not a key once the taxonomy gains a level.
      */
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

      if (customSkills.length > 0 && customRoleId && customPillarId) {
        const catalogRow = await prisma.serviceCatalog.findFirst({
          select: { id: true },
        });
        for (const raw of customSkills) {
          const name = String(raw).trim().slice(0, 120);
          if (!name || !catalogRow) continue;
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
              // Preserved deliberately — `is_custom` is the seed-retirement
              // shield: the taxonomy reseed removes catalog rows it no longer
              // ships, and a provider-authored skill must survive that.
              is_custom: true,
            },
          });
          if (!skillIds.includes(skill.id)) skillIds.push(skill.id);
        }
      }

      if (skillIds.length === 0) {
        throw new OnboardingError("Pick at least one skill", "INVALID");
      }
      if (skillIds.length > MAX_SKILLS) {
        throw new OnboardingError(
          `Pick up to ${MAX_SKILLS} skills`,
          "INVALID"
        );
      }

      /*
        WS1/E102 + E110 — the single-domain lock is GONE.

        These two throws ("All skills must belong to the selected category" /
        "…to the field you chose") blocked any provider whose skills span more
        than one domain. Linus spans Supply Chain AND Finance, so his profile
        could not be saved at all — a hard stop on the flow, not a nicety.

        It was never a data constraint. `ProviderSkill` is a plain join and
        carries no domain of its own, and the review page's "Skills we couldn't
        place" path has always written skills across domains without complaint.
        The rule existed only on this one code path, which is why the product
        contradicted itself depending on which screen you used.

        The profile's own `role_type_id` / `pillar_id` stay as the PRIMARY field —
        what the profile leads with and what buyers filter on. They are no longer
        a fence around which skills may be attached.

        The integrity check that matters is kept: every id must resolve to a real
        Skill, so a client cannot invent one.
      */
      const skills = await prisma.skill.findMany({
        where: { id: { in: skillIds } },
        select: { id: true },
      });
      if (skills.length !== skillIds.length) {
        throw new OnboardingError("Unknown skill selected", "INVALID");
      }

      await prisma.$transaction([
        prisma.providerSkill.deleteMany({
          where: { provider_profile_id: profileId },
        }),
        prisma.providerSkill.createMany({
          data: skillIds.map((skill_id) => ({
            provider_profile_id: profileId,
            skill_id,
          })),
        }),
      ]);
      break;
    }

    case "title": {
      const headline: string = (data.headline ?? "").trim();
      if (!headline) throw new OnboardingError("Title is required", "INVALID");
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: { headline },
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
          projects: (Array.isArray(e.projects) ? e.projects : [])
            .map((pr: StepData) => ({
              name: (pr.name ?? "").trim(),
              description: pr.description?.trim() || null,
            }))
            .filter((pr: { name: string }) => pr.name),
        }))
        .filter((e) => e.employer && e.roleTitle);

      // brief_project_model_v2 — imported projects are left UNCLASSIFIED.
      //
      // `client_name` is required and the employer is a truthful value for it
      // (the work was delivered there by definition). `role_type_id` is NOT
      // guessed: a parser cannot know whether a role was functional or
      // technical, and writing a default would put a value the provider never
      // chose into the reporting grain. Null instead, and the review page
      // nudges them to classify — see `reviewItems`.
      // brief_U / E042 — writes EMPLOYERS now. Settings still posts this
      // "experience" shape, so the section survives; only its destination
      // changed, from the retired flat WorkExperience to Employer + Project.
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
              end_date: e.endDate,
              is_current: Boolean(e.startDate) && !e.endDate,
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
      /*
        E164 — THIS WRITER WAS LOSING HALF THE ROW.

        Education has two writers: the wizard's `education` step, which stores
        start_year, end_year and description, and this section, which stored
        only institution / degree / field / the LEGACY single `year`. Both
        delete-and-recreate the whole list — so the moment anything saved
        through this path, every date and description the wizard had collected
        was gone, and the review then rendered a row with no dates. That is
        "education edits don't show on Review": the edit saved, and a different
        writer erased the other half of it.

        The two now write the SAME columns. `year` is still accepted for rows
        that predate start/end, and start_year falls back to it rather than
        being dropped.

        Languages had the identical bug one field over: this wrote the legacy
        free-text `proficiency` while `level` is canonical (E016), so a level
        set in the wizard disappeared on the next settings save.
      */
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
          level: LANGUAGE_LEVELS.includes(l.level) ? l.level : null,
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

      // E018 — the wizard posts a single required hourly rate. Settings
      // (brief_H) still posts the onsite/remote pair, so accept either shape.
      if (hourly == null && onsite == null && remote == null) {
        throw new OnboardingError("Enter your hourly rate", "INVALID");
      }
      if (hourly != null && hourly === 0) {
        throw new OnboardingError("Your hourly rate must be more than $0", "INVALID");
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: {
          ...(hourly != null ? { hourly_rate_cents: hourly } : {}),
          ...(onsite != null || remote != null
            ? { onsite_rate_cents: onsite, remote_rate_cents: remote }
            : {}),
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
      // (brief_O endpoint); phone verification is its own challenge/response.
      // This persists DOB + address and nothing else, so a half-filled finish
      // page still saves. Publishing is a SEPARATE call (`publishProfile`),
      // which is where the required-field gate lives.
      /*
        DATE OF BIRTH IS NO LONGER CAPTURED (WS7 / E178).

        It gated publish and marketplace visibility and nothing in the
        marketplace ever read it — a buyer needs to reach a provider, not know
        their age. If age or legal capacity is ever required it belongs to the
        tax/payout gate, where there is a reason to ask and a form that already
        asks it.

        The COLUMN stays, nullable, and existing values are left alone: no
        destructive drop, per the brief. `lib/dob.ts` also stays — it is the
        validator that gate will want.
      */
      // E036 — phone verification is STUBBED. We store the number the provider
      // typed so the profile is complete and publishable; we do NOT mark it
      // verified, because it hasn't been. The real SMS challenge/response is
      // built and untouched (`phone-verification.ts`) — flipping it back on is
      // re-adding the publish-gate line, not rebuilding the flow.
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

    /*
      The COMPANY step writes NOTHING here (WS5).

      The binding is created by /api/company/define or /api/company/join, which
      own the attestation, the company ToS and the approval decision. This case
      exists so the wizard's save-as-you-go call for the step is a no-op rather
      than an "Unknown step" error — and it re-checks the membership, so a
      client that skipped the company screen can't advance past it.
    */
    case "company": {
      const bound = await prisma.companyMembership.findFirst({
        where: { person_id: personId, status: "APPROVED" },
        select: { id: true },
      });
      if (!bound) {
        throw new OnboardingError(
          "Add or join your company before continuing",
          "INVALID"
        );
      }
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
      // certifying agency that issued it, not to an employer. The employer
      // column, relation and the brief_T "carry the link forward by name"
      // logic are all gone.
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

      await prisma.$transaction([
        prisma.certification.deleteMany({
          where: { provider_profile_id: profileId },
        }),
        ...(clean.length
          ? [
              prisma.certification.createMany({
                data: clean.map((c) => ({ provider_profile_id: profileId, ...c })),
              }),
            ]
          : []),
      ]);
      break;
    }

  }

  // Every save recomputes stored completeness (brief_K) — the marketplace
  // visibility gate reads this column, so it must stay current on every write.
  await recomputeCompleteness(profileId);
}

// ---------------------------------------------------------------------------
// Small helpers used by the brief_P steps.
// ---------------------------------------------------------------------------

/** Display labels for the E016 proficiency levels. */
export const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  BASIC: "Basic",
  CONVERSATIONAL: "Conversational",
  FLUENT: "Fluent",
  NATIVE_OR_BILINGUAL: "Native or Bilingual",
};

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

/**
 * Persist the provider's address on the BACKBONE (E019) rather than bolting
 * address columns onto Person: P-Account → Company → Site → Address → Person is
 * the model (architecture.md), so a provider's address is an Address on their
 * own company's Site. Creates the Site/Address on first save, updates after.
 */
async function saveProviderAddress(personId: string, addr: StepData): Promise<void> {
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
    country: addr.country?.trim() || null,
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

/**
 * Recompute + persist a provider's `completeness` (0–100) from the single
 * `computeProviderCompleteness` helper. Called after every section save.
 */
export async function recomputeCompleteness(profileId: string): Promise<number> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      skills: true,
      specializations: true,
      employers: true,
      education: true,
      languages: true,
      certifications: true,
      person: {
        select: {
          photo_url: true,
          phone: true,
          phone_verified_at: true,
          site: { select: { addresses: { select: { line1: true }, take: 1 } } },
          // WS6 — company is part of the required set now, so the meter has to
          // be able to see it. pitfalls.md: add the field to CompletenessInput
          // AND to every caller that builds one, or the weight is unreachable.
          companyMemberships: {
            where: { status: "APPROVED" as const },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!profile) return 0;
  const completeness = computeProviderCompleteness({
    headline: profile.headline,
    overview: profile.overview,
    work_method: profile.work_method,
    pillar_id: profile.pillar_id,
    role_type_id: profile.role_type_id,
    onsite_rate_cents: profile.onsite_rate_cents,
    remote_rate_cents: profile.remote_rate_cents,
    hourly_rate_cents: profile.hourly_rate_cents,
    skills: profile.skills,
    languages: profile.languages,
    employers: profile.employers,
    education: profile.education,
    certifications: profile.certifications,
    specializations: profile.specializations,
    photoUrl: profile.person.photo_url,
    hasCompany: profile.person.companyMemberships.length > 0,
    // An address row exists only once a street line has been entered.
    hasAddress: Boolean(profile.person.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(profile.person.phone?.trim()),
    phoneVerified: profile.person.phone_verified_at != null,
  });
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: { completeness },
  });
  return completeness;
}

/**
 * Save-as-you-go for the onboarding wizard — behind the email-verify gate, then
 * delegates to the shared `applyProviderSection`. Returns the fresh state.
 */
export async function saveProviderStep(
  viewer: Viewer,
  step: ProviderStep,
  data: StepData
) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  /*
    WS3 — the STEP "roles" writes the SECTION "category". Every other step name
    happens to equal its section name, which is exactly why this mapping has to
    be explicit: an implicit identity that holds for nine of ten cases is the
    kind that gets assumed for the tenth.
  */
  const section: ProfileSection = step === "roles" ? "category" : (step as ProfileSection);
  await applyProviderSection(p.providerProfile!.id, p.id, section, data);
  return getOnboardingState(viewer);
}

/**
 * "Publish Profile" (E019) — the finish action. Marks onboarding complete and
 * hands the provider to the review page.
 *
 * IMPORTANT: this is NOT a visibility switch. brief_K locked marketplace
 * visibility as DERIVED (status ACTIVE ∧ completeness ≥ 80 ∧ not paused) and
 * deliberately deleted the old `published` flag — resurrecting one here would
 * relitigate that decision. `onboarding_completed_at` records only that the
 * provider walked the journey to the end.
 */
export async function publishProfile(viewer: Viewer) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  const pp = p.providerProfile!;

  /*
    THE PUBLISH GATE IS THE REQUIRED SET (WS6) — and it is the same set the
    marketplace gate reads, deliberately. Publishing into invisibility is the
    worst outcome this flow can produce: the provider is told they are live and
    no buyer can see them.

    Bio, languages and date of birth are GONE from this list. They were here
    while the wizard asked for them; with the slimdown it no longer does, so
    keeping them would refuse to publish a provider who completed every step
    they were shown — a dead end with no way out from inside the product.

    Company is new here: a work order is between companies, so a provider
    without an approved membership cannot be contracted.
  */
  const person = await prisma.person.findUnique({
    where: { id: p.id },
    select: {
      companyMemberships: {
        where: { status: "APPROVED" as const },
        select: { id: true },
        take: 1,
      },
    },
  });

  const missing = missingRequired({
    headline: pp.headline,
    role_type_id: pp.role_type_id,
    skills: pp.skills,
    photoUrl: p.photo_url,
    hourly_rate_cents: pp.hourly_rate_cents,
    rate_min_cents: pp.rate_min_cents,
    rate_max_cents: pp.rate_max_cents,
    onsite_rate_cents: pp.onsite_rate_cents,
    remote_rate_cents: pp.remote_rate_cents,
    hasCompany: (person?.companyMemberships.length ?? 0) > 0,
    hasAddress: Boolean(p.site?.addresses?.[0]?.line1?.trim()),
    hasPhone: Boolean(p.phone?.trim()),
  });

  if (missing.length > 0) {
    throw new OnboardingError(
      `Before publishing, add ${formatList(missing)}.`,
      "INCOMPLETE"
    );
  }

  await prisma.providerProfile.update({
    where: { id: pp.id },
    data: { onboarding_completed_at: pp.onboarding_completed_at ?? new Date() },
  });
  await recomputeCompleteness(pp.id);

  /*
    WS-G — THE CORRECTION SIGNAL, captured at review-save.

    Publish is the moment the person has finished editing what the parser gave
    them, so it is the only point where "what the model said" and "what a human
    actually kept" both exist. Awaited but never fatal — the audit writer
    swallows its own errors, because losing a publish over telemetry would be
    an absurd trade.
  */
  await recordPublishAudit(pp.id);
  await recordGapFlags(pp.id);
  return getOnboardingState(viewer);
}

/**
 * WS5 — record which optional sections this profile left empty.
 *
 * Written at publish, when "what did they choose not to fill in" is finally a
 * settled question. RECORDED, NOT SENT: the re-engagement engine is its own
 * feature and out of scope, but it cannot be built retrospectively against
 * history nobody kept.
 *
 * Never fatal — a telemetry write must not cost somebody their publish.
 */
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

/**
 * Compare the most recent AI parse against the profile as it now stands.
 *
 * Only AI parses are audited: a heuristic parse has no model and no cost, so
 * there is nothing to attribute an accuracy number to. One audit per import,
 * enforced by the resume-hash check, so republishing doesn't inflate the counts.
 */
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
      headline: true,
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
    headline: pp?.headline ?? null,
    overview: pp?.overview ?? null,
    experienceLevel: null,
    experienceYears: null,
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

// ===========================================================================
// Buyer onboarding (brief_G) — the lighter sibling of the provider flow.
// Buyers are NOT reviewed: no review gate; active on verify +
// tier choice. Reuses the same email-verification machinery (VerificationToken
// + /verify-email + issue/consume) — nothing new there.
// ===========================================================================

const SUBSCRIPTION_TIERS = ["BASIC", "BUSINESS_PLUS"] as const;

export type CreateBuyerAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  tosAccepted: boolean;
};

/**
 * Creates PAccount(BUYER) → Company → User → Person(is_service_buyer) → draft
 * BuyerProfile, atomically. A buyer is their own company (name defaults to the
 * full name). Records ToS acceptance timestamp on the User.
 */
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

/**
 * Set the buyer's subscription tier. BUSINESS_PLUS records a trial start (no
 * billing collected — payment is deferred). BASIC clears any trial start.
 */
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
