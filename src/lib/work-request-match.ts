import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere, type Viewer } from "@/lib/access";
import { getWorkRequest } from "@/lib/work-request";

/**
 * Providers whose skills overlap a Work Request
 * (brief_create_work_request_v1 WS-E).
 *
 * SKILL OVERLAP IS THE WHOLE ALGORITHM, and that is deliberate rather than
 * unfinished. It is the only signal that exists: nothing has been delivered
 * through Panameer, so there is no completion rate, no rating with data behind
 * it, and no history to weight by. Ranking on anything else would be ranking on
 * a number we made up.
 *
 * VISIBILITY IS `marketplaceVisibleWhere`, the same predicate the mentor
 * directory and the buyer-facing profile use — one definition of "this provider
 * is discoverable", so a provider cannot be findable here and invisible there.
 */
export type MatchedProvider = {
  profileId: string;
  firstName: string;
  lastName: string;
  name: string;
  headline: string;
  photoUrl: string | null;
  validated: boolean;
  /** How many of THIS request's skills they claim. */
  relevantSkills: number;
  matchedSkillNames: string[];
  rateMinCents: number | null;
  rateMaxCents: number | null;
  currency: string;
};

export async function matchProvidersFor(
  viewer: Viewer,
  workRequestId: string
): Promise<{ skillIds: string[]; providers: MatchedProvider[] }> {
  // Ownership + tenancy are enforced by `getWorkRequest`; a request the viewer
  // does not own throws before any provider is read.
  const wr = await getWorkRequest(viewer, workRequestId);
  const skillIds = wr.skillIds;
  if (skillIds.length === 0) return { skillIds, providers: [] };

  const rows = await prisma.providerProfile.findMany({
    where: {
      ...marketplaceVisibleWhere(),
      skills: { some: { skill_id: { in: skillIds } } },
    },
    take: 24,
    select: {
      id: true,
      headline: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      person: { select: { first_name: true, last_name: true, photo_url: true } },
      /*
        Only the skills THIS request asked for. Selecting all of a provider's
        skills and filtering in memory would work and would also pull a hundred
        rows per provider to count three.
      */
      skills: {
        where: { skill_id: { in: skillIds } },
        select: { skill: { select: { name: true } } },
      },
    },
  });

  return {
    skillIds,
    providers: rows
      .map((p) => ({
        profileId: p.id,
        firstName: p.person.first_name,
        lastName: p.person.last_name,
        name: `${p.person.first_name} ${p.person.last_name}`.trim(),
        headline: p.headline,
        photoUrl: p.person.photo_url,
        validated: p.validation_status === "VALIDATED",
        relevantSkills: p.skills.length,
        matchedSkillNames: p.skills.map((s) => s.skill.name),
        rateMinCents: p.rate_min_cents,
        rateMaxCents: p.rate_max_cents,
        currency: p.currency,
      }))
      // Most overlap first — the only ordering the data supports.
      .sort((a, b) => b.relevantSkills - a.relevantSkills),
  };
}
