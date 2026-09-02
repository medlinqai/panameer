import { prisma } from "@/lib/prisma";
import {
  COMMUNITY_BAR,
  IDENTITY_PERSON_SELECT,
  missingIdentity,
  subjectFromPerson,
  type IdentityField,
} from "@/lib/identity-bar";

/**
 * YOU POST AS A PERSON, NOT AN INBOX (`P1-ALL-E033`).
 *
 * **SCOTT, 2026-09-02:** *"Do we let randoms in the community? What if they shit
 * post?… Anyone can give a BS email and verify it, no?"*
 *
 * Yes — anyone can. Email verification proves control of an INBOX and nothing
 * about a person, and `api/community/forums/route.ts` was `guardApi
 * ("authenticated")` and nothing else, so a throwaway address could open threads
 * and reply with no name, no face and no job title.
 *
 * ⚠⚠ THE FIX IS NOT VETTING AND NOT MODERATION. IT IS NON-ANONYMITY. Scott:
 * *"That isn't vetting, it's non-anonymity — and non-anonymity does most of the
 * work moderation would otherwise have to."* Nothing here judges anybody's
 * quality and nothing here removes a post.
 *
 * ── ⚠⚠ THE PREDICATE IS NOT HERE. IT IS IN `lib/identity-bar.ts` ─────────────
 *
 * This file is the community's VOICE and its database read. The rule itself is
 * shared with the work-request post gate (`P1-J4-E025`) and lives in exactly one
 * place, because two copies drift. ⚠ WHAT DIFFERS IS THE BAR AND THE WORDS: the
 * community asks for three fields and NO COMPANY — a learner with no employer, a
 * student, someone between roles, belongs here — and the reason a provider needs
 * your photo is not the reason the community does.
 */

/**
 * ⚠⚠ ONE LINE PER MISSING FIELD, IN THE MEMBER'S INTEREST, EACH LINKING TO THE
 * FIELD. Never *"complete your profile to post"* — both briefs forbid that
 * phrase by name and both harnesses fail the build on it.
 *
 * ⚠ THESE ARE CHAT'S DRAFTED STRINGS, ADOPTED VERBATIM and split at the em dash
 * so they share the `{field} — {reason}` shape the work-request refusal already
 * uses. Reported at `E033`; Scott approves the wording.
 */
export const COMMUNITY_REQUIREMENTS: {
  key: IdentityField;
  field: string;
  reason: string;
  href: string;
}[] = [
  {
    key: "name",
    field: "Add your name",
    reason: "People answer people.",
    href: "/settings/profile",
  },
  {
    key: "photo",
    field: "Add a photo",
    reason: "A face gets more replies than an avatar.",
    href: "/settings/profile",
  },
  {
    key: "jobTitle",
    field: "Add your job title",
    reason: "It tells people why your answer is worth reading.",
    href: "/settings/profile",
  },
];

export type CommunityGap = (typeof COMMUNITY_REQUIREMENTS)[number];

export const communityRequirementFor = (key: IdentityField): CommunityGap =>
  COMMUNITY_REQUIREMENTS.find((r) => r.key === key)!;

/**
 * What this person still owes before they may WRITE.
 *
 * ⚠⚠ WRITING ONLY. Nothing on any read path calls this, and `check:community-
 * identity` fails the build if one ever does. Reading stays completely open,
 * signed out included — a community nobody can read is a community nobody joins.
 * ⚠ AND `markHelpful` IS NOT GATED EITHER: marking an answer helpful is a
 * READER's act, and gating it would suppress the one signal the whole board runs
 * on.
 *
 * ⚠ NO COMPANY IS READ HERE AT ALL — not even to ignore it. `COMMUNITY_BAR` does
 * not contain the company fields, so the subject is built with
 * `hasApprovedCompanyMembership: false` and it changes nothing. That default is
 * safe precisely because the bar never asks.
 */
export async function communityIdentityGaps(userId: string): Promise<CommunityGap[]> {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: IDENTITY_PERSON_SELECT,
  });
  if (!person) return COMMUNITY_REQUIREMENTS;
  return missingIdentity(subjectFromPerson(person), COMMUNITY_BAR).map(
    communityRequirementFor
  );
}

/** The same thing from a Person id — the shape `lib/forums.ts` already holds. */
export async function communityIdentityGapsForPerson(
  personId: string
): Promise<CommunityGap[]> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: IDENTITY_PERSON_SELECT,
  });
  if (!person) return COMMUNITY_REQUIREMENTS;
  return missingIdentity(subjectFromPerson(person), COMMUNITY_BAR).map(
    communityRequirementFor
  );
}
