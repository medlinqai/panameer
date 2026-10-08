import type { ProviderDraft, Step } from "@/lib/onboarding-draft";

export type SectionSlug =
  | "bio"
  | "rates"
  | "skills"
  | "specializations"
  | "keywords"
  | "certifications"
  | "education"
  | "work-history"
  | "solo-projects"
  | "title"
  | "role"
  | "photo"
  | "contact"
  | "languages"
  | "work-method";

export type SectionSpec = {
  slug: SectionSlug;
  title: string;
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
    payload: (d) => ({
      hourlyDollars: d.hourlyRateCents != null ? d.hourlyRateCents / 100 : "",
      onsiteDollars: d.onsiteRateCents != null ? d.onsiteRateCents / 100 : "",
      remoteDollars: d.remoteRateCents != null ? d.remoteRateCents / 100 : "",
    }),
  },
  {
    slug: "skills",
    title: "Skills",
    step: "skills",
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
  { slug: "keywords", title: "Keywords", step: null, payload: null },
  {
    slug: "certifications",
    title: "Credentials",
    step: "certifications",
    payload: (d) => ({ certifications: d.certifications }),
  },
  {
    slug: "education",
    title: "Education",
    step: "education",
    payload: (d) => ({ education: d.education }),
  },
  {
    slug: "title",
    title: "Title",
    step: "title",
    payload: (d) => ({ headline: d.headline }),
  },
  {
    slug: "role",
    title: "Role",
    step: "roles",
    payload: (d) => ({ roleTypeIds: d.roleTypeIds, roleTypeId: d.roleTypeId }),
  },
  {
    slug: "photo",
    title: "Photo",
    step: "photo",
    payload: (d) => ({ photoUrl: d.photoUrl }),
  },
  {
    slug: "contact",
    title: "Contact Details",
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

export function editHref(slug: SectionSlug): string {
  return `/profile/edit/${slug}`;
}
