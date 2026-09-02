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

import { missingRequired, type RequiredSetInput } from "@/lib/completeness";

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

/* ═══════════════════════════════════════════════════════════════════════════
   THE GATE LADDER (`P1-ALL-E034`)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * **SCOTT, 2026-09-02:** *"i would rather gate the ability to do transactions…
 * we did this in medlinq. you had to have a profile greater than 80% complete
 * to book an apt."* And: *"i did struggle with not being direct about the data
 * i wanted and why the platform wanted that data."*
 *
 * ── ⚠⚠ THE BAR IS A REQUIRED SET, NEVER A PERCENTAGE ─────────────────────────
 *
 * `access.ts:337` already made this argument and it is right: *"A percentage was
 * a reasonable proxy while the wizard asked eleven questions. With six it is an
 * indirect way of stating something the product can now state directly, and an
 * indirect gate is how 'I answered everything and I'm still invisible' happens —
 * the arithmetic is silent."*
 *
 * A SET CAN NAME THE MISSING FIELD. A PERCENTAGE CAN ONLY SAY 72%. Scott's *"be
 * direct about the data and why we want it"* is only buildable on a set.
 * ⚠ `VISIBILITY_THRESHOLD = 80` IS UNTOUCHED — not deleted, not extended, not
 * read by anything here.
 *
 * ── ⚠⚠ THE RULE THAT GENERATES THE LADDER ────────────────────────────────────
 *
 * **A field is required by the NEXT THING THE PLATFORM MUST DO FOR YOU — never
 * "because we want it".** So every field carries a REASON, and the reason is in
 * the MEMBER's interest. ⚠ NO FIELD IS IN A SET WITHOUT ONE, and
 * `check:transaction-gates` fails the build on a field with no reason. That
 * assertion is what keeps the rule alive after everyone has forgotten the brief.
 *
 * ── THE FOUR RUNGS ───────────────────────────────────────────────────────────
 *
 *   IDENTITY    name · photo · job title
 *   LEARN       IDENTITY + at least one skill
 *   SEARCHABLE  title · role · skill · rate · photo · company · address · phone
 *   SELL        SEARCHABLE + an approved company membership + a payout method
 *
 * ⚠⚠ `SEARCHABLE` IS NOT DEFINED HERE. It delegates to `missingRequired()` in
 * `lib/completeness.ts`, which the marketplace-visibility gate and the provider
 * publish gate already read. Reimplementing it would let "publishable" and
 * "searchable" drift into two rules that disagree, and the whole point of a set
 * is that there is one.
 */

/** Every rung's own key space, so a reason can be attached to each field. */
export type GateField =
  | IdentityField
  /** `LEARN` adds exactly one. */
  | "skill"
  /* `SEARCHABLE`'s keys mirror `missingRequired()`'s returned phrases 1:1. */
  | "title"
  | "role"
  | "rate"
  | "address"
  | "phone"
  /** `SELL` adds one on top of `SEARCHABLE`. */
  | "payoutMethod";

export type GateSetName = "IDENTITY" | "LEARN" | "SEARCHABLE" | "SELL";

export type GateGap = {
  key: GateField;
  /** The imperative. Becomes the link text. */
  field: string;
  /** ⚠ WHAT BREAKS FOR THE MEMBER. Never what the platform wants. */
  reason: string;
  href: string;
};

/**
 * ⚠⚠ EVERY REASON, IN ONE TABLE. This is the file Scott reads.
 *
 * ⚠ THESE STRINGS ARE CC'S, except the two `E034` drafted verbatim (`rate` and
 * `skill`) and the three inherited from `COMMUNITY_REQUIREMENTS`/
 * `POST_REQUIREMENTS`. Reported at `E034`; Scott approves the wording.
 *
 * ⚠ EVERY ONE ANSWERS "WHAT BREAKS FOR ME". Not one says "we need this on file"
 * or "to comply" or "for our records". If a future field cannot be given a
 * sentence of this shape, the rule says it does not belong in a set — report it
 * rather than inventing a reason.
 */
