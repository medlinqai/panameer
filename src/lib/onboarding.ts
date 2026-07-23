import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { Viewer } from "@/lib/access";

/**
 * Provider onboarding — all business logic for the /join wizard (API-first, so
 * the mobile app reuses it). Access control is by identity: every read/write is
 * keyed on `viewer.userId` and the Person 1:1-linked to it, so a viewer can
 * only ever touch their own draft profile.
 */

/** Post-account wizard steps, in order. Also the resume sequence. */
export const PROVIDER_STEPS = [
  "work_type",
  "skills",
  "title",
  "experience",
  "education_languages",
  "bio",
  "rate",
  "region",
  "photo",
  "review",
] as const;
export type ProviderStep = (typeof PROVIDER_STEPS)[number];

/** Steps the user may pass without entering data. */
const OPTIONAL_STEPS = new Set<ProviderStep>([
  "education_languages",
  "photo",
]);

const EXPERIENCE_LEVELS = ["BEGINNER", "MID_CAREER", "EXPERT"] as const;
const PROVIDER_GOALS = [
  "SIDE_HUSTLE",
  "MAIN_HUSTLE",
  "BUILD_SKILLS",
  "NONE",
] as const;
const WORK_TYPES = ["HOURLY", "PACKAGES", "AGENCY", "CONTRACT_TO_HIRE"] as const;

export class OnboardingError extends Error {
  constructor(
    message: string,
    public code: "EMAIL_TAKEN" | "NOT_A_PROVIDER" | "NOT_VERIFIED" | "INVALID" | "INCOMPLETE"
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
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number];
  goal: (typeof PROVIDER_GOALS)[number];
};

/**
 * Creates PAccount(PROVIDER) → Company → User → Person(is_service_provider) →
 * draft ProviderProfile, atomically, persisting the held experience + goal.
 * A provider is their own company (Company name defaults to their full name).
 */
