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
