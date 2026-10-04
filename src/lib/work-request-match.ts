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
        /* ⚠ THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
       `E595` WS-B collapsed the two columns into one. */
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
    /*
      ⚠⚠ `P2-J1.4-E517` — A PROVIDER WHOSE MATCHING SKILLS ARE ALL HIDDEN DROPS
      OUT. The `where` above guarantees at least one of the request's skills is
      HELD; the role filter can take that to zero, and a row with no shown
      overlap would otherwise be ranked at weight 0 with an empty skill list.
      ⚠ Scott, 2026-09-17: *"narrowing your roles removes you from those searches.
      That is what narrowing MEANS."*
    */
    .filter((p) => p.relevantSkills > 0);

  /*
    ── ⚠⚠⚠ GROWTH BREAKS THE TIE (`P2-A2-E600` WS-E) ─────────────────────────

    ⚠ SCOTT, 2026-09-22: *"it is mostly marketing… but it is important to give
    the younger users a fighting chance to rank."*
    ⚠⚠ **MATCH STAYS STRICTLY FIRST.** A better-matched provider is never pushed
    below a worse one — growth replaces the NAME tie-break and nothing else, so
    it can only order people the ranking already calls equal.
    ⚠⚠⚠ THAT IS WHAT MAKES THE `Rank Higher in Search Results` CARD TRUE WITHOUT
    MAKING IT A LEVER: inviting colleagues cannot buy relevance, only the
    alphabet.

    ⚠ ALL-TIME, NOT THIS MONTH. A buyer's shortlist should not reshuffle on the
    1st, and a provider who did the work last quarter has still done it.
    ⚠⚠ ONE QUERY PER CANDIDATE IS ACCEPTED HERE and nowhere else: the list is
    already bounded at 100 by the `take` above and typically ~24 after the
    filter. ⚠ If that ceiling ever rises, this becomes one grouped query —
    recorded so the next reader does not have to rediscover it.
  */
  const growth = new Map<string, number>(
    await Promise.all(
      candidates.map(
        async (c) =>
          [c.personId, (await growthScore(c.personId, "all")).points] as const
      )
    )
  );

  /*
    Weighted depth first; overlap breaks ties. Overlap survives as the
    tie-break rather than the ranking because two providers of equal depth,
    one covering four of the asked-for skills and one covering two, are
    genuinely ordered that way.
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — name was the last tie-break:
    //   b.matchWeight - a.matchWeight ||
    //   b.relevantSkills - a.relevantSkills ||
    //   a.name.localeCompare(b.name)
    ⚠⚠ NAME IS STILL THE FINAL TERM, below growth — two providers with equal
    match, equal overlap and equal growth must still have a STABLE order, or
    the list reshuffles between renders.
  */
  const providers = rankMatchedProviders(candidates, growth)
    .slice(0, 24)
    /*
      ⚠⚠ `personId` IS STRIPPED. It was carried only to key the growth lookup;
      `MatchedProvider` never had it, and a buyer's payload does not gain a
      person id it has no use for.
      ⚠ WRITTEN AS A `delete` ON A COPY rather than a destructured rest, because
      the rest form leaves an unused binding and this repo's lint counts those —
      the rule is 0 NEW against the baseline.
    */
    .map((c) => {
      const copy: Omit<typeof c, "personId"> & { personId?: string } = { ...c };
      delete copy.personId;
      return copy as Omit<typeof c, "personId">;
    });

  return { skillIds, providers };
}

/**
 * Providers matched to one Work Request — **the original entry point, unchanged in
 * behaviour** (`P2-A5-E709` WS-A made it a wrapper).
 *
 * ⚠⚠ **THE OWNERSHIP CHECK IS THE WHOLE REASON THIS FUNCTION STILL EXISTS
 * SEPARATELY.** `getWorkRequest` enforces ownership and tenancy, and it throws
 * **before any provider is read** — so a request the viewer does not own never
 * reaches the ranker. ⚠ Keeping that in the wrapper rather than the core is what
 * lets the core be addressed by a skill set without inventing a fake request.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the body moved, it did not change:
 * //   const anySuite = !wr.pillarId;
 * //   const skillIds = await widenThroughBridge(wr.skillIds, anySuite);
 * //   ...everything through rankMatchedProviders, now in matchProvidersForSkills
 */
export async function matchProvidersFor(
  viewer: Viewer,
  workRequestId: string
): Promise<{ skillIds: string[]; providers: MatchedProvider[] }> {
  // Ownership + tenancy are enforced by `getWorkRequest`; a request the viewer
  // does not own throws before any provider is read.
  const wr = await getWorkRequest(viewer, workRequestId);
  return matchProvidersForSkills({ skillIds: wr.skillIds, pillarId: wr.pillarId });
}
