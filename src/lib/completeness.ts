/**
 * Provider profile completeness (brief_K) — the SINGLE source of the stored
 * `completeness` value (0–100), recomputed on every profile save. Marketplace
 * visibility is gated on this, not on admin approval.
 *
 * Pure (no prisma import) so it can be reused from the onboarding/settings save
 * paths AND from the seed.
 *
 * ---------------------------------------------------------------------------
 * REBALANCED IN brief_R. The rule now is: **every weight must correspond to
 * something the 13-step wizard or the finish page actually collects**, and the
 * thresholds must match what those steps themselves accept. The old table
 * failed that on four counts, each of which silently capped a finished profile:
 *
 *   1. `region` (5) — no step collects it.
 *   2. `work_types` (5) — no step collects it (the wizard collects
 *      `work_method`, a different field).
 *   3. `workExperience` (15) — only ever populated by a résumé import. A
 *      provider who chose "Fill Out Manually" could reach at most 75 and was
 *      therefore PERMANENTLY INVISIBLE, below the threshold of 80.
 *   4. `overview >= 120` chars and `skills >= 3`, while the bio step accepts
 *      100 chars and the skills step accepts 1 — so a provider could satisfy a
 *      step and still score nothing for it.
 *
 * Weights deliberately sum to 105 and are capped at 100: completing every
 * required step plus a photo reaches 100 on its own, and the optional
 * enrichments (work history, education, certifications, specializations) can
 * cover for a missing photo instead of being worthless.
 * ---------------------------------------------------------------------------
 */

/** Completeness at/above which a provider becomes marketplace-visible. */
export const VISIBILITY_THRESHOLD = 80;

/** Minimum bio length — must match `MIN_BIO_CHARS` in onboarding.ts (E017). */
const BIO_MIN_CHARS = 100;

/** Structural input — any object (a prisma-loaded profile) with these props. */
export type CompletenessInput = {
  headline: string | null;
  overview: string | null;
  experience_level: string | null;
  goal: string | null;
  work_method: string | null;
  /** The chosen field is the (Role, Domain) pair (brief_R). */
  pillar_id: string | null;
  role_type_id: string | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  /** The single hourly rate collected by the wizard (brief_P / E018). */
  hourly_rate_cents?: number | null;
  skills: unknown[];
  languages: unknown[];
  /**
   * Optional enrichments — any ONE of these satisfies the enrichment weight.
   * `employers` replaced the retired flat WorkExperience (brief_U / E042); if
   * this had kept reading the old table the weight would have become
   * unreachable, which is precisely the invisible-profile bug brief_R fixed.
   */
  employers: unknown[];
  education: unknown[];
  certifications: unknown[];
  specializations: unknown[];
  /** Person.photo_url (lives on the Person, not the profile). */
  photoUrl: string | null;
  /** Finish-page identity block (E019). */
  date_of_birth: Date | string | null;
  hasAddress: boolean;
  /** A phone number is on file. */
  hasPhone: boolean;
  /** Phone passed SMS verification. STUBBED by brief_S/E036 — see below. */
  phoneVerified: boolean;
};

export const COMPLETENESS_WEIGHTS = {
  // --- Collected by a REQUIRED wizard step ---------------------------------
  experienceLevel: 5, //  step 1
  goal: 5, //             step 2
  workMethod: 5, //       step 3
  headline: 10, //        step 4
  field: 10, //           step 6  (Role + Domain)
  skills: 15, //          step 7  (≥ 1, matching the step's own rule)
  languages: 5, //        step 10 (≥ 1)
  overview: 15, //        step 11 (≥ BIO_MIN_CHARS)
  rate: 10, //            step 12
  // --- Collected on the finish page (step 13) ------------------------------
  photo: 10,
  identity: 10, //        DOB + address + phone (verification stubbed, E036)
  // --- Optional enrichment — any one of four ------------------------------
  enrichment: 5,
} as const;

/** Compute a provider's completeness score (0–100). */
export function computeProviderCompleteness(p: CompletenessInput): number {
  let score = 0;
  const W = COMPLETENESS_WEIGHTS;

  if (p.headline && p.headline.trim() !== "") score += W.headline;
  if (p.overview && p.overview.trim().length >= BIO_MIN_CHARS) score += W.overview;
  if (p.experience_level) score += W.experienceLevel;
  if (p.goal) score += W.goal;
  if (p.work_method) score += W.workMethod;
  // The field is the PAIR — half of it isn't a usable answer.
  if (p.pillar_id && p.role_type_id) score += W.field;
  if (p.skills.length >= 1) score += W.skills;
  if (p.languages.length >= 1) score += W.languages;

  // Any rate counts. The wizard writes `hourly_rate_cents`; the onsite/remote
  // pair predates it and is still editable in Settings.
  if (
    p.hourly_rate_cents != null ||
    p.onsite_rate_cents != null ||
    p.remote_rate_cents != null
  ) {
    score += W.rate;
  }

  if (p.photoUrl) score += W.photo;

  // The finish page's identity block scores as a unit: a DOB with no phone
  // isn't a partially-trustworthy provider, it's an unfinished one.
  //
  // brief_S/E036 STUBBED phone verification, so `phoneVerified` can never be
  // true through the wizard. Requiring it here would silently cap every
  // finished provider at 95% and quietly break brief_R's guarantee that a
  // completed journey reaches 100% — the same class of bug brief_R fixed.
  // While the stub stands, a phone ON FILE satisfies this; restore
  // `p.phoneVerified` alongside the publish-gate line when SMS is switched on.
  if (p.date_of_birth && p.hasAddress && p.hasPhone) score += W.identity;

  if (
    p.employers.length >= 1 ||
    p.education.length >= 1 ||
    p.certifications.length >= 1 ||
    p.specializations.length >= 1
  ) {
    score += W.enrichment;
  }

  return Math.min(100, score);
}

/** True when a provider is marketplace-visible (brief_K predicate inputs). */
export function meetsCompletenessThreshold(completeness: number): boolean {
  return completeness >= VISIBILITY_THRESHOLD;
}
