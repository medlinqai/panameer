import { prisma } from "@/lib/prisma";
import { getTestState } from "@/lib/learn-assessment";
import { areaFor } from "@/lib/skill-areas";
import { experienceYears } from "@/lib/experience";

// Learn › Home (2026-10-08): the path you're furthest into, two boards, and the most popular paths (ranked by learners).
type LessonRow = { id: string; title: string; seconds: number | null; runTime: string | null };

/** Every published path's lessons, in reading order (course → section → lesson). */
async function lessonsByPath(pathIds: string[]) {
  if (!pathIds.length) return new Map<string, LessonRow[]>();
  const courses = await prisma.course.findMany({
    where: { learning_path_id: { in: pathIds } },
    orderBy: { sort_order: "asc" },
    select: { learning_path_id: true, sections: { orderBy: { sort_order: "asc" }, select: { lessons: { where: { retired_at: null }, orderBy: { sort_order: "asc" }, select: { id: true, title: true, duration_seconds: true, run_time: true } } } } },
  });
  const out = new Map<string, LessonRow[]>();
  for (const c of courses) {
    const list = out.get(c.learning_path_id) ?? [];
    for (const s of c.sections) for (const l of s.lessons) list.push({ id: l.id, title: l.title, seconds: l.duration_seconds, runTime: l.run_time });
    out.set(c.learning_path_id, list);
  }
  return out;
}

