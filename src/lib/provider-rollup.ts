import type { PrismaClient, SoftwareSuite } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

/**
 * THE WEIGHTED ROLLUP (brief_per_job_skill_model WS-2).
 *
 * Turns a provider's jobs into the two derived tables matching queries:
 * `ProviderSkill` (one row per skill, weighted) and `ProviderSuiteProfile`
 * (their centre of gravity across systems).
 *
 * THIS MODULE IS THE ONLY WRITER of either table. Both are caches over
 * `JobSkill`; anything else that writes them is writing data that the next job
 * edit deletes without saying so.
 *
 *     weight(skill) = Σ over jobs listing it of  months(job) × recency(end)
 *
 * Depth and currency in one number, so matching can RANK rather than merely
 * filter — "deep, recent Oracle Cloud GL" beats "touched it on a six-month
 * contract in 2016", which a presence check cannot express at all.
 */

// ---------------------------------------------------------------------------
// The constants. One place, deliberately.
// ---------------------------------------------------------------------------

/**
 * Recency half-life. Work this old counts half as much as work finished today.
 *
 * FOUR YEARS, at the top of the brief's "3–4 yrs" range, because the cost of
 * the two errors is not symmetric. Too fast a decay tells a buyer that a
 * fifteen-year Oracle veteran who spent last year on something else is a
 * novice; too slow merely lets a stale skill linger a while, which the
 * `last_used` date on the very same row already discloses.
 */
export const RECENCY_HALF_LIFE_YEARS = 4;

/**
 * The floor under the decay — old work never counts for nothing.
 *
 * Without it an exponential asymptotes to zero and a twenty-year career reads
 * as an empty profile. 0.25 says the oldest work is still worth a quarter of
 * the same time served today, which matches how a hiring manager actually
 * reads a CV: dated, not worthless.
 */
export const RECENCY_FLOOR = 0.25;

/**
 * What a self-added skill is worth: three months of decayed time.
 *
 * It has to be non-zero — a fresh consultant's honest claim should appear —
 * and it has to be small, because an unbacked claim and a padded one are
 * indistinguishable from here. Three months puts it below any real engagement
 * without hiding it.
 */
export const SELF_ADDED_WEIGHT = 3 * RECENCY_FLOOR;

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 365.25 / 12;

// ---------------------------------------------------------------------------

/** Whole months between two dates, minimum 1 — a job is never worth zero. */
export function monthsBetween(start: Date | null, end: Date | null, now: Date): number {
  if (!start) return 0;
  const finish = end ?? now;
  const months = Math.round((finish.getTime() - start.getTime()) / MS_PER_MONTH);
  /*
    A job with no start date scores 0 and is skipped; a job WITH one always
    scores at least a month even if the dates are equal or reversed. Undated
    work is the parser failing to read a date, not a claim of zero experience,
    and a reversed range is a typo — neither should silently delete a skill
    from the profile.
  */
  return Math.max(1, months);
}

/**
 * Recency multiplier for a job that ended on `end` (null = still running).
 *
 * Exponential decay on the half-life, clamped to the floor. Current work gets
 * the full 1.0, which is the intended bias: what someone is doing right now is
 * the best evidence of what they can do next.
 */
export function recency(end: Date | null, now: Date): number {
  if (!end || end >= now) return 1;
  const years = (now.getTime() - end.getTime()) / (MS_PER_MONTH * 12);
  const decayed = Math.pow(0.5, years / RECENCY_HALF_LIFE_YEARS);
  return Math.max(RECENCY_FLOOR, decayed);
}

type JobRow = {
  start_date: Date | null;
  end_date: Date | null;
  suite: SoftwareSuite | null;
  skillIds: string[];
};

export type RollupResult = {
  skills: number;
  suites: number;
  jobs: number;
};

