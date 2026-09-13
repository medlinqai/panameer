/**
 * WHICH JOBS A PERSON HOLDS (`P1-A1.5-E460`).
 *
 * ── ⚠⚠ EXTRACTED, NOT INVENTED ──────────────────────────────────────────────
 *
 * This is the rule `P1-A1.5-E444` fixed and the Users grid has been running
 * since; it moved here the moment a SECOND surface needed it. The brief is
 * explicit about why: *"Do not re-derive this. Import the grid's rule or the
 * grid and the page will drift."* Two copies of "is this person a Buyer?" is
 * exactly how the badge and the grid disagreed in the first place.
 *
 * ── ⚠ THE RULE, AND WHY IT IS SHAPED THIS WAY ───────────────────────────────
 *
 * `E421` gave a BUYER both profiles — `RequesterProfile` for wizard resume AND
 * `BuyerProfile` — so "owns a RequesterProfile" stopped separating the two jobs.
 *
 *   `BuyerProfile`            → **Buyer**   (the narrower, deliberate record:
 *                               `requester-onboarding.ts` writes it only when
 *                               the person answered "buyer" at the fork)
 *   `RequesterProfile` only   → **Requester**
 *   neither                   → **neither** — ⚠ NOT a default. They are
 *                               mid-signup and have not answered; naming them
 *                               would be the guess `E444` exists to remove.
 *
 * ⚠ A PERSON CAN HOLD SEVERAL. `Scott Walls (20)` is `Recruiter · Provider`, and
 * this returns both rather than picking a winner — first-match is the defect
 * `E444` removed, and any counter built on this must decide for itself whether
 * that person is counted twice.
 *
 * ⚠⚠ THIS DOES NOT PRE-EMPT `brief_user_class_job_model`. That brief's Part 1 is
 * reported and awaiting Scott, and it proposes FIRST-CLASS `USER_CLASS` /
 * `USER_JOB` enums with a migration. This function adds no column, no enum and
 * no schema change — it is the existing ad-hoc derivation, in one place instead
 * of two, and it is precisely the kind of single call site that brief says it
 * wants to change when the enums land.
 */

export type UserJobInput = {
  is_service_coordinator: boolean;
  is_service_provider: boolean;
  /*
    ⚠ PRESENCE IS THE WHOLE QUESTION, so these are typed as "any object or
    nothing". Each caller selects different COLUMNS off the profile — the grid
    takes `onboarding_step`, the user page takes `id` — and a shape that named
    fields would force every caller to widen its query to satisfy this file.
    ⚠ `object`, NOT `unknown`: a caller cannot pass a string or a number by
    accident, which is the only mistake worth catching here.
  */
  requesterProfile: object | null | undefined;
  buyerProfile: object | null | undefined;
};

/** Every job this person holds, in the order the grid prints them. */
export function jobsFor(p: UserJobInput): string[] {
  return [
    p.is_service_coordinator ? "Recruiter" : null,
    p.is_service_provider ? "Provider" : null,
    p.buyerProfile ? "Buyer" : p.requesterProfile ? "Requester" : null,
  ].filter((j): j is string => j !== null);
}

/** The grid's cell: the jobs joined, or an em-dash when there are none. */
export function jobLabel(p: UserJobInput): string {
  return jobsFor(p).join(" · ") || "—";
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE FOOTER STRIP (`P1-A1.5-E456`)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ `Coordinators` WAS A NAMING-LOCK VIOLATION, NOT A RENAME.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the five labels this replaces:
 *   `Service Requesters` · `Buyers` · `Coordinators` · `Providers` · `Total`
 *
 * ⚠⚠ `Coordinators` LEAKED THE DATABASE COLUMN `is_service_coordinator` STRAIGHT
 * ONTO THE SCREEN. `security_architecture.md` locked `USER_JOB` on 2026-08-02 and
 * the value has been **RECRUITER** ever since — so the rail was showing an admin
 * a name the model does not use. That is a violation of the lock, which is why
 * this is not filed as a preference.
 * ⚠ THE COLUMN IS NOT RENAMED. No schema change, no `db:push` — the column keeps
 * its name and the LABEL stops repeating it. Renaming the column is
 * `brief_user_class_job_model`'s job and this must not pre-empt it.
 *
 * ⚠ `Total` → `Administrators`, because a headcount was never a JOB. It sat in a
 * strip of four jobs pretending to be a fifth, and the count it showed is already
 * on the `Total Users` tile at the top of the same page.
 *
 * ⚠ FIVE DIFFERENT HUES, NOT ONE DEEPENING RAMP. These are five genuinely
 * different jobs; the HEADER tiles deepen one hue because they are a progression
 * through a single funnel. Opposite data, opposite treatment.
 */
export const JOB_TILES: {
  key: string;
  label: string;
  tone: "neutral" | "amber" | "emerald" | "emeraldDeep" | "emeraldSolid";
}[] = [
  { key: "REQUESTER", label: "Requesters", tone: "amber" },
  { key: "BUYER", label: "Buyers", tone: "emerald" },
  { key: "RECRUITER", label: "Recruiters", tone: "emeraldDeep" },
  { key: "PROVIDER", label: "Providers", tone: "emeraldSolid" },
  { key: "ADMINISTRATOR", label: "Administrators", tone: "neutral" },
];

/** What `jobsFor` returns, keyed the way `JOB_TILES` and `?job=` spell it. */
const JOB_BY_KEY: Record<string, string> = {
  REQUESTER: "Requester",
  BUYER: "Buyer",
  RECRUITER: "Recruiter",
  PROVIDER: "Provider",
};

export type AdminFlags = { isSystemAdmin: boolean; isSupport: boolean };

/**
 * Does this person hold `key`?
 *
 * ⚠⚠ A DUAL-ROLE PERSON ANSWERS TRUE TWICE AND IS COUNTED TWICE. `jobsFor`
 * returns EVERY job, and this asks each tile's question independently — no
 * first-match, which is the precise defect `E444` existed to remove. Measured:
 * 8 people hold two jobs, all of them `Recruiter · Provider`.
 * ⚠ SO THE FIVE TILES DO NOT PARTITION THE POPULATION AND MUST NOT BE READ AS A
 * BREAKDOWN. They happen to sum to 199 against 199 people, and ⚠⚠ THAT IS A
 * COINCIDENCE: +8 double-counted holders and −10 people holding no job at all
 * cancel exactly. The caption says so on the page.
 *
 * ⚠ `ADMINISTRATOR` IS A DIFFERENT AXIS and is deliberately not in `jobsFor`.
 * It reads `User.is_system_admin` / `Person.is_support` — an access flag, not a
 * marketplace job — so somebody can be an Administrator AND a Provider.
 */
export function holdsJob(
  key: string,
  p: UserJobInput,
  admin: AdminFlags
): boolean {
  if (key === "ADMINISTRATOR") return admin.isSystemAdmin || admin.isSupport;
  const want = JOB_BY_KEY[key];
  return want ? jobsFor(p).includes(want) : false;
}
