import { prisma } from "@/lib/prisma";
import {
  ownedProviderProfile,
  isMarketplaceVisible,
  type Viewer,
} from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import {
  applyProviderSection,
  OnboardingError,
  type ProfileSection,
} from "@/lib/onboarding";

/**
 * Provider Settings — the "manage my profile" area (brief_H). Every read/write
 * is OWNER-SCOPED: the profile is resolved from the session viewer via
 * `ownedProviderProfile(viewer)` (access.ts), never from a client-supplied id,
 * so a provider can only ever touch their own profile. Fails closed.
 *
 * Section writes reuse the onboarding persistence (`applyProviderSection`) so
 * there is exactly one implementation of the save logic.
 */

/** Sections editable from Settings (a superset is allowed by applyProviderSection). */
const SETTINGS_SECTIONS: ProfileSection[] = [
  "work_type",
  "skills",
  "title",
  "experience",
  "education_languages",
  "bio",
  "rate",
  "region",
  "photo",
  "experience_level",
  "goal",
  "certifications",
];

/** Resolve the viewer's OWN provider profile (id + personId). Fails closed. */
async function loadOwned(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      person_id: true,
      status: true,
      validation_status: true,
      experience_level: true,
    },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return profile;
}

/** Full editable snapshot of the owner's profile for the Settings > Profile page. */
export async function getProviderSettings(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    include: {
      person: {
        select: { first_name: true, last_name: true, photo_url: true },
      },
      region: { select: { id: true, name: true } },
      skills: {
        include: { skill: { select: { id: true, role_type_id: true, name: true } } },
      },
      workExperiences: {
        orderBy: { created_at: "asc" },
        include: { projects: { orderBy: { created_at: "asc" } } },
      },
      education: { orderBy: { created_at: "asc" } },
      languages: { orderBy: { created_at: "asc" } },
      certifications: { orderBy: { created_at: "asc" } },
    },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }

  return {
    firstName: profile.person.first_name,
    lastName: profile.person.last_name,
    photoUrl: profile.person.photo_url,
    headline: profile.headline,
    overview: profile.overview ?? "",
    experienceLevel: profile.experience_level,
    goal: profile.goal,
    workTypes: profile.work_types,
    roleTypeId: profile.skills[0]?.skill.role_type_id ?? null,
    skillIds: profile.skills.map((s) => s.skill_id),
    skillNames: profile.skills.map((s) => ({ id: s.skill_id, name: s.skill.name })),
    onsiteRateCents: profile.onsite_rate_cents,
    remoteRateCents: profile.remote_rate_cents,
    currency: profile.currency,
    regionId: profile.region_id,
    region: profile.region,
    idBadge: profile.id_badge,
    status: profile.status,
    validationStatus: profile.validation_status,
    completeness: profile.completeness,
    visibilityThreshold: VISIBILITY_THRESHOLD,
    paused: profile.paused_at != null,
    visible: isMarketplaceVisible(profile),
    rating: profile.rating === null ? null : Number(profile.rating),
    preferences: {
      notifyEmail: profile.notify_email,
      notifyProductUpdates: profile.notify_product_updates,
    },
    experiences: profile.workExperiences.map((w) => ({
      employer: w.employer,
      roleTitle: w.role_title,
      description: w.description,
      startDate: w.start_date ? w.start_date.toISOString().slice(0, 10) : null,
      endDate: w.end_date ? w.end_date.toISOString().slice(0, 10) : null,
      projects: w.projects.map((pr) => ({ name: pr.name, description: pr.description })),
    })),
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      year: e.year,
    })),
    languages: profile.languages.map((l) => ({
      name: l.name,
      proficiency: l.proficiency,
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      year: c.year,
    })),
  };
}

/** Save one profile section (owner-scoped). Reuses onboarding persistence. */
export async function saveProviderSection(
  viewer: Viewer,
  section: ProfileSection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
) {
  if (!SETTINGS_SECTIONS.includes(section)) {
    throw new OnboardingError("Unknown section", "INVALID");
  }
  const owned = await loadOwned(viewer); // owner check (fail closed)
  await applyProviderSection(owned.id, owned.person_id, section, data);
  return getProviderSettings(viewer);
}

/**
 * Pause / unpause the profile (brief_K). Paused = hidden from the marketplace
 * regardless of completeness. There is NO publish action — visibility is
 * derived; pausing is the only manual visibility control.
 */
export async function setPaused(viewer: Viewer, paused: boolean) {
  const owned = await loadOwned(viewer);
  await prisma.providerProfile.update({
    where: { id: owned.id },
    data: { paused_at: paused ? new Date() : null },
  });
  return getProviderSettings(viewer);
}

/**
 * Request Validation (brief_K) — the merit track. Sets validation_status to
 * REQUESTED + a timestamp; an admin grants/rejects it later (brief_M). Only
 * meaningful from NOT_REQUESTED or REJECTED; already-requested/validated is a
 * no-op. Never changes base visibility.
 */
export async function requestValidation(viewer: Viewer) {
  const owned = await loadOwned(viewer);
  if (
    owned.validation_status === "NOT_REQUESTED" ||
    owned.validation_status === "REJECTED"
  ) {
    await prisma.providerProfile.update({
      where: { id: owned.id },
      data: {
        validation_status: "REQUESTED",
        validation_requested_at: new Date(),
      },
    });
  }
  return getProviderSettings(viewer);
}

/** Set the ID badge value (owner-scoped). Simple string; no 3rd-party verify. */
export async function setIdBadge(viewer: Viewer, idBadge: string | null) {
  const owned = await loadOwned(viewer);
  await prisma.providerProfile.update({
    where: { id: owned.id },
    data: { id_badge: idBadge && idBadge.trim() ? idBadge.trim() : null },
  });
  return getProviderSettings(viewer);
}

/** Save minimal notification preferences (owner-scoped). */
export async function savePreferences(
  viewer: Viewer,
  prefs: { notifyEmail?: boolean; notifyProductUpdates?: boolean }
) {
  const owned = await loadOwned(viewer);
  await prisma.providerProfile.update({
    where: { id: owned.id },
    data: {
      notify_email:
        typeof prefs.notifyEmail === "boolean" ? prefs.notifyEmail : undefined,
      notify_product_updates:
        typeof prefs.notifyProductUpdates === "boolean"
          ? prefs.notifyProductUpdates
          : undefined,
    },
  });
  return getProviderSettings(viewer);
}