export const GATE_REASONS: Record<GateField, { field: string; reason: string; href: string }> = {
  name: {
    field: "Add your name",
    reason: "People answer people, and buyers don't hire someone they can't name.",
    href: "/settings/profile",
  },
  photo: {
    field: "Add a photo",
    reason: "A face gets more replies than an avatar, and buyers see who they'd be working with.",
    href: "/settings/profile",
  },
  jobTitle: {
    field: "Add your job title",
    reason: "It tells people why your answer is worth reading.",
    href: "/settings/profile",
  },
  skill: {
    field: "Add a skill",
    reason: "It's how we know which courses to tell you about.",
    href: "/settings/profile",
  },
  title: {
    field: "Add a headline",
    reason: "It's the first line a buyer reads about you, and it's what search matches on.",
    href: "/settings/profile",
  },
  role: {
    field: "Pick your role",
    reason: "Buyers browse by role — without one you're not in any of those lists.",
    href: "/settings/profile",
  },
  rate: {
    field: "Add a rate",
    reason: "Buyers filter by rate, and without one you won't appear in search.",
    href: "/settings/profile",
  },
  approvedCompany: {
    field: "Get your company membership approved",
    reason: "A work order is between companies, so nobody can contract you as a person alone.",
    href: "/settings/company",
  },
  companyName: {
    field: "Add your company name",
    reason: "A buyer needs to know which company they'd be contracting with.",
    href: "/settings/company",
  },
  companyCountry: {
    field: "Add your company's country",
    reason: "It decides which buyers can hire you and how you'd get paid.",
    href: "/settings/company",
  },
  address: {
    field: "Add your address",
    reason: "Buyers filter by where you are, and on-site work needs to know you're reachable.",
    href: "/settings/profile",
  },
  phone: {
    field: "Add your phone number",
    reason: "It's how a buyer reaches you once they've decided, without waiting on email.",
    href: "/settings/profile",
  },
  payoutMethod: {
    field: "Add a withdrawal method",
    reason: "Panameer can't pay you for a sale until there's somewhere to send the money.",
    href: "/settings/withdrawals",
  },
};

export const gateGap = (key: GateField): GateGap => ({ key, ...GATE_REASONS[key] });

/** `LEARN` = `IDENTITY` + one skill. Deliberately light — see below. */
export const LEARN_BAR: GateField[] = [...COMMUNITY_BAR, "skill"];

/**
 * ⚠⚠ `LEARN` ASKS FOR NO COMPANY, NO ADDRESS AND NO PHONE, ON PURPOSE.
 *
 * Scott: *"I can flex on this because there is no money involved."* And skills
 * are cheap — the résumé upload already produces them, so a provider who
 * uploaded a CV has them for free.
 *
 * ⚠ THE SKILL IS NOT ARBITRARY. Scott, 2026-09-01: skills are required to learn
 * BECAUSE THE NEXUS BROADCASTS COURSES BY SKILL (`learn.course_published` in
 * `notification-events.ts` is addressed to *"every provider whose skills match
 * the course's tags"*). No skills means that broadcast can never reach you,
 * which is exactly the member-interest reason the rule demands.
 *
 * ⚠⚠ CONTACT PREFERENCE IS DELIBERATELY ABSENT, AND THIS IS REPORTED NOT
 * FORGOTTEN. Scott named an off-app contact preference so instructors could
 * reach a learner. It is not here for two independent reasons:
 *   1. `NotificationPreference` rows carry DEFAULTS, so "has a preference" is
 *      true for everyone by construction — a gate that can never fire.
 *   2. There is no channel behind it: email cannot send (`RESEND_API_KEY` is
 *      commented out) and SMS has no sender.
 * ⚠ AND NO "has chosen" FLAG WAS INVENTED to paper over (1).
 */
export type LearnSubject = IdentitySubject & { skillCount: number };

export function missingForLearn(subject: LearnSubject): GateGap[] {
  const gaps: GateGap[] = missingIdentity(subject, COMMUNITY_BAR).map(gateGap);
  if (subject.skillCount < 1) gaps.push(gateGap("skill"));
  return gaps;
}

/**
 * ⚠⚠ `SEARCHABLE` — THE EXISTING RULE, NOT A NEW ONE.
 *
 * `missingRequired()` returns PROSE (`"a title"`, `"at least one skill"`), which
 * is what the publish refusal already prints. This maps those exact phrases onto
 * keys so a reason can hang off each one. ⚠ THE COMPARISON IS STILL
 * `missingRequired`'s — nothing here re-tests a field.
 *
 * ⚠⚠ THE MAP IS TOTAL AND `check:transaction-gates` PROVES IT. If
 * `missingRequired` ever returns a phrase this table does not know, the harness
 * fails the build rather than letting the field silently lose its reason. That
 * is what keeps the two in lockstep instead of merely adjacent.
 */
