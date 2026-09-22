import type { ProviderDraft, Step } from "@/lib/onboarding-draft";

/**
 * ── ⚠⚠ THE ONE-SECTION EDITORS, AS DATA (`P2-A2-E597` WS-C) ──────────────
 *
 * ⚠ SCOTT, walking `/connect`: *"ALL THE EDITS on this page should go to a page
 * where the editor I can just change THAT particular value."*
 *
 * ⚠⚠ THIS REGISTRY IS WHAT STOPS A SECOND SAVE PATH. Each section names the
 * SAME `Step` the wizard posts and builds the SAME payload, so the server's
 * `case` — the actual save — has exactly one implementation and the route
 * cannot invent a variant of it.
 * ⚠⚠⚠ TWO SAVE PATHS FOR ONE FIELD IS HOW THE TWO TITLES HAPPENED (`E595`).
 * That is the defect this whole brief exists to make structurally impossible,
 * so the payloads live HERE rather than being retyped at a call site.
 *
 * ⚠ `slug` IS THE URL AND IT IS NOT THE STEP. `/profile/edit/work-history`
 * posts `tell_us`, and `/profile/edit/rates` posts `rate` — the wizard's step
 * vocabulary is internal and the URL is read by people.
 * ⚠⚠ THE SLUG IS ALSO THE ANCHOR the profile is scrolled back to, so it has to
 * match the `id` on the section's card.
 */

export type SectionSlug =
  | "bio"
  | "rates"
  | "skills"
  | "specializations"
  | "certifications"
  | "education"
  | "work-history"
  | "solo-projects"
  /*
    ── ⚠⚠⚠ THE SEVEN SCORE LINES THAT HAD NO EDITOR (`P2-A2-E600` WS-F) ──────

    ⚠ `E600` WS-C found `E597`'s complaint alive on the Score page: every
    `SCORE_LINE_COPY` href pointed into `/join/provider`. Nine lines could be
    re-pointed at `E597`'s editors; SEVEN had none, because the profile rendered
    no Edit control for any of them.
    ⚠⚠ SIX SLUGS COVER THE SEVEN LINES: `identity` and `location` are the SAME
    ADDRESS — `hasLocation` reads the address's city/state/country and
    `identity` reads `hasAddress && hasPhone`, and both are written by the
    `finish` step. ⚠⚠⚠ ONE FIELD, ONE SAVE PATH (`E595`): giving them two
    editors would be two ways to write one address.
  */
  | "title"
  | "role"
  | "photo"
  | "contact"
  | "languages"
  | "work-method";

export type SectionSpec = {
  slug: SectionSlug;
  /** ⚠ The heading, and the `aria-label` the profile's Edit link already uses. */
  title: string;
  /**
   * ⚠⚠ `null` MEANS THE EDITOR COMMITS AS IT GOES. `EmployersStep` saves each
   * employer and project through its own routes the moment they are entered —
   * `E411` records that — so Work History and Solo Projects have no Save button
   * and nothing to post. ⚠ Giving them one would be a SECOND save path for
   * rows that are already saved.
   */
  /*
     ⚠⚠ `Step | "certifications"`, AND THE ODD ONE OUT IS REAL. The server has a
     `case "certifications"` in `onboarding.ts`, but the WIZARD's `ALL_STEPS`
     itinerary does not list it — certifications are edited from the review, not
     walked to. ⚠ So the section's step is a step the SERVER accepts, which is a
     slightly wider set than the wizard's screens. Recorded rather than widened
     `ALL_STEPS`, which would put a screen in the itinerary that does not exist.
  */
  /*
    ⚠⚠⚠ WIDENED AGAIN BY `P2-A2-E600` WS-F, FOR THE REASON ALREADY RECORDED
    ABOVE: the server's `case` list is a SLIGHTLY WIDER SET than the wizard's
    `ALL_STEPS` itinerary. ⚠ `photo` and `work_method` are both real
    `applyProviderSection` cases (`onboarding.ts:2510` and `:1397`) that are not
    screens the wizard walks to — the photo is taken on the finish screen and
    `work_method` is a fork, not a step (`check:recruiter` asserts it is NOT in
    `ALL_STEPS`, and that assertion is untouched).
    ⚠⚠ RECORDED RATHER THAN WIDENING `ALL_STEPS`, which would put screens in the
    itinerary that do not exist — the same call made for `certifications`.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   step: Step | "certifications" | null;
  */
  step: Step | "certifications" | "photo" | "work_method" | null;
  /** The wizard's own payload for that step, built from the same draft. */
  payload: ((d: ProviderDraft) => Record<string, unknown>) | null;
};

