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
  | "solo-projects";

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
  step: Step | "certifications" | null;
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