/**
 * Recompute a provider's whole weighted vector from their jobs.
 *
 * WHOLE, not incremental. Editing one job's end date changes the recency
 * multiplier of every skill on it, and moving a job between suites changes the
 * centre of gravity — an incremental update would have to know which of those
 * happened, and the version that guesses wrong leaves a profile that is subtly,
 * permanently off with nothing to point at. Recomputing a few dozen jobs is
 * cheap; a wrong cache is not.
 *
 * Pass `tx` inside a transaction so the rollup lands with the edit that caused
 * it, rather than in a second write that can fail on its own.
 */
export async function recomputeProviderRollup(
  providerProfileId: string,
  tx: Pick<
    PrismaClient,
    "employer" | "project" | "providerSkill" | "providerSuiteProfile" | "providerProfile"
  > = defaultPrisma,
  now: Date = new Date()
): Promise<RollupResult> {
  const employers = await tx.employer.findMany({
    where: { provider_profile_id: providerProfileId },
    select: {
      id: true,
      start_date: true,
      end_date: true,
      software_suite: true,
      job_role_type_id: true,
      skills: { select: { skill_id: true } },
    },
  });
  const projects = await tx.project.findMany({
    where: { provider_profile_id: providerProfileId },
    select: {
      start_date: true,
      end_date: true,
      software_suite: true,
      employer_id: true,
      skills: { select: { skill_id: true } },
    },
  });

  const suiteByEmployer = new Map(employers.map((e) => [e.id, e.software_suite]));

  const jobs: JobRow[] = [
    ...employers.map((e) => ({
      start_date: e.start_date,
      end_date: e.end_date,
      suite: e.software_suite,
      skillIds: e.skills.map((s) => s.skill_id),
    })),
    ...projects.map((p) => ({
      start_date: p.start_date,
      end_date: p.end_date,
      /*
        A project without its own suite INHERITS its employer's. Null on a
        project means "same as the job it sat inside", which is the normal
        shape — only a sub-engagement on a different system sets its own.
      */
      suite: p.software_suite ?? (p.employer_id ? suiteByEmployer.get(p.employer_id) ?? null : null),
      skillIds: p.skills.map((s) => s.skill_id),
    })),
  ];

  type Acc = {
    weight: number;
    months: number;
    first: Date | null;
    last: Date | null;
    suites: Set<SoftwareSuite>;
  };
  const bySkill = new Map<string, Acc>();
  const bySuite = new Map<SoftwareSuite, { weight: number; last: Date | null }>();

  for (const job of jobs) {
    const months = monthsBetween(job.start_date, job.end_date, now);
    if (!months || job.skillIds.length === 0) continue;
    const weight = months * recency(job.end_date, now);
    const ended = job.end_date ?? now;

    for (const skillId of job.skillIds) {
      const acc = bySkill.get(skillId) ?? {
        weight: 0,
        months: 0,
        first: null,
        last: null,
        suites: new Set<SoftwareSuite>(),
      };
      /*
        EACH SKILL INHERITS THE FULL JOB DURATION — the brief's design call, and
        it is the right one. Splitting five years across a job's eight skills
        would make a broad engagement look like eight thin ones, punishing
        exactly the generalist depth an ERP consultant is hired for.
      */
      acc.weight += weight;
      acc.months += months;
      if (job.start_date && (!acc.first || job.start_date < acc.first)) acc.first = job.start_date;
      if (!acc.last || ended > acc.last) acc.last = ended;
      if (job.suite) acc.suites.add(job.suite);
      bySkill.set(skillId, acc);
    }

    if (job.suite) {
      const s = bySuite.get(job.suite) ?? { weight: 0, last: null };
      /*
        Suite weight counts the JOB ONCE, not once per skill on it. Summing the
        per-skill weights would make a job with twelve modules outrank a job of
        the same length with three, turning the centre of gravity into a
        measure of how thoroughly someone listed their modules.
      */
      s.weight += weight;
      if (!s.last || ended > s.last) s.last = ended;
      bySuite.set(job.suite, s);
    }
  }

  // --- Write. Self-added rows survive; everything derived is rebuilt. ------
  /*
    The escape hatch has to survive a recompute or it is not an escape hatch —
    it is a row that vanishes the next time the provider touches a job. Only
    DERIVED rows are cleared, and a skill that gains a job stops being
    self-added because the job is now the better evidence.
  */
  const derivedIds = [...bySkill.keys()];
  await tx.providerSkill.deleteMany({
    where: {
      provider_profile_id: providerProfileId,
      OR: [
        { source: "DERIVED" },
        { source: "SELF_ADDED", skill_id: { in: derivedIds } },
      ],
    },
  });

  for (const [skillId, acc] of bySkill) {
    await tx.providerSkill.create({
      data: {
        provider_profile_id: providerProfileId,
        skill_id: skillId,
        weight: acc.weight,
        months_total: acc.months,
        first_used: acc.first,
        last_used: acc.last,
        suites: [...acc.suites],
        source: "DERIVED",
      },
    });
  }

  const total = [...bySuite.values()].reduce((n, s) => n + s.weight, 0);
  await tx.providerSuiteProfile.deleteMany({ where: { provider_profile_id: providerProfileId } });
  for (const [suite, s] of bySuite) {
    await tx.providerSuiteProfile.create({
      data: {
        provider_profile_id: providerProfileId,
        suite,
        weight_pct: total > 0 ? (s.weight / total) * 100 : 0,
        last_used: s.last,
      },
    });
  }

  /*
    THE PROVIDER'S PRIMARY ROLE, derived (WS-4).

    Nothing sets `ProviderProfile.role_type_id` any more — the standalone Role
    step is gone, because role is a consequence of the work, not a separate
    question. But `marketplaceVisibleWhere()` still requires the column, so
    without this every provider who walks the new flow completes it and stays
    permanently invisible, with no error and nothing to point at. That is
    exactly the failure class the wizard's own comments call out: a condition
    that outlives the question it was checking.

    The primary role is the one carrying the most weighted time, not the most
    jobs — a decade of functional work and two short technical contracts makes
    somebody Application-Specific, and counting jobs would say otherwise.

    Only ever SET, never cleared: a provider who has classified themselves and
    then deletes their last dated job should not silently lose their role and
    drop out of the marketplace.
  */
  const roleWeight = new Map<string, number>();
  for (const e of employers) {
    if (!e.job_role_type_id) continue;
    const months = monthsBetween(e.start_date, e.end_date, now);
    if (!months) continue;
    roleWeight.set(
      e.job_role_type_id,
      (roleWeight.get(e.job_role_type_id) ?? 0) + months * recency(e.end_date, now)
    );
  }
  const primaryRole = [...roleWeight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (primaryRole) {
    await tx.providerProfile.update({
      where: { id: providerProfileId },
      data: { role_type_id: primaryRole },
    });
  }

  return { skills: bySkill.size, suites: bySuite.size, jobs: jobs.length };
}

/**
 * Add a skill with no job behind it (the escape hatch).
 *
 * Kept here rather than in the API so the low weight and the flag cannot be set
 * anywhere else — the whole point is that an unbacked claim cannot be made to
 * look like a backed one.
 */
export async function addSelfDeclaredSkill(
  providerProfileId: string,
  skillId: string,
  tx: Pick<PrismaClient, "providerSkill"> = defaultPrisma
): Promise<void> {
  const existing = await tx.providerSkill.findUnique({
    where: {
      provider_profile_id_skill_id: {
        provider_profile_id: providerProfileId,
        skill_id: skillId,
      },
    },
    select: { source: true },
  });
  // A derived row already says something stronger; do not downgrade it.
  if (existing?.source === "DERIVED") return;

  await tx.providerSkill.upsert({
    where: {
      provider_profile_id_skill_id: {
        provider_profile_id: providerProfileId,
        skill_id: skillId,
      },
    },
    update: { weight: SELF_ADDED_WEIGHT, source: "SELF_ADDED" },
    create: {
      provider_profile_id: providerProfileId,
      skill_id: skillId,
      weight: SELF_ADDED_WEIGHT,
      months_total: 0,
      suites: [],
      source: "SELF_ADDED",
    },
  });
}
