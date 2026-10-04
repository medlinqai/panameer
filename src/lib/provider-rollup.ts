import type { PrismaClient, SoftwareSuite } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// The constants. One place, deliberately.
// ---------------------------------------------------------------------------

export const RECENCY_HALF_LIFE_YEARS = 4;

export const RECENCY_FLOOR = 0.25;

export const SELF_ADDED_WEIGHT = 3 * RECENCY_FLOOR;

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 365.25 / 12;

// ---------------------------------------------------------------------------

export function monthsBetween(
  start: Date | null,
  end: Date | null,
  isCurrent: boolean,
  now: Date
): number {
  if (!start) return 0;
  if (!end && !isCurrent) return 0;
  const finish = end ?? now;
  const months = Math.round((finish.getTime() - start.getTime()) / MS_PER_MONTH);
  return Math.max(1, months);
}

export function recency(end: Date | null, now: Date): number {
  if (!end || end >= now) return 1;
  const years = (now.getTime() - end.getTime()) / (MS_PER_MONTH * 12);
  const decayed = Math.pow(0.5, years / RECENCY_HALF_LIFE_YEARS);
  return Math.max(RECENCY_FLOOR, decayed);
}

type JobRow = {
  start_date: Date | null;
  end_date: Date | null;
  is_current: boolean;
  suite: SoftwareSuite | null;
  skillIds: string[];
};

export type RollupResult = {
  skills: number;
  suites: number;
  jobs: number;
};

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
      is_current: true,
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
      is_current: true,
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
      is_current: e.is_current,
      suite: e.software_suite,
      skillIds: e.skills.map((s) => s.skill_id),
    })),
    ...projects.map((p) => ({
      start_date: p.start_date,
      end_date: p.end_date,
      is_current: p.is_current,
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
    const months = monthsBetween(job.start_date, job.end_date, job.is_current, now);
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
      acc.weight += weight;
      acc.months += months;
      if (job.start_date && (!acc.first || job.start_date < acc.first)) acc.first = job.start_date;
      if (!acc.last || ended > acc.last) acc.last = ended;
      if (job.suite) acc.suites.add(job.suite);
      bySkill.set(skillId, acc);
    }

    if (job.suite) {
      const s = bySuite.get(job.suite) ?? { weight: 0, last: null };
      s.weight += weight;
      if (!s.last || ended > s.last) s.last = ended;
      bySuite.set(job.suite, s);
    }
  }

  // --- Write. Self-added rows survive; everything derived is rebuilt. ------
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

  const roleWeight = new Map<string, number>();
  for (const e of employers) {
    if (!e.job_role_type_id) continue;
    const months = monthsBetween(e.start_date, e.end_date, e.is_current, now);
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
