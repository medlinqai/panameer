/**
 * THE IDENTITY BAR — ONE PREDICATE, ONE HOME (`P1-ALL-E033` WS-0).
 *
 * **SCOTT, 2026-09-02:** *"Do we let randoms in the community? What if they shit
 * post?… Anyone can give a BS email and verify it, no?"* — and, agreeing on the
 * fix: *"That isn't vetting, it's non-anonymity — and non-anonymity does most of
 * the work moderation would otherwise have to."*
 *
 * ⚠⚠ THIS FILE EXISTS BECAUSE THE SAME RULE WAS ABOUT TO BE WRITTEN TWICE.
 * `P1-J4-E025` WS-3 requires name · photo · job title before a work request may
 * be POSTED. `P1-ALL-E033` requires name · photo · job title before a community
 * post. Two copies drift, and the day they disagree nobody can say which one is
 * the rule. So there is one extraction of the fields, one comparison, and the
 * surfaces differ only in WHICH BAR they pass and WHAT WORDS they use.
 *
 * ── ⚠⚠ IT RETURNS A LIST, NEVER A BOOLEAN ────────────────────────────────────
 *
 * `true`/`false` cannot produce the refusal both briefs demand — one line per
 * missing field, naming the field, in the member's interest, linking to it. A
 * boolean can only produce *"complete your profile"*, which is the exact
 * non-answer both briefs forbid by name.
 *
 * ── ⚠⚠ THE BARS DIFFER, AND THE DIFFERENCE IS THE POINT ──────────────────────
 *
 * **Scott's rule: the bar rises with what the platform must do next.**
 *
 *   COMMUNITY_BAR      name · photo · job title
 *   WORK_REQUEST_BAR   those THREE, plus an approved company membership and a
 *                      company name and country
 *
 * ⚠ COMMUNITY DELIBERATELY HAS NO COMPANY REQUIREMENT. A learner with no
 * employer — a student, someone between roles — belongs in the community.
 * Community involves no money and no counterparty obligation; a work order is
 * between companies (`lib/onboarding.ts:2360`), which is why that one asks for
 * more. ⚠ DO NOT "TIDY" THESE INTO ONE BAR.
 *
 * ── ⚠ WHAT THIS IS NOT ───────────────────────────────────────────────────────
 *
 * Not vetting, not moderation, not a reputation system, not a quality judgement,
 * and not a role. ⚠ IT IS DELIBERATELY NOT A `guardApi` CAPABILITY — capabilities
 * answer *"what may this kind of user do"*, and this answers *"has this person
 * filled in three fields"*. Modelling profile completeness as a role would put a
 * mutable data question into the permission system.
 */

export type IdentityField =
  | "name"
  | "photo"
  | "jobTitle"
  | "approvedCompany"
  | "companyName"
  | "companyCountry";

/** Community: three fields, no company. */
export const COMMUNITY_BAR: IdentityField[] = ["name", "photo", "jobTitle"];

/** Posting a work request: the same three, plus the company (`P1-J4-E025`). */
export const WORK_REQUEST_BAR: IdentityField[] = [
  ...COMMUNITY_BAR,
  "approvedCompany",
  "companyName",
  "companyCountry",
];

/**
 * Everything either bar can ask about. ⚠ A CALLER SUPPLIES THE WHOLE SHAPE even
 * when its bar ignores half of it — the alternative is optional fields that
 * silently pass because they were never provided.
 */
export type IdentitySubject = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  photoUrl: string | null | undefined;
  jobTitle: string | null | undefined;
  hasApprovedCompanyMembership: boolean;
  companyName: string | null | undefined;
  companyCountry: string | null | undefined;
};

const filled = (v: string | null | undefined) => Boolean(v && v.trim());

/*
  ⚠ ONE TEST PER FIELD, AND EVERY FIELD HAS ONE. Written as a total record rather
  than a switch so that adding an `IdentityField` without a test is a TYPE ERROR
  rather than a field that silently always passes.
*/
const SATISFIED: Record<IdentityField, (s: IdentitySubject) => boolean> = {
  name: (s) => filled(s.firstName) && filled(s.lastName),
  photo: (s) => filled(s.photoUrl),
  jobTitle: (s) => filled(s.jobTitle),
  approvedCompany: (s) => s.hasApprovedCompanyMembership,
  companyName: (s) => filled(s.companyName),
  companyCountry: (s) => filled(s.companyCountry),
};

/**
 * WHAT IS MISSING, in the bar's own order.
 *
 * ⚠ THE ORDER IS THE BAR'S, NOT THE RECORD'S — the refusal reads as a checklist
 * and a checklist that reorders itself between renders is hard to trust.
 */
export function missingIdentity(
  subject: IdentitySubject,
  bar: IdentityField[]
): IdentityField[] {
  return bar.filter((f) => !SATISFIED[f](subject));
}

/**
 * The database shape both callers already hold, mapped to the subject.
 *
 * ⚠ `hasApprovedCompanyMembership` IS PASSED IN, NOT DERIVED HERE. This file
 * stays pure — no Prisma import — so both harnesses can drive every branch
 * without a fixture account and without a database.
 */
export function subjectFromPerson(person: {
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  title: string | null;
  company?: { name: string | null; country: string | null } | null;
}, hasApprovedCompanyMembership = false): IdentitySubject {
  return {
    firstName: person.first_name,
    lastName: person.last_name,
    photoUrl: person.photo_url,
    jobTitle: person.title,
    hasApprovedCompanyMembership,
    companyName: person.company?.name,
    companyCountry: person.company?.country,
  };
}

/** The columns either bar needs. Reused by both callers' Prisma selects. */
export const IDENTITY_PERSON_SELECT = {
  first_name: true,
  last_name: true,
  photo_url: true,
  title: true,
} as const;
