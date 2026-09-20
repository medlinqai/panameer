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
/*
  ── ⚠⚠⚠ THIS IS NO LONGER A GATE (`P2-J3-E590` WS-A0). READ THIS BEFORE USING IT.

  ⚠⚠ **MARKETPLACE VISIBILITY DOES NOT READ THIS NUMBER.** It reads
  `providerMeetsRequired` through `isMarketplaceVisible`, whose `meetsRequired`
  argument is REQUIRED — there is no percentage fallback any more, and
  `onboarding.ts` no longer hand-rolls one either.

  ⚠ WHAT STILL READS IT, AND ALL OF IT IS REPORTING OR COPY:
    · `admin.ts` — the funnel counts (`live`, `registered`, `eightyComplete`).
      ⚠⚠ THOSE ARE ADMIN STATISTICS, NOT A GATE, and `eightyComplete` is a
      funnel STAGE NAMED AFTER THIS NUMBER. Reported at the WS-A0 gate, not
      changed — they are Scott's board.
    · `visibilityThreshold:` exposed to three surfaces, and the copy on
      `/stats`. Both describe the number; neither decides anything.

  ⚠⚠ **DO NOT REINTRODUCE `completeness >= VISIBILITY_THRESHOLD` AS A
  CONDITION.** `E590` re-weights the score so that answering every line reaches
  100; any surface gating on the figure would move underneath that change, which
  is the bug this workstream exists to make impossible.
*/
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
  /*
    ⚠⚠ `hasCompany` IS GONE (`P1-A1.4-E418`, 2026-09-11).

    ⚠ SUPERSEDED, quoted not deleted: *"An APPROVED company membership
    (brief_company_model). Part of the required set: a work order is between
    COMPANIES, so a provider without one cannot be contracted, which makes
    showing them to buyers a promise we can't keep."*

    A provider is never asked for a company, so the weight was unreachable and
    the requirement unsatisfiable — every new provider would have been held
    below the bar by a question the wizard does not ask. The company is captured
    once, at work order acceptance (`lib/orders.ts`), which is the moment the
    superseded sentence was really describing.
  */
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
/*
  ── ⚠⚠ REBALANCED AGAIN IN `P1-A1.4-E418` (2026-09-11) ──────────────────────

  ⚠ SUPERSEDED, quoted not deleted: `company: 10, //    6  Company  (an APPROVED
  membership)`, with the others at `headline: 12 · field: 12 · skills: 16 ·
  rate: 12 · identity: 12`.

  The company weight was removed with the company step, and REMOVING TEN POINTS
  WITHOUT REDISTRIBUTING THEM WOULD HAVE CAPPED A PERFECT PROFILE AT 96 — the
  precise trap the PJv2 WS7 note below records, where the table summed to 95 and
  a flawless provider sat five points under its own 100. So the ten points go
  back onto the fields that survive, and the table still sums to 106.

  ⚠ MEASURED, not assumed — the three invariants below, before and after:
      full profile        106 → capped 100   (unchanged)
      NO LANGUAGE         102 → capped 100   (unchanged)
      no photo             96                (unchanged — see the ⚠ below)
      neither              92                (unchanged)

  ⚠⚠ THE DOCBLOCK'S INVARIANT (3) IS STALE AND `E418` DID NOT SILENTLY "FIX" IT.
  It claims a photo-less profile reaches 100. It reaches 96 and did so before
  this change too — the `110 → cap` arithmetic it quotes belongs to a table that
  no longer exists (the numbers sum to 106, as line 124 itself says). `E418`
  deliberately holds that number EXACTLY where it found it rather than changing
  behaviour nobody asked to change. ⚠ REPORTED, not resolved by choosing.
*/
export const COMPLETENESS_WEIGHTS = {
  // --- THE REQUIRED SET — every one of these is a prompted step ------------
  headline: 14, //   1  Title
  field: 14, //      2  Role(s)
  skills: 18, //     3  Skills   (>= 1, the step's own rule)
  rate: 14, //       4  Rate
  photo: 10, //      5  Photo    (⚠ HELD AT 10 — see the invariants above)
  identity: 14, //      address + phone — collected on the photo step
  // Required subtotal: 84, unchanged. Above the 80 threshold with four points of
  // margin, and deliberately NOT 100 — a provider who did the minimum is
  // Visible, not Complete, and the meter has to have somewhere left to go.

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
  /* ⚠ `hasCompany: boolean` REMOVED (`E418`) — see `CompletenessInput` above.
     Removing it from the TYPE is the point: a caller that still computed one
     would otherwise pass it silently into a set that ignores it. */
};

