/**
 * Provider profile completeness (brief_K) — the SINGLE source of the stored
 * `completeness` value (0–100), recomputed on every profile save. Visibility is
 * gated on this, not on admin approval.
 *
 * Pure (no prisma import) so it can be reused from the onboarding/settings save
 * paths AND from the seed. Weights are the brief_K table.
 */

/** Completeness at/above which a provider becomes marketplace-visible. */
export const VISIBILITY_THRESHOLD = 80;

/** Structural input — any object (a prisma-loaded profile) with these props. */
export type CompletenessInput = {
  headline: string | null;
  overview: string | null;
  experience_level: string | null;
  region_id: string | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  work_types: unknown[];
  skills: unknown[];
  workExperiences: unknown[];
  education: unknown[];
  languages: unknown[];
  certifications: unknown[];
  /** Person.photo_url (lives on the Person, not the profile). */
  photoUrl: string | null;
};

export const COMPLETENESS_WEIGHTS = {
  headline: 10,
  overview: 15, // ≥ 120 chars
  experienceLevel: 5,
  skills: 15, // primary role type + ≥ 3 skills
  region: 5,
  rate: 10, // onsite or remote
  workTypes: 5, // ≥ 1
  workExperience: 15, // ≥ 1
  photo: 10,
  credential: 10, // any education / language / certification
} as const;

/** Compute a provider's completeness score (0–100) from the brief_K weights. */
export function computeProviderCompleteness(p: CompletenessInput): number {
  let score = 0;
  const W = COMPLETENESS_WEIGHTS;

  if (p.headline && p.headline.trim() !== "") score += W.headline;
  if (p.overview && p.overview.trim().length >= 120) score += W.overview;
  if (p.experience_level) score += W.experienceLevel;
  // "primary role type + ≥ 3 skills" — one-main-category is enforced on write,
  // so ≥ 3 skills implies a primary role type.
  if (p.skills.length >= 3) score += W.skills;
  if (p.region_id) score += W.region;
  if (p.onsite_rate_cents != null || p.remote_rate_cents != null) score += W.rate;
  if (p.work_types.length >= 1) score += W.workTypes;
  if (p.workExperiences.length >= 1) score += W.workExperience;
  if (p.photoUrl) score += W.photo;
  if (
    p.education.length >= 1 ||
    p.languages.length >= 1 ||
    p.certifications.length >= 1
  ) {
    score += W.credential;
  }

  return Math.min(100, score);
}

/** True when a provider is marketplace-visible (brief_K predicate inputs). */
export function meetsCompletenessThreshold(completeness: number): boolean {
  return completeness >= VISIBILITY_THRESHOLD;
}
