import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere, type Viewer } from "@/lib/access";
import { getWorkRequest } from "@/lib/work-request";
import { suiteFromPillar } from "@/lib/suite";
import type { SoftwareSuite } from "@prisma/client";

/**
 * Providers whose skills overlap a Work Request, RANKED BY WEIGHTED DEPTH
 * (brief_create_work_request_v1 WS-E; reworked by brief_per_job_skill_model
 * WS-5).
 *
 * ── WHAT CHANGED, AND WHY IT COULD NOT BEFORE ────────────────────────────────
 *
 * This used to rank on how many of the request's skills a provider ticked, and
 * the comment here said that was the only signal that existed — no deliveries,
 * no ratings, no history to weight by. That was true of a profile-level
 * checklist. It is not true now: every skill carries the cumulative, recency-
 * decayed time behind it (`ProviderSkill.weight`), computed from dated jobs. So
 * ranking moves from "how many did they tick" to "how deep and how recent",
 * which is the difference between a filter and a match.
 *
 * Counting overlap alone actively rewarded breadth-without-depth — the exact
 * profile the per-job model is designed to expose as thin.
 *
 * ── SUITE BOOSTS, IT DOES NOT GATE ───────────────────────────────────────────
 *
 * When the request names a suite, providers whose centre of gravity is there
 * rank higher. They are not the only results. A consultant who is 15%
 * PeopleSoft but did deep, recent PeopleSoft GL is the right answer to a
 * PeopleSoft GL question, and a filter would drop them.
 *
 * ── "ANY SUITE" RESOLVES THROUGH THE BRIDGE ──────────────────────────────────
 *
 * A capability-only request ("Requisitioning & Demand Management", no system)
 * names no modules, so a naive skill-id query matches nobody. The Bridge maps
 * each capability to the module that delivers it on every suite, so the request
 * expands to all of them and matches providers who only ever listed vendor
 * modules — which is all of them.
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
  /**
   * Summed weighted depth across the request's skills — the ranking number.
   * Exposed so the UI can say WHY somebody is first instead of asserting it.
   */
  matchWeight: number;
  /** Longest cumulative months on any one of the request's skills. */
  depthMonths: number;
  /** Most recent use of any of them, for a "last used" line. */
  lastUsed: Date | null;
  /** Their centre of gravity, best suite first: [suite, pct]. */
  suiteMix: { suite: SoftwareSuite; pct: number }[];
};

/**
 * Widen a request's skills through the capability Bridge (WS-5).
 *
 * A request that named a suite already points at that suite's modules and is
 * returned unchanged. A request with NO suite ("Any / not sure") has skills
 * that may be capability domains, or modules of one arbitrary suite; either
 * way, the equivalent module on every other suite should match too. The Bridge
 * is the only thing that knows those are the same capability.
 */
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

export async function matchProvidersFor(
  viewer: Viewer,
  workRequestId: string
): Promise<{ skillIds: string[]; providers: MatchedProvider[] }> {
  // Ownership + tenancy are enforced by `getWorkRequest`; a request the viewer
  // does not own throws before any provider is read.
  const wr = await getWorkRequest(viewer, workRequestId);
  if (wr.skillIds.length === 0) return { skillIds: wr.skillIds, providers: [] };

  /*
    No pillar means the buyer chose "Any / not sure" on a vendor role. That is
    the signal to widen: match the same capability wherever it is implemented,
    rather than only where this request happened to name it.
  */
  const anySuite = !wr.pillarId;
  const skillIds = await widenThroughBridge(wr.skillIds, anySuite);

  /** The suite the request named, if any — a booster, never a filter. */
  const requestedSuite = wr.pillarId
    ? suiteFromPillar(
        (
          await prisma.pillar.findUnique({
            where: { id: wr.pillarId },
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
    take: 100,
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
        select: {
          weight: true,
          months_total: true,
          last_used: true,
          skill: { select: { name: true } },
        },
      },
      suiteProfiles: {
        select: { suite: true, weight_pct: true },
        orderBy: { weight_pct: "desc" },
      },
    },
  });

  /**
   * How much naming a suite is worth.
   *
   * A multiplier on the provider's share of that suite, so a 100%-Oracle
   * consultant gets the full boost and a 20%-Oracle one gets a fifth of it. It
   * tops out at +50%: enough to lift the right specialist above an equally deep
   * generalist, never enough for a shallow match on the named suite to beat a
   * deep match on another. Naming a system is a preference, not a requirement —
   * that is the difference between this and a `where` clause.
   */
  const SUITE_BOOST = 0.5;

  const providers = rows
    .map((p) => {
      const base = p.skills.reduce((n, s) => n + s.weight, 0);
      const share = requestedSuite
        ? (p.suiteProfiles.find((s) => s.suite === requestedSuite)?.weight_pct ?? 0) / 100
        : 0;
      return {
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
      Weighted depth first; overlap breaks ties. Overlap survives as the
      tie-break rather than the ranking because two providers of equal depth,
      one covering four of the asked-for skills and one covering two, are
      genuinely ordered that way.
    */
    .sort(
      (a, b) =>
        b.matchWeight - a.matchWeight ||
        b.relevantSkills - a.relevantSkills ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 24);

  return { skillIds, providers };
}