export async function createProviderAccount(
  input: CreateProviderAccountInput
): Promise<{ userId: string; email: string }> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!EXPERIENCE_LEVELS.includes(input.experienceLevel)) {
    throw new OnboardingError("Invalid experience level", "INVALID");
  }
  if (!PROVIDER_GOALS.includes(input.goal)) {
    throw new OnboardingError("Invalid goal", "INVALID");
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
        experience_level: input.experienceLevel,
        goal: input.goal,
        published: false,
        approval_status: "PENDING",
      },
    });
    return user.id;
  });

  return { userId, email };
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
  const newEmail = newEmailRaw.trim().toLowerCase();
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
      providerProfile: {
        include: {
          skills: { include: { skill: { select: { role_type_id: true } } } },
          workExperiences: {
            orderBy: { created_at: "asc" },
            include: { projects: { orderBy: { created_at: "asc" } } },
          },
          education: { orderBy: { created_at: "asc" } },
          languages: { orderBy: { created_at: "asc" } },
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
 * targets — optional steps (education/languages, photo) are encountered walking
 * forward but never send a returning user backward. Because the wizard enforces
 * linear order, the first incomplete required step IS the furthest reached.
 */
function computeResumeStep(p: Awaited<ReturnType<typeof loadDraft>>): ProviderStep {
  const pp = p.providerProfile!;
  const done: Record<ProviderStep, boolean> = {
    work_type: pp.work_types.length > 0,
    skills: pp.skills.length > 0,
    title: pp.headline.trim() !== "",
    experience: pp.workExperiences.length > 0,
    education_languages: true, // optional — never a resume target
    bio: !!pp.overview && pp.overview.trim() !== "",
    rate: pp.onsite_rate_cents != null || pp.remote_rate_cents != null,
    region: pp.region_id != null,
    photo: true, // optional — never a resume target
    review: false,
  };
  for (const step of PROVIDER_STEPS) {
    if (step === "review") break;
    if (OPTIONAL_STEPS.has(step)) continue;
    if (!done[step]) return step;
  }
  return "review";
}

/** True when every REQUIRED step is satisfied (optional steps don't gate). */
function isComplete(p: Awaited<ReturnType<typeof loadDraft>>): boolean {
  const pp = p.providerProfile!;
  return (
    pp.work_types.length > 0 &&
    pp.skills.length > 0 &&
    pp.headline.trim() !== "" &&
    pp.workExperiences.length > 0 &&
    !!pp.overview &&
    pp.overview.trim() !== "" &&
    (pp.onsite_rate_cents != null || pp.remote_rate_cents != null) &&
    pp.region_id != null
  );
}

/** The full onboarding snapshot the wizard needs to render + resume. */
export async function getOnboardingState(viewer: Viewer) {
  const p = await loadDraft(viewer);
  const pp = p.providerProfile!;
  const emailVerified = p.user?.email_verified != null;

  return {
    email: p.user?.email ?? "",
    emailVerified,
    resumeStep: emailVerified ? computeResumeStep(p) : ("verify" as const),
    complete: isComplete(p),
    profile: {
      experienceLevel: pp.experience_level,
      goal: pp.goal,
      workTypes: pp.work_types,
      roleTypeId: pp.skills[0]?.skill.role_type_id ?? null,
      skillIds: pp.skills.map((s) => s.skill_id),
      headline: pp.headline,
      overview: pp.overview ?? "",
      onsiteRateCents: pp.onsite_rate_cents,
      remoteRateCents: pp.remote_rate_cents,
      currency: pp.currency,
      regionId: pp.region_id,
      photoUrl: p.photo_url,
      firstName: p.first_name,
      lastName: p.last_name,
      experiences: pp.workExperiences.map((w) => ({
        id: w.id,
        employer: w.employer,
        roleTitle: w.role_title,
        description: w.description,
        startDate: w.start_date ? w.start_date.toISOString().slice(0, 10) : null,
        endDate: w.end_date ? w.end_date.toISOString().slice(0, 10) : null,
        projects: w.projects.map((pr) => ({
          name: pr.name,
          description: pr.description,
        })),
      })),
      education: pp.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        year: e.year,
      })),
      languages: pp.languages.map((l) => ({
        name: l.name,
        proficiency: l.proficiency,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Save-as-you-go — one handler per step, each persisting on Continue.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StepData = Record<string, any>;

export async function saveProviderStep(
  viewer: Viewer,
  step: ProviderStep,
  data: StepData
) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  const profileId = p.providerProfile!.id;

  switch (step) {
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

    case "skills": {
      const roleTypeId: string = data.roleTypeId;
      const skillIds: string[] = Array.isArray(data.skillIds)
        ? data.skillIds
        : [];
      if (!roleTypeId || skillIds.length === 0) {
        throw new OnboardingError("Pick a category and at least one skill", "INVALID");
      }
      // One-main-category enforcement: every chosen skill must belong to the
      // single selected RoleType.
      const skills = await prisma.skill.findMany({
        where: { id: { in: skillIds } },
        select: { id: true, role_type_id: true },
      });
      if (
        skills.length !== skillIds.length ||
        skills.some((s) => s.role_type_id !== roleTypeId)
      ) {
        throw new OnboardingError(
          "All skills must belong to the selected category",
          "INVALID"
        );
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
      const list: StepData[] = Array.isArray(data.experiences)
        ? data.experiences
        : [];
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
      // Replace the whole set (the wizard holds and posts the full list).
      await prisma.$transaction(async (tx) => {
        await tx.workExperience.deleteMany({
          where: { provider_profile_id: profileId },
        });
        for (const e of clean) {
          await tx.workExperience.create({
            data: {
              provider_profile_id: profileId,
              employer: e.employer,
              role_title: e.roleTitle,
              description: e.description,
              start_date: e.startDate,
              end_date: e.endDate,
              projects: { create: e.projects },
            },
          });
        }
      });
      break;
    }

    case "education_languages": {
      const education: StepData[] = Array.isArray(data.education)
        ? data.education
        : [];
      const languages: StepData[] = Array.isArray(data.languages)
        ? data.languages
        : [];
      const cleanEdu = education
        .map((e) => ({
          institution: (e.institution ?? "").trim(),
          degree: e.degree?.trim() || null,
          field: e.field?.trim() || null,
          year: typeof e.year === "number" ? e.year : null,
        }))
        .filter((e) => e.institution);
      const cleanLang = languages
        .map((l) => ({
          name: (l.name ?? "").trim(),
          proficiency: l.proficiency?.trim() || null,
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

    case "bio": {
      const overview: string = (data.overview ?? "").trim();
      if (!overview) throw new OnboardingError("Bio is required", "INVALID");
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
      const onsite = toCents(data.onsiteDollars);
      const remote = toCents(data.remoteDollars);
      if (onsite == null && remote == null) {
        throw new OnboardingError("Enter at least one rate", "INVALID");
      }
      await prisma.providerProfile.update({
        where: { id: profileId },
        data: {
          onsite_rate_cents: onsite,
          remote_rate_cents: remote,
          currency: typeof data.currency === "string" ? data.currency : undefined,
        },
      });
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

    case "photo": {
      // Optional; no real upload in this brief (initials placeholder fallback).
      const photoUrl: string | null =
        typeof data.photoUrl === "string" && data.photoUrl.trim()
          ? data.photoUrl.trim()
          : null;
      await prisma.person.update({
        where: { id: p.id },
        data: { photo_url: photoUrl },
      });
      break;
    }

    case "review":
      break;
  }

  return getOnboardingState(viewer);
}

// ---------------------------------------------------------------------------
// Submit for review.
// ---------------------------------------------------------------------------

export async function submitProviderProfile(viewer: Viewer) {
  const p = await loadDraft(viewer);
  if (p.user?.email_verified == null) {
    throw new OnboardingError("Verify your email first", "NOT_VERIFIED");
  }
  if (!isComplete(p)) {
    throw new OnboardingError("Complete all required steps first", "INCOMPLETE");
  }
  await prisma.providerProfile.update({
    where: { id: p.providerProfile!.id },
    // Under review until an admin approves (separate brief).
    data: { published: false, approval_status: "PENDING" },
  });
  return { ok: true };
}