/** Which required items are still missing. Empty means publishable + Visible. */
export function missingRequired(p: RequiredSetInput): string[] {
  const missing: string[] = [];
  if (!p.headline?.trim()) missing.push("a title");
  if (!p.role_type_id) missing.push("a role");
  if (p.skills.length < 1) missing.push("at least one skill");
  if (!hasAnyRate(p)) missing.push("your rate");
  if (!p.photoUrl) missing.push("a photo");
  /* ⚠ SUPERSEDED, quoted not deleted (`E418`):
       `if (!p.hasCompany) missing.push("your company");`
     ⚠ THE STRING MATTERED: `identity-bar.ts` maps "your company" to the
     `approvedCompany` gate field, so this line was the provider half of the
     same requirement the work-request bar carried on the buyer half. Both went
     in one change — a gate is not removed until every layer of it is. */
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
  /* ⚠ `if (p.hasCompany) score += W.company;` — removed with the weight (`E418`). */

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

// ── ⚠⚠ `meetsCompletenessThreshold` IS REMOVED (`P2-J3-E590` WS-A0) ────────
//
// ⚠ SUPERSEDED, quoted not deleted (`E164`). ⚠⚠ QUOTED WITH LINE COMMENTS AND
// ITS DOC COMMENT PARAPHRASED, per rule 12 — the original carried a `*/` that
// closes an enclosing block comment early. That trap bit here on first write.
//
//   [doc comment, paraphrased: it claimed the function returned whether a
//    provider was marketplace-visible, citing the brief_K predicate inputs]
//   export function meetsCompletenessThreshold(completeness: number): boolean {
//     return completeness >= VISIBILITY_THRESHOLD;
//   }
//
// ⚠⚠ IT HAD ZERO CALLERS AND ITS DOC COMMENT WAS FALSE — it said "marketplace
// visible", which has not been true since `meetsRequired` arrived. ⚠ A dead
// function that states a rule is worse than no function: the next reader takes
// the sentence as the rule, which is precisely how `E585` survived this long.

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠ WHAT'S MISSING — UNSCORED, AND DELIBERATELY SO (`P1-A1.4-E399` WS-5b)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ THE METER SAID **98%** FOR A PROFILE MISSING FOUR EMPLOYERS AND ALL FIVE
 * CERTIFICATIONS. It was arithmetically right and semantically wrong.
 *
 * `enrichment: 6` is satisfied by **ANY ONE** of work history / education /
 * certifications / specializations — so one employer scores exactly what five
 * score, and zero certifications costs nothing because education already
 * satisfied it. Employer COUNT is unscored. Solo projects are unscored entirely.
 *
 * ── ⚠⚠ AND THE WEIGHTS ARE NOT BEING CHANGED ────────────────────────────────
 *
 * `VISIBILITY_THRESHOLD = 80` GATES MARKETPLACE VISIBILITY FOR ALL 91 PROVIDERS.
 * Re-weighting to make the number "honest" would silently change **who is
 * findable** — providers who are live today would drop out of search because a
 * definition moved under them, with no notice and no action of their own.
 * ⚠ SO THE SCORE AND THE GATE ARE UNTOUCHED, and this is a SEPARATE, UNSCORED
 * list that answers a different question: not *"are you allowed to be visible"*
 * but *"is this everything you meant to say?"*
 *
 * ⚠ IT RETURNS PROMPTS, NOT FAULTS. A provider with one employer may genuinely
 * have one employer; the list observes, it does not accuse, and nothing gates on
 * it.
 */
export type EnrichmentGapInput = {
  employers: number;
  projects: number;
  certifications: number;
  education: number;
  specializations: number;
};

export function profileEnrichmentGaps(p: EnrichmentGapInput): string[] {
  const out: string[] = [];
  /* ⚠ ONE employer is the signal `E399` was chasing — a 30-year career that
     imported as a single job. Zero is a different message and gets its own. */
  if (p.employers === 0) out.push("No work history yet");
  else if (p.employers === 1) out.push("Only one employer — most careers have more");
  if (p.certifications === 0) out.push("No certifications");
  if (p.projects === 0) out.push("No projects");
  if (p.education === 0) out.push("No education");
  if (p.specializations === 0) out.push("No specializations");
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE CHECKLIST (`P1-A1.5-E489`) — A READING OF THE SCORE, NOT A SECOND SCORE
   ═══════════════════════════════════════════════════════════════════════════

   > **Scott:** *"is it possible to show a percentage complete for each profile —
   > we have 10 objects that can be completed, you have content in 7 of those…
   > your profile is estimated to be at 70%"*

   ⚠⚠ A SECOND PERCENTAGE WOULD CONTRADICT THE FIRST, AND THAT IS `E462` AGAIN.
   `computeProviderCompleteness` is WEIGHTED, not counted: `skills` is 18 points
   and `overview` is 8, so a required-only profile scores 88 while "7 of 10"
   would read 70. Both numbers on one screen, disagreeing, is the Domains tile
   saying 24 beside a tree saying 29.

   ⚠ SO THERE IS NO NEW NUMBER HERE. The existing `completeness` stays the
   number and stays the gate; this adds the BREAKDOWN underneath it, which is
   what Scott actually wanted — not a second score but *which sections are
   empty*, and a list cannot contradict anything.

   ⚠⚠ EVERY PREDICATE BELOW MIRRORS `computeProviderCompleteness` LINE FOR LINE
   AND THE WEIGHTS ARE READ FROM `COMPLETENESS_WEIGHTS`, never retyped. If the
   two ever disagree the checklist is lying about the number beside it.
   ⚠ NOTHING IN THIS BLOCK MUTATES THE SCORER, THE WEIGHTS OR THE THRESHOLD —
   91 providers are gated on that number.
*/

export type ChecklistRow = {
  key: string;
  label: string;
  done: boolean;
  /** ⚠ Its own weight, so a missing row can say which action pays most. */
  points: number;
  /** Filled rows carry a count where they have one — `Employers (4)`. */
  count?: number;
  /** What to do about it, when it is missing. */
  hint?: string;
};

/**
 * The checklist, in the order a provider should act on it.
 *
 * ⚠ SORTED BY POINTS DESCENDING AMONG THE MISSING at the call site, because
 * "which action pays most" is the one thing a percentage can never tell them.
 */
export function completenessChecklist(p: CompletenessInput): ChecklistRow[] {
  const W = COMPLETENESS_WEIGHTS;
  const rows: ChecklistRow[] = [
    {
      key: "headline",
      label: "Headline",
      done: !!(p.headline && p.headline.trim() !== ""),
      points: W.headline,
      hint: "Add a title — the one line buyers scan first.",
    },
    {
      key: "field",
      label: "Role & domain",
      done: !!p.role_type_id,
      points: W.field,
      hint: "Pick your role.",
    },
    {
      key: "skills",
      label: "Skills",
      done: p.skills.length >= 1,
      points: W.skills,
      count: p.skills.length,
      hint: "Add at least one skill.",
    },
    { key: "rate", label: "Rate", done: hasAnyRate(p), points: W.rate, hint: "Add a rate range." },
    { key: "photo", label: "Photo", done: !!p.photoUrl, points: W.photo, hint: "Add a photo." },
    {
      /* ⚠ ONE ROW, because the scorer awards ONE weight for address + phone
         together. Two rows would imply two separately-scored things. */
      key: "identity",
      label: "Contact details",
      done: !!(p.hasAddress && p.hasPhone),
      points: W.identity,
      hint: "Add your address and phone number.",
    },
    {
      key: "workMethod",
      label: "How you work",
      done: !!p.work_method,
      points: W.workMethod,
      hint: "Say whether you deliver the work yourself.",
    },
    {
      key: "overview",
      label: "Bio",
      done: !!(p.overview && p.overview.trim().length >= BIO_MIN_CHARS),
      points: W.overview,
      hint: `Write at least ${BIO_MIN_CHARS} characters.`,
    },
    {
      key: "languages",
      label: "Languages",
      done: p.languages.length >= 1,
      points: W.languages,
      count: p.languages.length,
      hint: "Add one language.",
    },
    {
      /*
        ── ⚠⚠ ONE WEIGHT, ONE ROW, ANY OF FOUR THINGS ─────────────────────────

        The scorer awards `enrichment` once if the provider has ANY of work
        history, education, certifications or specializations.
        ⚠ RENDERING IT AS FOUR ROWS WOULD BE A LIE — it would imply four
        requirements worth four weights, when it is one weight satisfied by any
        one of them. The count below is the TOTAL across all four, so a provider
        with four employers and nothing else still reads as satisfied.
      */
      key: "enrichment",
      label: "Experience",
      done:
        p.employers.length >= 1 ||
        p.education.length >= 1 ||
        p.certifications.length >= 1 ||
        p.specializations.length >= 1,
      points: W.enrichment,
      count:
        p.employers.length +
        p.education.length +
        p.certifications.length +
        p.specializations.length,
      hint: "Add a job, a qualification, a certification or a specialization — any one counts.",
    },
  ];
  return rows;
}