const minutesOf = (l: LessonRow) => {
  if (l.seconds) return Math.max(1, Math.round(l.seconds / 60));
  const m = l.runTime?.match(/(\d+):(\d{2})/);
  return m ? Math.max(1, Number(m[1]) + Math.round(Number(m[2]) / 60)) : null;
};
const lengthLabel = (lessons: LessonRow[]) => {
  const total = lessons.reduce((n, l) => n + (minutesOf(l) ?? 0), 0);
  if (!total) return null;
  return total < 60 ? `${total} min` : `${Math.round((total / 60) * 2) / 2} h`;
};
const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};
const nameOf = (p: { first_name: string | null; last_name: string | null } | null | undefined) => `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "A member";

/** The suggestion for members with under 2 years' experience and no enrollments (Scott 2026-10-08). */
export const BEGINNER_PATH = "oracle-cloud-foundations";

/** Years of work from the member's own profile spans (0 with no provider profile). */
export async function profileYears(userId: string) {
  const pp = await prisma.providerProfile.findFirst({
    where: { person: { user_id: userId } },
    select: { employers: { select: { start_date: true, end_date: true, is_current: true } }, projects: { select: { start_date: true, end_date: true, is_current: true } } },
  });
  if (!pp) return 0;
  return experienceYears([...pp.employers, ...pp.projects].map((x) => ({ start: x.start_date, end: x.end_date, isCurrent: x.is_current })));
}

export async function learnHomeData(userId: string, areaFilter?: string) {
  const [paths, enrollments, myProgress, myCerts] = await Promise.all([
    prisma.learningPath.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, title: true, slug: true, group: true, expert_person_id: true,
        expert: { select: { first_name: true, last_name: true } },
        assessment: { select: { status: true } },
        skills: { select: { skill: { select: { area: true } } } },
        _count: { select: { enrollments: true, credentials: true } },
      },
    }),
    prisma.learnEnrollment.findMany({ where: { user_id: userId }, select: { learning_path_id: true, created_at: true } }),
    prisma.lessonProgress.findMany({ where: { user_id: userId }, select: { lesson_id: true } }),
    prisma.certification.findMany({ where: { user_id: userId, learning_path_id: { not: null } }, select: { learning_path_id: true } }),
  ]);
  const lessons = await lessonsByPath(paths.map((p) => p.id));
  const beginner = enrollments.length === 0 && (await profileYears(userId)) < 2;
  const done = new Set(myProgress.map((p) => p.lesson_id));
  const certified = new Set(myCerts.map((c) => c.learning_path_id));
  const enrolled = new Set(enrollments.map((e) => e.learning_path_id));

  const progressOf = (pathId: string) => {
    const list = lessons.get(pathId) ?? [];
    const n = list.filter((l) => done.has(l.id)).length;
    return { done: n, total: list.length, next: list.find((l) => !done.has(l.id)) ?? null };
  };
  const areaOf = (p: (typeof paths)[number]) => {
    if (p.slug === "oracle-cloud-foundations" || /foundation/i.test(p.group ?? "")) return "START";
    const tally = new Map<string, number>();
    for (const s of p.skills) if (s.skill.area) tally.set(s.skill.area, (tally.get(s.skill.area) ?? 0) + 1);
    // No tagged skills yet: the same keyword rules the catalog uses, on the title and group (never AI).
    return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? areaFor(p.title, p.group ? [p.group] : []);
  };

  // The path the viewer is furthest into (started, not finished).
  const started = paths
    .map((p) => ({ p, pr: progressOf(p.id) }))
    .filter(({ p, pr }) => (enrolled.has(p.id) || pr.done > 0) && pr.total > 0 && pr.done < pr.total)
    .sort((a, b) => b.pr.done / b.pr.total - a.pr.done / a.pr.total || b.pr.done - a.pr.done);
  const focus = started[0] ?? null;
  const focusTest = focus ? await getTestState(userId, focus.p.id) : null;

  const popular = paths
    .map((p) => {
      const pr = progressOf(p.id);
      const learners = p._count.enrollments;
      const completed = p._count.credentials;
      return {
        id: p.id, slug: p.slug, title: p.title, area: areaOf(p), group: p.group,
        teacher: p.expert ? nameOf(p.expert) : null,
        lessons: (lessons.get(p.id) ?? []).length,
        length: lengthLabel(lessons.get(p.id) ?? []),
        learners, completed,
        finishRate: learners ? Math.round((completed / learners) * 100) : null,
        mine: pr.done > 0 || enrolled.has(p.id) ? { done: pr.done, total: pr.total } : null,
        testReady: p.assessment?.status === "PUBLISHED",
        certified: certified.has(p.id),
      };
    })
    .sort((a, b) => b.learners - a.learners || b.completed - a.completed || a.title.localeCompare(b.title))
    // Beginners (< 2 years' experience, no enrollments): Oracle Cloud Foundations first.
    .sort((a, b) => (beginner ? Number(b.slug === BEGINNER_PATH) - Number(a.slug === BEGINNER_PATH) : 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const teachers = new Set(paths.map((p) => p.expert_person_id).filter(Boolean)).size;
  return {
    firstVisit: enrollments.length === 0 && myProgress.length === 0,
    focus: focus
      ? {
          slug: focus.p.slug, title: focus.p.title, done: focus.pr.done, total: focus.pr.total,
          next: focus.pr.next ? { id: focus.pr.next.id, title: focus.pr.next.title, index: focus.pr.done + 1, minutes: minutesOf(focus.pr.next) } : null,
          test: focusTest ? { ready: focusTest.ready, questions: focusTest.questionCount, passPct: focusTest.threshold, attemptsLeft: Math.max(0, focusTest.maxAttempts - focusTest.attemptsUsed), passed: !!focusTest.passed } : null,
        }
      : null,
    kpis: { inProgress: started.length, certificates: myCerts.length, lessonsDone: myProgress.length, paths: paths.length, teachers },
    popular: areaFilter ? popular.filter((p) => p.area === areaFilter) : popular,
    topPath: popular[0] ?? null,
    beginner,
  };
}

export type BoardRow = { personId: string; userId: string | null; name: string; title: string | null; photoUrl: string | null; n: number; sub?: string };

/** Top Learners: certificates earned (this month or all time). */
export async function topLearners(window: "month" | "all"): Promise<BoardRow[]> {
  const rows = await prisma.certification.groupBy({
    by: ["user_id"],
    where: { learning_path_id: { not: null }, ...(window === "month" ? { created_at: { gte: monthStart() } } : {}) },
    _count: { _all: true },
    orderBy: { _count: { user_id: "desc" } },
    take: 5,
  });
  const people = await prisma.person.findMany({ where: { user_id: { in: rows.map((r) => r.user_id) }, user: { is: { is_test: false } } }, select: { id: true, user_id: true, first_name: true, last_name: true, title: true, photo_url: true } });
  return rows.flatMap((r) => {
    const p = people.find((x) => x.user_id === r.user_id);
    return p ? [{ personId: p.id, userId: p.user_id, name: nameOf(p), title: p.title, photoUrl: p.photo_url, n: r._count._all }] : [];
  });
}

/** Top Teachers: learners on their paths (enrolments this month or all time). */
export async function topTeachers(window: "month" | "all"): Promise<BoardRow[]> {
  const enr = await prisma.learnEnrollment.findMany({
    where: { learningPath: { status: "PUBLISHED", expert_person_id: { not: null } }, ...(window === "month" ? { created_at: { gte: monthStart() } } : {}) },
    select: { learningPath: { select: { expert_person_id: true } } },
  });
  const tally = new Map<string, number>();
  for (const e of enr) tally.set(e.learningPath.expert_person_id!, (tally.get(e.learningPath.expert_person_id!) ?? 0) + 1);
  const ids = [...tally.keys()];
  const [people, pathCounts, completions] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: ids }, user: { is: { is_test: false } } }, select: { id: true, user_id: true, first_name: true, last_name: true, title: true, photo_url: true } }),
    prisma.learningPath.groupBy({ by: ["expert_person_id"], where: { status: "PUBLISHED", expert_person_id: { in: ids } }, _count: { _all: true } }),
    prisma.certification.findMany({ where: { learningPath: { expert_person_id: { in: ids } } }, select: { learningPath: { select: { expert_person_id: true } } } }),
  ]);
  return people
    .map((p) => {
      const nPaths = pathCounts.find((c) => c.expert_person_id === p.id)?._count._all ?? 0;
      const nDone = completions.filter((c) => c.learningPath?.expert_person_id === p.id).length;
      return { personId: p.id, userId: p.user_id, name: nameOf(p), title: p.title, photoUrl: p.photo_url, n: tally.get(p.id) ?? 0, sub: `${nPaths} learning path${nPaths === 1 ? "" : "s"} · ${nDone} completion${nDone === 1 ? "" : "s"}` };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
}