export const REQUIRED_PHRASE_TO_FIELD: Record<string, GateField> = {
  "a title": "title",
  "a role": "role",
  "at least one skill": "skill",
  "your rate": "rate",
  "a photo": "photo",
  "your company": "approvedCompany",
  "your address": "address",
  "your phone number": "phone",
};

export function missingForSearchable(input: RequiredSetInput): GateGap[] {
  return missingRequired(input).map((phrase) => {
    const key = REQUIRED_PHRASE_TO_FIELD[phrase];
    /*
      ⚠ NOT SWALLOWED. An unmapped phrase means `missingRequired` grew a field
      and this table did not; throwing makes that a loud failure in the harness
      rather than a requirement that quietly stops being explained.
    */
    if (!key) {
      throw new Error(
        `missingRequired() returned "${phrase}", which has no entry in REQUIRED_PHRASE_TO_FIELD. ` +
          `Add its key and its member-interest reason — a required field without a reason is not allowed.`
      );
    }
    return gateGap(key);
  });
}

/**
 * ⚠⚠ `SELL` — GATED AT PUBLISH TIME, NOT AT PURCHASE TIME.
 *
 * **SCOTT:** *"You list a product, someone likes it, then you don't have
 * details… wait buyer… then you add fake details and the product then is deemed
 * to be fake and not available… this is messy."*
 *
 * ⚠ THE LATE GATE IS WHAT CAUSES THE FAKE DATA. A seller under pressure to close
 * types whatever closes it. Asking at publish costs an empty listing; asking at
 * purchase costs a buyer.
 *
 * ── ⚠ WHAT `SELL` HONESTLY REQUIRES TODAY, AND WHAT IT DOES NOT ──────────────
 *
 * ⚠⚠ ENTITY VALIDATION IS **NOT** IN THIS SET. `E282` is not built — there is no
 * Secretary-of-State route anywhere in the codebase (verified). Following the
 * pattern Scott approved for `P1-J4-E025`: DISCLOSE the verification state, do
 * not block on it. A gate on a check that does not exist is a gate nobody can
 * ever pass.
 *
 * ⚠ `payoutMethod` IS IN, BECAUSE IT IS GENUINELY REACHABLE TODAY — verified:
 * `/settings/tax` -> `saveTaxProfile` then `/settings/withdrawals` ->
 * `addPayoutMethod`, both live routes. ⚠ NOTE THE PRECONDITION, WHICH IS NOT
 * THIS BRIEF'S DOING: `addPayoutMethod` refuses without a `TaxProfile` ("the
 * money gate", `settings.ts:272`). So requiring a payout method transitively
 * requires a tax form. ⚠ THAT COST IS REPORTED AT `E034` — it is the single
 * biggest thing standing between a provider and a published product, and the
 * height of the bar is Scott's call, not this file's.
 *
 * ⚠ NO TIN AND NO TAX FORM ARE ASKED FOR DIRECTLY. Those are the money gate and
 * it is its own brief.
 */
export type SellSubject = RequiredSetInput & { payoutMethodCount: number };

export function missingForSell(subject: SellSubject): GateGap[] {
  const gaps = missingForSearchable(subject);
  if (subject.payoutMethodCount < 1) gaps.push(gateGap("payoutMethod"));
  return gaps;
}

/** The rungs, for the harness and for anything that needs to enumerate them. */
export const GATE_SETS: Record<GateSetName, GateField[]> = {
  IDENTITY: COMMUNITY_BAR,
  LEARN: LEARN_BAR,
  /*
    ⚠ DERIVED FROM `REQUIRED_PHRASE_TO_FIELD`, NOT TYPED OUT. A hand-written
    list here would be the second copy of `missingRequired` this brief forbids —
    it would look right and drift the first time that function changed.
  */
  SEARCHABLE: Object.values(REQUIRED_PHRASE_TO_FIELD),
  SELL: [...Object.values(REQUIRED_PHRASE_TO_FIELD), "payoutMethod"],
};
