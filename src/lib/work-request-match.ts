import { prisma } from "@/lib/prisma";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { marketplaceVisibleWhere, type Viewer } from "@/lib/access";
import { getWorkRequest } from "@/lib/work-request";
import { suiteFromPillar } from "@/lib/suite";
/* ⚠ `P2-A2-E600` WS-E — growth breaks the tie below the match terms. */
import { growthScore } from "@/lib/growth-score";
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

/**
 * ── ⚠⚠ THE ORDERING RULE, EXPORTED SO A GATE CAN ASSERT **IT** ───────────
 *
 * ⚠ `check:match-rank` imports this rather than re-writing the comparator. ⚠⚠ A
 * gate holding its own copy agrees with a stale duplicate the moment the real
 * sort changes — which is the failure mode `E585` names.
 * ⚠⚠⚠ IT IS PURE AND TAKES THE GROWTH MAP AS AN ARGUMENT, so the gate can prove
 * the precedence with three plain objects and no database at all.
 *
 * ⚠ MATCH FIRST, THEN OVERLAP, THEN GROWTH, THEN NAME. Growth replaced NAME and
 * nothing else (Scott, 2026-09-22) — it can only order people the ranking
 * already calls equal, so inviting colleagues cannot buy relevance.
 * ⚠⚠ IT SORTS A COPY. `Array.prototype.sort` mutates, and a caller handing in a
 * list it still holds should not find it reordered underneath.
 */
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
      /* ⚠ `headline` COLUMN IS GONE (`E595` WS-B) — the title is on the person. */
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
      validation_status: true,
      /* title: the provider's title lives on the PERSON since E595 WS-B. */
      /* ⚠ `person_id` IS SELECTED FOR THE GROWTH TIE-BREAK (`P2-A2-E600`
         WS-E). `growthScore` is keyed on the PERSON — `ColleagueInvite.
         inviter_person_id` — not on the provider profile. */
      person_id: true,
      person: { select: { first_name: true, last_name: true, title: true, photo_url: true } },
      /*
        Only the skills THIS request asked for. Selecting all of a provider's
        skills and filtering in memory would work and would also pull a hundred
        rows per provider to count three.
      */
      /* ⚠ `E517` — the provider's role selection, so matching can read SHOWN. */
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

  const candidates = rows
    .map((row) => {
      /*
        ── ⚠⚠ MATCHING READS SHOWN, NOT HELD (`P2-J1.4-E517`) ─────────────────

        ⚠⚠ SCOTT, 2026-09-17: *"Matching puts someone in front of a buyer, so it
        is an OFFER surface. If a buyer searches Payables, matches a provider,
        clicks through and finds no Payables on the profile, that reads as a
        broken app — and the provider may have narrowed precisely because they no
        longer want that work."*
        ⚠ *"THE CONSEQUENCE IS HONEST AND I ACCEPT IT: narrowing your roles
        removes you from those searches. That is what narrowing MEANS."*

        ⚠ THIS IS A DIFFERENT AXIS FROM `E515`'s NOTE that matching reads what a
        provider HOLDS. That was CATALOG scope and it still stands: a skill is not
        disqualified by which catalog it came from. ROLE scope is the provider's
        own statement about what they offer.
      */
      const shown = shownSkills(selectedRoleIds(row), row.skills, (s) => s.skill.role_type_id);
      const p = { ...row, skills: shown };
      const base = p.skills.reduce((n, s) => n + s.weight, 0);
      const share = requestedSuite
        ? (p.suiteProfiles.find((s) => s.suite === requestedSuite)?.weight_pct ?? 0) / 100
        : 0;
      return {
        profileId: p.id,
        /* ⚠ Carried for the growth tie-break only; it is stripped below and is
           NOT part of `MatchedProvider`. A buyer's payload gains nothing. */
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
