import { prisma } from "@/lib/prisma";
import {
  COMMUNITY_BAR,
  IDENTITY_PERSON_SELECT,
  missingIdentity,
  subjectFromPerson,
  type IdentityField,
} from "@/lib/identity-bar";

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
