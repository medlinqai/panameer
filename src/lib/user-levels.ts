/**
 * THE LIFECYCLE LEVELS, DERIVED (`P1-A1.5-E430` WS-4).
 *
 * **SCOTT, 2026-09-12:** *"we need to make sure STATUS follows the user all the
 * way thru… Shows verified, user, company, payee… something like this to know
 * where they are in the lifecycle."*
 *
 * That is the model in `2. Claude Sub-Files/user_levels.md`:
 * **Verified → Level 1 (User) → Level 2 (Company) → Level 3 (Payee).**
 *
 * ── ⚠⚠ THIS IS A SECOND, ORTHOGONAL MODEL AND NEITHER RENAMES THE OTHER ─────
 *
 * `lib/onboarding-status.ts` derives Scott's four WIZARD statuses — Created ·
 * In-Process · Complete · Validated — **per SIDE** (`E269`). This file derives
 * CAPABILITY GATES **per PERSON**. They answer different questions:
 *
 *   onboarding status  "how far through the sign-up flow is this side?"
 *   level              "what is this person allowed to do?"
 *
 * ⚠ `Validated` IS NOT A LEVEL. It is provider validation and it keeps its own
 * grid column, on Scott's instruction 2026-09-12: *"Validation stays where it
 * is, as its own grid column. Do not rename either model's underlying values."*
 * ⚠ SO NOTHING HERE TOUCHES `ONBOARDING_STATUSES`, and nothing there is renamed.
 *
 * ── ⚠ DERIVED, NEVER STORED, LIKE THE STATUSES ──────────────────────────────
 *
 * No `level` column, no backfill, nothing to keep in sync. Every value is
 * computed from state that already exists, so the board cannot disagree with
 * the product.
 *
 * ── ⚠⚠ WHAT IS HONESTLY DERIVABLE TODAY, MEASURED 2026-09-12 ────────────────
 *
 * Levels 2 and 3 are PARKED and unbuilt (`user_levels.md`), and the data says
 * so. Measured against the live database, 199 people:
 *
 *   VERIFIED   `User.email_verified`                  181 users
 *   LEVEL 1    name · verified · phone · title · profile · ToS
 *              ⚠ `Person.title` is the binding constraint — only 29 of 199
 *              carry one, so most of the roster is honestly BELOW Level 1.
 *   LEVEL 2    tax type 20 · tax id 4 · registered address 8 companies
 *              ⚠⚠ AND THE ONE HEALTHY-LOOKING SIGNAL IS LEGACY: 71 APPROVED
 *              `CompanyMembership` rows all predate `P1-A1.4-E418`, which
 *              removed company from registration entirely. Nobody gets one now.
 *              ⚠ `Company.name` IS NOT A SIGNAL — every account is given a
 *              placeholder company named after the person.
 *   LEVEL 3    `PayoutMethod` rows: **0**. Derivable, and empty.
 *
 * ⚠ SO THE BOARD SHOWS A REAL FUNNEL WITH A REAL CLIFF, which is what Scott
 * asked for: *"Counts cumulative so the drop-off between stages is visible."*
 * ⚠ NOTHING INVENTS A LEVEL A USER CANNOT HAVE — a level is only reported when
 * every one of its inputs is actually present.
 */

/** The lifecycle, in order. The index IS the progression. */
export const USER_LEVELS = ["Registered", "Verified", "User", "Company", "Payee"] as const;
export type UserLevel = (typeof USER_LEVELS)[number];

/** Scott's labels for the funnel tiles, with the level they count. */
export const LEVEL_TILES: { label: string; level: UserLevel | "TOTAL"; hint: string }[] = [
  { label: "Total", level: "TOTAL", hint: "Accounts on the board" },
  { label: "Verified", level: "Verified", hint: "Email confirmed" },
  { label: "Level 1 · User", level: "User", hint: "Can learn, connect, search, post" },
  { label: "Level 2 · Company", level: "Company", hint: "Company details on file" },
  { label: "Level 3 · Payee", level: "Payee", hint: "Can be paid" },
];

/**
 * Everything a level can ask about.
 *
 * ⚠ A CALLER SUPPLIES THE WHOLE SHAPE even when a level ignores half of it —
 * the same rule `lib/identity-bar.ts` follows, and for the same reason: an
 * optional field silently passes because it was never provided.
 */
