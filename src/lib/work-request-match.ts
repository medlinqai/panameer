import { prisma } from "@/lib/prisma";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { marketplaceVisibleWhere, type Viewer } from "@/lib/access";
import { getWorkRequest } from "@/lib/work-request";
import { suiteFromPillar } from "@/lib/suite";
import { growthScore } from "@/lib/growth-score";
import type { SoftwareSuite } from "@prisma/client";

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
  matchWeight: number;
  /** Longest cumulative months on any one of the request's skills. */
  depthMonths: number;
  /** Most recent use of any of them, for a "last used" line. */
  lastUsed: Date | null;
  /** Their centre of gravity, best suite first: [suite, pct]. */
  suiteMix: { suite: SoftwareSuite; pct: number }[];
};

async function widenThroughBridge(
  skillIds: string[],
  anySuite: boolean
): Promise<string[]> {
  if (!anySuite || skillIds.length === 0) return skillIds;

  const bridged = await prisma.capabilityModuleBridge.findMany({
    where: { capability: { bridges: { some: { skill_id: { in: skillIds } } } } },
    select: { skill_id: true },
  });
  const widened = new Set(skillIds);
  for (const b of bridged) if (b.skill_id) widened.add(b.skill_id);
  return [...widened];
}

export function rankMatchedProviders<
  T extends { personId: string; name: string; matchWeight: number; relevantSkills: number }
>(rows: T[], growth: Map<string, number>): T[] {
  return [...rows].sort(
    (a, b) =>
      b.matchWeight - a.matchWeight ||
      b.relevantSkills - a.relevantSkills ||
      (growth.get(b.personId) ?? 0) - (growth.get(a.personId) ?? 0) ||
      a.name.localeCompare(b.name)
  );
}

export async function matchProvidersForSkills(input: {
  skillIds: string[];
  /** Null means "any suite" — the widen signal, not a missing value. */
  pillarId: string | null;
}): Promise<{ skillIds: string[]; providers: MatchedProvider[] }> {
  if (input.skillIds.length === 0) return { skillIds: input.skillIds, providers: [] };

  const anySuite = !input.pillarId;
  const skillIds = await widenThroughBridge(input.skillIds, anySuite);

  /** The suite the request named, if any — a booster, never a filter. */
  const requestedSuite = input.pillarId
    ? suiteFromPillar(
        (
          await prisma.pillar.findUnique({
            where: { id: input.pillarId },
            select: { name: true },
          })
        )?.name
      )
    : null;

  const rows = await prisma.providerProfile.findMany({
    where: {
      ...marketplaceVisibleWhere(),
      skills: { some: { skill_id: { in: skillIds } } },
    },
    orderBy: [{ updated_at: "desc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      person_id: true,
      person: { select: { first_name: true, last_name: true, title: true, photo_url: true } },
      roles: { select: { role_type_id: true } },
      role_type_id: true,
      skills: {
        where: { skill_id: { in: skillIds } },
        select: {
          weight: true,
          months_total: true,
          last_used: true,
          skill: { select: { name: true, role_type_id: true } },
        },
      },
      suiteProfiles: {
        select: { suite: true, weight_pct: true },
        orderBy: { weight_pct: "desc" },
      },
    },
  });

  const SUITE_BOOST = 0.5;

  const candidates = rows
    .map((row) => {
      const shown = shownSkills(selectedRoleIds(row), row.skills, (s) => s.skill.role_type_id);
      const p = { ...row, skills: shown };
      const base = p.skills.reduce((n, s) => n + s.weight, 0);
      const share = requestedSuite
        ? (p.suiteProfiles.find((s) => s.suite === requestedSuite)?.weight_pct ?? 0) / 100
        : 0;
      return {
        profileId: p.id,
        personId: p.person_id,
        firstName: p.person.first_name,
        lastName: p.person.last_name,
        name: `${p.person.first_name} ${p.person.last_name}`.trim(),
        // THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
        headline: p.person.title ?? "",
        photoUrl: p.person.photo_url,
        validated: p.validation_status === "VALIDATED",
        relevantSkills: p.skills.length,
        matchedSkillNames: p.skills.map((s) => s.skill.name),
        rateMinCents: p.rate_min_cents,
        rateMaxCents: p.rate_max_cents,
        currency: p.currency,
        matchWeight: base * (1 + SUITE_BOOST * share),
        depthMonths: p.skills.reduce((n, s) => Math.max(n, s.months_total), 0),
        lastUsed: p.skills.reduce<Date | null>(
          (d, s) => (s.last_used && (!d || s.last_used > d) ? s.last_used : d),
          null
        ),
        suiteMix: p.suiteProfiles.map((s) => ({ suite: s.suite, pct: s.weight_pct })),
      };
    })
    // — A PROVIDER WHOSE MATCHING SKILLS ARE ALL HIDDEN DROPS
    .filter((p) => p.relevantSkills > 0);

  // GROWTH BREAKS THE TIE WS-E)
  const growth = new Map<string, number>(
    await Promise.all(
      candidates.map(
        async (c) =>
          [c.personId, (await growthScore(c.personId, "all")).points] as const
      )
    )
  );

  // Weighted depth first; overlap breaks ties. Overlap survives as the
  const providers = rankMatchedProviders(candidates, growth)
    .slice(0, 24)
    // person id it has no use for.
    .map((c) => {
      const copy: Omit<typeof c, "personId"> & { personId?: string } = { ...c };
      delete copy.personId;
      return copy as Omit<typeof c, "personId">;
    });

  return { skillIds, providers };
}

/** Providers matched to one Work Request — the original entry point, unchanged in */
export async function matchProvidersFor(
  viewer: Viewer,
  workRequestId: string
): Promise<{ skillIds: string[]; providers: MatchedProvider[] }> {
  // Ownership + tenancy are enforced by `getWorkRequest`; a request the viewer
  // does not own throws before any provider is read.
  const wr = await getWorkRequest(viewer, workRequestId);
  return matchProvidersForSkills({ skillIds: wr.skillIds, pillarId: wr.pillarId });
}
