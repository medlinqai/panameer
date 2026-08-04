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
  work_method: string | null;
  /** The chosen field is the (Role, Domain) pair (brief_R). */
  pillar_id: string | null;
  role_type_id: string | null;
  onsite_rate_cents: number | null;
  remote_rate_cents: number | null;
  /** The single hourly rate collected by the wizard (brief_P / E018). */
  hourly_rate_cents?: number | null;
  /** The advertised RANGE (WS0 / E078c) — either end counts as "answered". */
  rate_min_cents?: number | null;
  rate_max_cents?: number | null;
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
  /**
   * An APPROVED company membership (brief_company_model). Part of the required
   * set: a work order is between COMPANIES, so a provider without one cannot be
   * contracted, which makes showing them to buyers a promise we can't keep.
   */
  hasCompany: boolean;
  /**
   * ⚠ NO LONGER SCORED (WS7). Kept on the type — and nullable in the schema —
   * because the column still exists and old rows still carry a value; nothing
   * reads it for the meter or the gate any more.
   */
  date_of_birth?: Date | string | null;
  hasAddress: boolean;
  /** A phone number is on file. */
  hasPhone: boolean;
  /** Phone passed SMS verification. STUBBED by brief_S/E036 — see below. */
  phoneVerified: boolean;
};

/**
 * REBALANCED IN PJv2 WS7. `experienceLevel` (5) and `goal` (5) are gone — the
 * first is now derived from work-history spans (E068), the second was never used
 * for anything (E067). Removing 10 points would have left the table summing to
 * 95, i.e. a PERFECT profile permanently stuck at 95% and five points below its
 * own 100. Their weight is redistributed onto the fields that actually describe
 * a provider, and the table now sums to 110.
 *
 * The headroom is deliberate and load-bearing. Three invariants:
 *
 *   1. a fully-completed profile reaches 100                        (110 → cap)
 *   2. NO LANGUAGE must not cap anyone under 100                    (105 → cap)
 *   3. no photo must not cap anyone under 100                       (100 → cap)
 *
 * (2) is the one WS7 was asked to fix: the hero renders Language conditionally,
 * so a provider who never sets one must still be able to reach 100. (3) is an
 * improvement — under the old table a photo-less profile maxed out at 95.
 * Missing BOTH still caps at 95, which is the honest floor: at that point two
 * described things really are absent.
 */
export const COMPLETENESS_WEIGHTS = {
  // --- THE REQUIRED SET — every one of these is a prompted step ------------
  headline: 12, //   1  Title
  field: 12, //      2  Role(s)
  skills: 16, //     3  Skills   (>= 1, the step's own rule)
  rate: 12, //       4  Rate
  photo: 10, //      5  Photo
  company: 10, //    6  Company  (an APPROVED membership)
  identity: 12, //      address + phone — collected on the photo step
  // Required subtotal: 84. Above the 80 threshold with four points of margin,
  // and deliberately NOT 100 — a provider who did the minimum is Visible, not
  // Complete, and the meter has to have somewhere left to go.

  // --- ENRICHMENT — no longer prompted, still worth points ----------------
  overview: 8, //    a bio (>= BIO_MIN_CHARS)
  languages: 4,
  enrichment: 6, //  any one of work history / education / certs / specs
  workMethod: 4, //  set by the up-front provider-vs-recruiter fork
  // Total 106, capped at 100: a full profile reaches 100 with headroom, so no
  // single optional section can hold anyone under it.
} as const;

/**
 * THE REQUIRED SET, as a predicate.
 *
 * This — not the percentage — is what the marketplace gate reads now
 * (brief_onboarding_slimdown, decision 1). The 80% number was the visibility
 * driver for as long as the wizard asked eleven questions; with six, a
 * threshold is an indirect way of saying something the product can now say
 * directly. Keeping the score as the gate is how "I answered everything and
 * I'm still invisible" happens, because the arithmetic is invisible.
 *
 * Bio, Education, Specializations, Languages and DOB are deliberately absent.
 */
export type RequiredSetInput = Pick<
  CompletenessInput,
  "headline" | "role_type_id" | "skills" | "photoUrl" | "hasAddress" | "hasPhone"
> & {
  hourly_rate_cents?: number | null;
  rate_min_cents?: number | null;
  rate_max_cents?: number | null;
  onsite_rate_cents?: number | null;
  remote_rate_cents?: number | null;
  /** An APPROVED company membership exists (brief_company_model). */
  hasCompany: boolean;
};

/** Which required items are still missing. Empty means publishable + Visible. */
export function missingRequired(p: RequiredSetInput): string[] {
  const missing: string[] = [];
  if (!p.headline?.trim()) missing.push("a title");
  if (!p.role_type_id) missing.push("a role");
  if (p.skills.length < 1) missing.push("at least one skill");
  if (!hasAnyRate(p)) missing.push("your rate");
  if (!p.photoUrl) missing.push("a photo");
  if (!p.hasCompany) missing.push("your company");
  if (!p.hasAddress) missing.push("your address");
  if (!p.hasPhone) missing.push("your phone number");
  return missing;
}

export function meetsRequiredSet(p: RequiredSetInput): boolean {
  return missingRequired(p).length === 0;
}

/** Any rate at all. The wizard writes a range; Settings still writes the pair. */
function hasAnyRate(p: {
  hourly_rate_cents?: number | null;
  rate_min_cents?: number | null;
  rate_max_cents?: number | null;
  onsite_rate_cents?: number | null;
  remote_rate_cents?: number | null;
}): boolean {
  return (
    p.rate_min_cents != null ||
    p.rate_max_cents != null ||
    p.hourly_rate_cents != null ||
    p.onsite_rate_cents != null ||
    p.remote_rate_cents != null
  );
}

/** Compute a provider's completeness score (0–100). */
export function computeProviderCompleteness(p: CompletenessInput): number {
  let score = 0;
  const W = COMPLETENESS_WEIGHTS;

  if (p.headline && p.headline.trim() !== "") score += W.headline;
  // The ROLE is the answer now. `pillar_id` (the domain) is derived server-side
  // from it and is no longer asked, so requiring the pair here would score zero
  // for a step the provider completed — the invisible-profile bug, again.
  if (p.role_type_id) score += W.field;
  if (p.skills.length >= 1) score += W.skills;
  if (hasAnyRate(p)) score += W.rate;
  if (p.photoUrl) score += W.photo;
  if (p.hasCompany) score += W.company;

  /*
    IDENTITY IS ADDRESS + PHONE. Date of birth left the wizard entirely (WS7),
    so scoring it here would cap every provider who walked the new flow at 88
    and — under the old gate — hold them below 80 outright. If age or legal
    capacity is ever needed it rides the tax/payout gate, never the profile.
  */
  if (p.hasAddress && p.hasPhone) score += W.identity;

  if (p.work_method) score += W.workMethod;
  if (p.overview && p.overview.trim().length >= BIO_MIN_CHARS) score += W.overview;
  if (p.languages.length >= 1) score += W.languages;
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
