
/** Completeness at/above which a provider becomes marketplace-visible. */
export const VISIBILITY_THRESHOLD = 80;

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
  hourly_rate_cents?: number | null;
  /** The advertised RANGE (WS0 / E078c) — either end counts as "answered". */
  rate_min_cents?: number | null;
  rate_max_cents?: number | null;
  skills: unknown[];
  languages: unknown[];
  employers: unknown[];
  education: unknown[];
  certifications: unknown[];
  specializations: unknown[];
  /** Person.photo_url (lives on the Person, not the profile). */
  photoUrl: string | null;
  date_of_birth?: Date | string | null;
  hasAddress: boolean;
  /** A phone number is on file. */
  hasPhone: boolean;
  phoneVerified: boolean;

  hasLocation?: boolean;
  /** Projects with no employer — the profile's `Solo Projects` card. */
  soloProjects?: unknown[];
  hasExperienceYears?: boolean;

  declaredNoWorkHistoryAt?: Date | null;
  declaredNoEducationAt?: Date | null;
  declaredNoSpecializationsAt?: Date | null;
  declaredNoCertificationsAt?: Date | null;
  declaredNoSoloProjectsAt?: Date | null;
};

// should eb able to go down that list and get to 100%."*
export const COMPLETENESS_WEIGHTS = {
  // ── SO BUYERS CAN FIND YOU — 50 ──────────────────────────────────────────
  // opt-out here would let a provider declare their way to invisible.
  headline: 8, //   Title
  field: 8, //      Field
  skills: 10, //    Skills
  rate: 8, //       Hourly Rate
  photo: 8, //      Photo
  identity: 8, //   Identity Verified — address + phone

  // ── WHO YOU ARE — 24 ─────────────────────────────────────────────────────
  overview: 8, //       Bio (>= BIO_MIN_CHARS)
  location: 4, //       Location — a city/state/country to show
  languages: 4, //      Languages
  experienceYears: 3, // Years of Experience — a dated job or project
  workMethod: 5, //     How You Work

  // ── WHAT YOU'VE DONE — 26 ────────────────────────────────────────────────
  // still scores — that is the whole feature.
  workHistory: 8,
  education: 5,
  specializations: 4,
  certifications: 6,
  soloProjects: 3,
} as const;

export const COMPLETENESS_TOTAL = Object.values(COMPLETENESS_WEIGHTS).reduce(
  (a, b) => a + b,
  0
);
if (COMPLETENESS_TOTAL !== 100) {
  throw new Error(
    `COMPLETENESS_WEIGHTS must sum to 100, got ${COMPLETENESS_TOTAL}`
  );
}

/** THE REQUIRED SET, as a predicate. */
export type RequiredSetInput = Pick<
  CompletenessInput,
  "headline" | "role_type_id" | "skills" | "photoUrl" | "hasAddress" | "hasPhone"
> & {
  hourly_rate_cents?: number | null;
  rate_min_cents?: number | null;
  rate_max_cents?: number | null;
  onsite_rate_cents?: number | null;
  remote_rate_cents?: number | null;
  // Removing it from the TYPE is the point: a caller that still computed one
};

