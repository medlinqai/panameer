import { prisma } from "@/lib/prisma";
import {
  ownedProviderProfile,
  isMarketplaceVisible, providerMeetsRequired,
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

/**
 * Sections editable from Settings (a superset is allowed by applyProviderSection).
 *
 * ── ⚠⚠ THIS LIST IS A SECOND ALLOW-LIST, AND IT KILLED A SCREEN (`E405` WS-1) ─
 *
 * There are TWO allow-lists on the way in to this endpoint — the Zod body schema
 * in `section-schemas.ts`, and this one. `P1-A1.3-E401` moved `work_method` from
 * a wizard step to a SECTION, added the schema entry and the `applyProviderSection`
 * case, pointed the client at this endpoint — and never added it HERE. The result
 * was `POST /api/settings/profile/section 400`, and Scott's *"cant go forward…
 * can't go backward. HARD STOP."*
 *
 * ⚠ `work_type` WAS ALREADY IN THIS LIST AND `work_method` WAS NOT — two
 * different fields whose names differ by four letters. The persistence layer
 * distinguishes them; this list never learned to.
 *
 * ⚠⚠ ADDING A SECTION MEANS ADDING IT IN THREE PLACES. `check:section-endpoint`
 * now asserts every `section: "<name>"` literal the client sends satisfies all
 * three, because satisfying two of three is exactly what shipped.
 */
const SETTINGS_SECTIONS: ProfileSection[] = [
  "work_type",
  /* ⚠ NOT A PATCH — IT BELONGS HERE ON THE MERITS. `page.tsx` already promises
     *"A person can still change their own method later in Settings"*, and
     `applyProviderSection`'s `case "work_method"` was written to be called from
     exactly here. */
  "work_method",
  "skills",
  "title",
  "experience",
  "education_languages",
  "bio",
  "rate",
  "region",
  "photo",
  "certifications",
];


/*
  ── ⚠⚠⚠ ONE NOTIFICATION PER SAVE — `P2-A1.1-E741` (A3 row 1) ───────────────

  ⚠ SCOTT, 2026-09-30, and ruling 31d: *"Get Notified of Profile Updates… you
  don't need twenty rows."* ⚠⚠ **ONE EVENT PER SAVE, NAMING THE SECTION IN ITS
  TEXT — NOT ONE PER FIELD.** A save that changes five skills is ONE row.

  ⚠⚠⚠ **THE MAP LIVES HERE, BESIDE THE SECTION KEYS, BECAUSE THIS IS THE FILE
  THAT KNOWS THEM.** Putting it in the event's `title()` would make sixteen
  title functions each responsible for a vocabulary they cannot see.
  ⚠ A section with no entry falls back to *"profile"*, so a new section added to
  `SETTINGS_SECTIONS` cannot crash a save — it just gets a generic word, which
  is a missing label rather than a missing notification.
*/
const SECTION_LABEL: Partial<Record<ProfileSection, { noun: string; plural: boolean }>> = {
  work_type: { noun: "Work Type", plural: false },
  work_method: { noun: "How You Work", plural: false },
  skills: { noun: "Skills", plural: true },
  title: { noun: "Title", plural: false },
  experience: { noun: "Work History", plural: false },
  education_languages: { noun: "Education and Languages", plural: true },
  bio: { noun: "Overview", plural: false },
  rate: { noun: "Rates", plural: true },
  region: { noun: "Location", plural: false },
  photo: { noun: "Photo", plural: false },
  certifications: { noun: "Certifications", plural: true },
};

/** Resolve the viewer's OWN provider profile (id + personId). Fails closed. */
async function loadOwned(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      person_id: true,
      status: true,
      validation_status: true,
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
      /*
        ⚠⚠ WIDENED FOR THE ONE GATE (`P2-J3-E590` WS-A0). ⚠ SUPERSEDED, quoted
        not deleted (`E164`):
        // person: { select: { first_name: true, last_name: true, photo_url: true } },
        ⚠ `include` already carries every scalar on the profile, so `headline`,
        `role_type_id` and the five rate columns were present — only the PERSON
        half of the required set was missing.
      */
      person: {
        select: {
          first_name: true,
          last_name: true,
          /* ⚠ `title` — the profile's title lives on the PERSON since `E595` WS-B. */
          title: true,
          photo_url: true,
          phone: true,
          site: { select: { addresses: { select: { id: true } } } },
        },
      },
      region: { select: { id: true, name: true } },
      skills: {
        include: { skill: { select: { id: true, role_type_id: true, name: true } } },
      },
      employers: {
        orderBy: [{ sort_order: "asc" }, { start_date: "desc" }],
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
    /* ⚠ THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
       `E595` WS-B collapsed the two columns into one. */
    headline: profile.person.title ?? "",
    overview: profile.overview ?? "",
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
    visible: isMarketplaceVisible({
      ...profile,
      meetsRequired: providerMeetsRequired(profile),
    }),
    rating: profile.rating === null ? null : Number(profile.rating),
    preferences: {
      notifyEmail: profile.notify_email,
      notifyProductUpdates: profile.notify_product_updates,
    },
    experiences: profile.employers.map((w) => ({
      employer: w.name,
      roleTitle: w.role_title ?? "",
      description: w.description,
      startDate: w.start_date ? w.start_date.toISOString().slice(0, 10) : null,
      endDate: w.end_date ? w.end_date.toISOString().slice(0, 10) : null,
      projects: w.projects.map((pr) => ({ name: pr.name, description: pr.description })),
    })),
    /*
      E164 — the READ half. This returned four of education's seven columns, so
      the settings form loaded a row with no dates and no description and saved
      that truncated row straight back over the full one. Every mapper on this
      path — read, schema, writer, editor — has to agree on the shape, and all
      four disagreed in different directions.
    */
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      year: e.year,
      startYear: e.start_year,
      endYear: e.end_year,
      description: e.description,
    })),
    languages: profile.languages.map((l) => ({
      name: l.name,
      proficiency: l.proficiency,
      level: l.level,
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      year: c.year,
      /*
        ⚠⚠ `P2-A4-E710` — THE OWNER SEES IT TOO, AND THAT IS NOT A COURTESY. ⚠⚠⚠ A
        provider who cannot tell which of their own credentials Panameer witnessed
        cannot tell what sitting a test would ADD, which is the one thing this screen
        should make obvious. ⚠ The nested read carries every column, so this is a
        pass-through rather than a widened query.
      */
      issuedFrom: c.issued_from,
      credentialId: c.credential_id,
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
  /*
    ⚠⚠ **AFTER THE WRITE SUCCEEDS, NEVER BEFORE** (the brief's own words). A
    throw in `applyProviderSection` skips this, so a failed save never tells the
    member it saved.
    ⚠⚠⚠ **AND IT NEVER FAILS THE SAVE.** `notify()` is awaited inside a catch:
    the profile row is already written, and turning a notification outage into a
    save outage is the `E522` receipt lesson — *"a receipt can never fail a
    send."*
    ⚠ **NO `sendEmail()` HERE** — ruling 86: `notify()` is the one place, and a
    profile writer calling the transport directly is the two-pipe problem.
    ⚠ The dedupe key collapses a double-submit of the SAME section within the
    same minute into one row, which is what a member means by "I saved once".
  */
  try {
    const { notify } = await import("@/lib/notifications");
    await notify({
      event: "profile.section_saved",
      personId: owned.person_id,
      dedupeKey: `profile.section_saved:${section}:${Math.floor(Date.now() / 60_000)}`,
      /* ⚠ The verb travels with the noun — see the note on the event. A section
         with no entry falls back to "profile" / "was", which reads correctly. */
      vars: {
        section: SECTION_LABEL[section]?.noun ?? "profile",
        verb: SECTION_LABEL[section]?.plural ? "were" : "was",
      },
    });
  } catch (e) {
    console.error("[profile] could not record a profile-update notification:", e);
  }
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
  /*
    ── ⚠⚠ ROWS 3 AND 4 — TWO EVENTS, NOT ONE WITH A FLAG (`E741`) ───────────
    ⚠ Scott's table gives OFF an email default of **on** and ON **off**, and one
    event cannot carry two defaults. ⚠⚠ Same placement rule as above: after the
    write, inside a catch, and `notify()` only.
  */
  try {
    const { notify } = await import("@/lib/notifications");
    await notify({
      event: paused ? "profile.visibility_off" : "profile.visibility_on",
      personId: owned.person_id,
      dedupeKey: `profile.visibility:${paused ? "off" : "on"}:${Math.floor(Date.now() / 60_000)}`,
    });
  } catch (e) {
    console.error("[profile] could not record a visibility notification:", e);
  }
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