export type LevelSubject = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  emailVerified: Date | null | undefined;
  tosAcceptedAt: Date | null | undefined;
  phone: string | null | undefined;
  title: string | null | undefined;
  /** Owns a RequesterProfile or a ProviderProfile — the Level 1 "profile". */
  hasProfile: boolean;
  /** Level 2 — ⚠ `Company.name` is deliberately NOT among these. */
  companyTaxType: string | null | undefined;
  companyTin: string | null | undefined;
  /** An address on the company's `Registered` site (`E280`). */
  companyRegisteredAddress: boolean;
  /** Level 3 — any payout method on file. */
  payoutMethodCount: number;
};

const filled = (v: string | null | undefined) => Boolean(v && v.trim());

/** Each level's own requirements, ignoring the ones below it. */
const MEETS: Record<Exclude<UserLevel, "Registered">, (s: LevelSubject) => boolean> = {
  Verified: (s) => s.emailVerified != null,
  User: (s) =>
    filled(s.firstName) &&
    filled(s.lastName) &&
    filled(s.phone) &&
    filled(s.title) &&
    s.hasProfile &&
    s.tosAcceptedAt != null,
  Company: (s) =>
    filled(s.companyTaxType) && filled(s.companyTin) && s.companyRegisteredAddress,
  Payee: (s) => s.payoutMethodCount > 0,
};

/**
 * The furthest level this person has actually reached.
 *
 * ⚠⚠ CUMULATIVE AND MONOTONIC, ON SCOTT'S INSTRUCTION. A level counts only if
 * every level below it is also met, so the funnel can never widen as it
 * descends — which is the whole point of showing the drop-off. A person with a
 * tax id but no job title is NOT Level 2; they are below Level 1, and the board
 * says so rather than flattering the data.
 */
export function levelFor(s: LevelSubject): UserLevel {
  let reached: UserLevel = "Registered";
  for (const level of ["Verified", "User", "Company", "Payee"] as const) {
    if (!MEETS[level](s)) break;
    reached = level;
  }
  return reached;
}

/** Has this person reached `level` (or further)? */
export function hasReached(s: LevelSubject, level: UserLevel): boolean {
  return USER_LEVELS.indexOf(levelFor(s)) >= USER_LEVELS.indexOf(level);
}

/**
 * The five funnel counts, cumulative.
 *
 * ⚠ `Total` IS THE WHOLE POPULATION, not a level — it is the funnel's mouth, so
 * the first drop-off (accounts that never verified) is visible too.
 */
export function levelCounts(subjects: LevelSubject[]): Record<string, number> {
  const counts: Record<string, number> = { TOTAL: subjects.length };
  for (const level of ["Verified", "User", "Company", "Payee"] as const) {
    counts[level] = subjects.filter((s) => hasReached(s, level)).length;
  }
  return counts;
}

/**
 * What is still missing before the next level — for the pill's tooltip.
 *
 * ⚠ IT NAMES THE FIELD, never "incomplete profile". The board exists so Scott
 * can see WHY somebody is stuck, which is the same rule `identity-bar.ts`
 * follows for the gates a member sees.
 */
export function blockingFor(s: LevelSubject): string[] {
  const reached = levelFor(s);
  const next = USER_LEVELS[USER_LEVELS.indexOf(reached) + 1];
  if (!next || next === "Registered") return [];
  const gaps: string[] = [];
  if (next === "Verified" && s.emailVerified == null) gaps.push("email not verified");
  if (next === "User") {
    if (!filled(s.firstName) || !filled(s.lastName)) gaps.push("name");
    if (!filled(s.phone)) gaps.push("phone");
    if (!filled(s.title)) gaps.push("job title");
    if (!s.hasProfile) gaps.push("profile");
    if (s.tosAcceptedAt == null) gaps.push("terms not accepted");
  }
  if (next === "Company") {
    if (!filled(s.companyTaxType)) gaps.push("tax type");
    if (!filled(s.companyTin)) gaps.push("tax id");
    if (!s.companyRegisteredAddress) gaps.push("registered address");
  }
  if (next === "Payee") gaps.push("no payout method");
  return gaps;
}