export const PROFILE_SECTIONS: readonly SectionSpec[] = [
  {
    slug: "bio",
    title: "Bio",
    step: "bio",
    payload: (d) => ({ overview: d.overview }),
  },
  {
    slug: "rates",
    title: "Rates",
    step: "rate",
    /* ⚠ DOLLARS ON THE WIRE, CENTS IN THE COLUMN — the wizard's own conversion,
       not a second one. An empty rate posts "" exactly as it does there. */
    payload: (d) => ({
      hourlyDollars: d.hourlyRateCents != null ? d.hourlyRateCents / 100 : "",
    }),
  },
  {
    slug: "skills",
    title: "Skills",
    step: "skills",
    /* ⚠⚠ ALL FIVE FIELDS. An earlier pass of `E597` WS-B reduced this payload to
       `{}` at the wizard's call site and the save looked like it worked — the
       reason it is written out here once rather than assembled per caller. */
    payload: (d) => ({
      skillIds: d.skillIds,
      customSkills: d.customSkills,
      customSkillRoleId: d.roleTypeId,
      roleTypeIds: d.roleTypeIds,
      roleTypeId: d.roleTypeId,
    }),
  },
  {
    slug: "specializations",
    title: "Specializations",
    step: "specializations",
    payload: (d) => ({
      specializationIds: d.specializationIds,
      customSpecializations: d.customSpecializations,
    }),
  },
  {
    slug: "certifications",
    title: "Certifications",
    step: "certifications",
    payload: (d) => ({ certifications: d.certifications }),
  },
  {
    slug: "education",
    title: "Education",
    step: "education",
    payload: (d) => ({ education: d.education }),
  },
  /* ⚠⚠ ONE EDITOR, TWO DOORS — `E411`'s finding, kept. `EmployersStep` is the
     only surface carrying the flat project list and the placement UI, so Solo
     Projects opens the SAME editor Work History does. ⚠ Two slugs because the
     profile has two cards and each must return to its own. */
  {
    slug: "title",
    title: "Title",
    /* ⚠ `E595` WS-B COLLAPSED THE COLUMN, NOT THE CONTRACT: the wire key is
       still `headline`; the server writes `Person.title`. */
    step: "title",
    payload: (d) => ({ headline: d.headline }),
  },
  {
    slug: "role",
    title: "Role",
    /* ⚠⚠ THE WIZARD POSTS `roles` AND THE SERVER MAPS IT TO `category`
       (`onboarding.ts:3004`). Posting `category` directly would work and is
       deliberately NOT done — the wizard's own step name is the contract, and
       two spellings for one save is how they drift. */
    step: "roles",
    payload: (d) => ({ roleTypeIds: d.roleTypeIds, roleTypeId: d.roleTypeId }),
  },
  {
    slug: "photo",
    title: "Photo",
    /* ⚠⚠⚠ THE UPLOAD IS ITS OWN OWNER-SCOPED ENDPOINT (`POST /api/profile/photo`,
       brief_O) and `PhotoUpload` calls it directly; this step only PERSISTS the
       resulting URL onto the profile. ⚠ That is not a second save path — it is
       the same two-step shape the wizard uses. */
    step: "photo",
    payload: (d) => ({ photoUrl: d.photoUrl }),
  },
  {
    slug: "contact",
    title: "Contact Details",
    /* ⚠⚠ IT SERVES TWO SCORE LINES — `identity` (address + phone) and
       `location` (the address's city/state/country). One address, one editor,
       one save. */
    step: "finish",
    payload: (d) => ({ address: d.address, phone: d.phone }),
  },
  {
    slug: "languages",
    title: "Languages",
    step: "languages",
    payload: (d) => ({ languages: d.languages }),
  },
  {
    slug: "work-method",
    title: "How You Work",
    step: "work_method",
    payload: (d) => ({ workMethod: d.workMethod }),
  },
  { slug: "work-history", title: "Work History", step: null, payload: null },
  { slug: "solo-projects", title: "Solo Projects", step: null, payload: null },
];

export function sectionFor(slug: string): SectionSpec | null {
  return PROFILE_SECTIONS.find((s) => s.slug === slug) ?? null;
}

/** ⚠ The profile's Edit link for a section — one spelling, used by every card. */
export function editHref(slug: SectionSlug): string {
  return `/profile/edit/${slug}`;
}