/** Which required items are still missing. Empty means publishable + Visible. */
export function missingRequired(p: RequiredSetInput): string[] {
  const missing: string[] = [];
  if (!p.headline?.trim()) missing.push("a title");
  if (!p.role_type_id) missing.push("a role");
  if (p.skills.length < 1) missing.push("at least one skill");
  if (!hasAnyRate(p)) missing.push("your rate");
  if (!p.photoUrl) missing.push("a photo");
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
// ONE FUNCTION COMPUTES THE TOTAL AND THE BREAKDOWN

/** `filled` beats `declared_none`. Rows existing is the stronger fact. */
export type ScoreLineState = "filled" | "declared_none" | "unanswered";

/** The three groups, in the order they render. */
export type ScoreGroup = "find" | "who" | "done";

export const SCORE_GROUP_LABELS: Record<ScoreGroup, string> = {
  find: "So Buyers Can Find You",
  who: "Who You Are",
  done: "What You've Done",
};

export type ScoreLine = {
  key: keyof typeof COMPLETENESS_WEIGHTS;
  label: string;
  points: number;
  state: ScoreLineState;
  group: ScoreGroup;
  /** Can this line be answered with "I have none"? */
  declarable: boolean;
};

export type ProfileScore = {
  /** 0–100. The sum of the points on every line that is not `unanswered`. */
  total: number;
  lines: ScoreLine[];
};

/** A LINE COUNTS WHEN IT IS ANSWERED, NOT WHEN IT IS FULL. That is the whole */
export function lineCounts(state: ScoreLineState): boolean {
  return state !== "unanswered";
}

/** `filled` wins over a declaration — see the schema comment. */
function state(filled: boolean, declaredAt?: Date | null): ScoreLineState {
  if (filled) return "filled";
  if (declaredAt != null) return "declared_none";
  return "unanswered";
}

export function computeProfileScore(p: CompletenessInput): ProfileScore {
  const W = COMPLETENESS_WEIGHTS;
  const has = (x: unknown[] | undefined) => (x?.length ?? 0) >= 1;

  const lines: ScoreLine[] = [
    // ── SO BUYERS CAN FIND YOU — the required set. No "I have none". ───────
    L("headline", "Title", W.headline, "find", state(!!p.headline?.trim())),
    // THE ROLE IS THE ANSWER. `pillar_id` is derived server-side and is no
    L("field", "Field", W.field, "find", state(!!p.role_type_id)),
    L("skills", "Skills", W.skills, "find", state(has(p.skills))),
    L("rate", "Rates", W.rate, "find", state(hasAnyRate(p))),
    L("photo", "Photo", W.photo, "find", state(!!p.photoUrl)),
    // IDENTITY IS ADDRESS + PHONE (`WS7`). Date of birth left the wizard
    L("identity", "Identity Verified", W.identity, "find",
      state(!!p.hasAddress && !!p.hasPhone)),

    // ── WHO YOU ARE ───────────────────────────────────────────────────────
    L("overview", "Bio", W.overview, "who",
      state((p.overview?.trim().length ?? 0) >= BIO_MIN_CHARS)),
    L("location", "Location", W.location, "who", state(!!p.hasLocation)),
    L("languages", "Languages", W.languages, "who", state(has(p.languages))),
    L("experienceYears", "Years of Experience", W.experienceYears, "who",
      state(!!p.hasExperienceYears)),
    L("workMethod", "How You Work", W.workMethod, "who", state(!!p.work_method)),

    // ── WHAT YOU'VE DONE — every line declarable ──────────────────────────
    L("workHistory", "Work History", W.workHistory, "done",
      state(has(p.employers), p.declaredNoWorkHistoryAt), true),
    L("education", "Education", W.education, "done",
      state(has(p.education), p.declaredNoEducationAt), true),
    L("specializations", "Specializations", W.specializations, "done",
      state(has(p.specializations), p.declaredNoSpecializationsAt), true),
    L("certifications", "Certifications", W.certifications, "done",
      state(has(p.certifications), p.declaredNoCertificationsAt), true),
    L("soloProjects", "Solo Projects", W.soloProjects, "done",
      state(has(p.soloProjects), p.declaredNoSoloProjectsAt), true),
  ];

  const total = lines.reduce((a, l) => a + (lineCounts(l.state) ? l.points : 0), 0);
  return { total, lines };
}

function L(
  key: ScoreLine["key"],
  label: string,
  points: number,
  group: ScoreGroup,
  st: ScoreLineState,
  declarable = false
): ScoreLine {
  return { key, label, points, state: st, group, declarable };
}

/** The stored `completeness` column, 0–100. */
export function computeProviderCompleteness(p: CompletenessInput): number {
  return computeProfileScore(p).total;
}

// ITS DOC COMMENT PARAPHRASED, per rule 12 — the original carried a `` that

// WHAT'S MISSING — UNSCORED, AND DELIBERATELY SO WS-5b)

/** THE METER SAID 98% FOR A PROFILE MISSING FOUR EMPLOYERS AND ALL FIVE */
export type EnrichmentGapInput = {
  employers: number;
  projects: number;
  certifications: number;
  education: number;
  specializations: number;
};

export function profileEnrichmentGaps(p: EnrichmentGapInput): string[] {
  const out: string[] = [];
  // ONE employer is the signal was chasing — a 30-year career that
  if (p.employers === 0) out.push("No work history yet");
  else if (p.employers === 1) out.push("Only one employer — most careers have more");
  if (p.certifications === 0) out.push("No certifications");
  if (p.projects === 0) out.push("No projects");
  if (p.education === 0) out.push("No education");
  if (p.specializations === 0) out.push("No specializations");
  return out;
}

// THE CHECKLIST — A READING OF THE SCORE, NOT A SECOND SCORE

export type ChecklistRow = {
  key: string;
  label: string;
  done: boolean;
  /** Its own weight, so a missing row can say which action pays most. */
  points: number;
  /** Filled rows carry a count where they have one — `Employers (4)`. */
  count?: number;
  /** What to do about it, when it is missing. */
  hint?: string;
};

/** The checklist, in the order a provider should act on it. */
// IT USED TO MIRROR THE SCORER PREDICATE FOR PREDICATE, BY HAND, IN THIS
export function completenessChecklist(p: CompletenessInput): ChecklistRow[] {
  const counts: Partial<Record<ScoreLine["key"], number>> = {
    skills: p.skills.length,
    languages: p.languages.length,
    workHistory: p.employers.length,
    education: p.education.length,
    certifications: p.certifications.length,
    specializations: p.specializations.length,
    soloProjects: p.soloProjects?.length ?? 0,
  };
  const hints: Partial<Record<ScoreLine["key"], string>> = {
    headline: "Add a title — the one line buyers scan first.",
    field: "Pick your role.",
    skills: "Add at least one skill.",
    rate: "Set a rate so buyers can filter you in.",
    photo: "Add a photo.",
    identity: "Add your address and phone number.",
    overview: `Write at least ${BIO_MIN_CHARS} characters.`,
    location: "Say where you are based.",
    languages: "Add one language.",
    experienceYears: "Date a job or a project so we can show your years.",
    workMethod: "Say whether you deliver the work yourself.",
    workHistory: "Add a job — or tell us you have none.",
    education: "Add a qualification — or tell us you have none.",
    specializations: "Pick your specializations — or tell us you have none.",
    certifications: "Add a certification — or tell us you have none.",
    soloProjects: "Add a solo project — or tell us you have none.",
  };

  return computeProfileScore(p).lines.map((l) => ({
    key: l.key,
    label: l.label,
    // that is the point of the third state, and a checklist that kept nagging
    done: lineCounts(l.state),
    points: l.points,
    count: counts[l.key],
    hint: hints[l.key],
  }));
}
