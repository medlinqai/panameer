import { prisma } from "@/lib/prisma";
import { getTestState } from "@/lib/learn-assessment";
import { isPlayable } from "@/lib/learn";
import { pathArea } from "@/lib/learn-area";
import { experienceYears } from "@/lib/experience";

// Learn › Home (2026-10-08): the path you're furthest into, two boards, and the most popular paths (ranked by learners).
type LessonRow = { id: string; title: string; seconds: number | null; runTime: string | null; playable: boolean };

/** Every published path's lessons, in reading order (course → section → lesson). */
async function lessonsByPath(pathIds: string[]) {
  if (!pathIds.length) return new Map<string, LessonRow[]>();
  const courses = await prisma.course.findMany({
    where: { learning_path_id: { in: pathIds } },
    orderBy: { sort_order: "asc" },
    select: { learning_path_id: true, sections: { orderBy: { sort_order: "asc" }, select: { lessons: { where: { retired_at: null }, orderBy: { sort_order: "asc" }, select: { id: true, title: true, duration_seconds: true, run_time: true, vimeo_ref: true, production_status: true } } } } },
  });
  const out = new Map<string, LessonRow[]>();
  for (const c of courses) {
    const list = out.get(c.learning_path_id) ?? [];
    for (const s of c.sections) for (const l of s.lessons) list.push({ id: l.id, title: l.title, seconds: l.duration_seconds, runTime: l.run_time, playable: isPlayable(l) });
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
        id: true, title: true, slug: true, group: true, pillar: true, expert_person_id: true,
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
    // L-E045: count and continue only through lessons with a video.
    const list = (lessons.get(pathId) ?? []).filter((l) => l.playable);
    const n = list.filter((l) => done.has(l.id)).length;
    return { done: n, total: list.length, soon: (lessons.get(pathId) ?? []).length - list.length, next: list.find((l) => !done.has(l.id)) ?? null };
  };
  const areaOf = (p: (typeof paths)[number]) => {
    if (p.slug === "oracle-cloud-foundations" || /foundation/i.test(p.group ?? "")) return "START";
    const tally = new Map<string, number>();
    for (const s of p.skills) if (s.skill.area) tally.set(s.skill.area, (tally.get(s.skill.area) ?? 0) + 1);
    // No tagged skills yet: the same keyword rules the catalog uses, on the title and group (never AI).
    return pathArea(p, [...tally.keys()]);
  };

  // The path the viewer is furthest into (started, not finished).
  const started = paths
    .map((p) => ({ p, pr: progressOf(p.id) }))
    .filter(({ p, pr }) => (enrolled.has(p.id) || pr.done > 0) && pr.total > 0 && pr.done < pr.total)
    .sort((a, b) => b.pr.done / b.pr.total - a.pr.done / a.pr.total || b.pr.done - a.pr.done);
  // Nothing in progress, but a path is finished-as-far-as-it-goes: show it as Ready to Test.
  const ready = paths
    .map((p) => ({ p, pr: progressOf(p.id) }))
    .filter(({ p, pr }) => (enrolled.has(p.id) || pr.done > 0) && pr.total > 0 && pr.done >= pr.total && !certified.has(p.id));
  const focus = started[0] ?? ready[0] ?? null;
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
          slug: focus.p.slug, title: focus.p.title, done: focus.pr.done, total: focus.pr.total, soon: focus.pr.soon, readyToTest: focus.pr.done >= focus.pr.total,
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

/** Every published path's lessons with a video, and who has finished which (every one done) — and when. */
async function finishes() {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, expert_person_id: true, courses: { select: { sections: { select: { lessons: { where: { retired_at: null }, select: { id: true, vimeo_ref: true, production_status: true, expert_person_id: true } } } } } } },
  });
  const pathOf = new Map<string, string>();
  const total = new Map<string, number>();
  for (const p of paths) {
    const out = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)).filter(isPlayable);
    total.set(p.id, out.length);
    for (const l of out) pathOf.set(l.id, p.id);
  }
  const progress = await prisma.lessonProgress.findMany({ where: { lesson_id: { in: [...pathOf.keys()] } }, select: { user_id: true, lesson_id: true, completed_at: true } });
  const per = new Map<string, { n: number; last: Date }>();
  for (const r of progress) {
    const k = `${r.user_id}|${pathOf.get(r.lesson_id)}`;
    const cur = per.get(k) ?? { n: 0, last: r.completed_at };
    cur.n++;
    if (r.completed_at > cur.last) cur.last = r.completed_at;
    per.set(k, cur);
  }
  const finished: { userId: string; pathId: string; at: Date }[] = [];
  for (const [k, v] of per) {
    const [userId, pathId] = k.split("|");
    if ((total.get(pathId) ?? 0) > 0 && v.n >= total.get(pathId)!) finished.push({ userId, pathId, at: v.last });
  }
  return { paths, finished, progress };
}

/** L-E049: Top Learners — paths finished (every lesson with a video, certified counts too), then certificates, then lessons watched. */
export async function topLearners(window: "month" | "all"): Promise<BoardRow[]> {
  const since = window === "month" ? monthStart() : new Date(0);
  const [{ finished, progress }, certs] = await Promise.all([
    finishes(),
    prisma.certification.findMany({ where: { learning_path_id: { not: null }, created_at: { gte: since } }, select: { user_id: true, learning_path_id: true } }),
  ]);
  const tally = new Map<string, { paths: Set<string>; certs: number; lessons: number }>();
  const row = (u: string) => tally.get(u) ?? (tally.set(u, { paths: new Set(), certs: 0, lessons: 0 }), tally.get(u)!);
  for (const f of finished) if (f.at >= since) row(f.userId).paths.add(f.pathId);
  for (const c of certs) { row(c.user_id).paths.add(c.learning_path_id!); row(c.user_id).certs++; }
  for (const p of progress) if (p.completed_at >= since && tally.has(p.user_id)) row(p.user_id).lessons++;
  const ranked = [...tally].filter(([, t]) => t.paths.size > 0).sort((a, b) => b[1].paths.size - a[1].paths.size || b[1].certs - a[1].certs || b[1].lessons - a[1].lessons).slice(0, 10);
  const people = await prisma.person.findMany({ where: { user_id: { in: ranked.map(([u]) => u) }, user: { is: { is_test: false } } }, select: { id: true, user_id: true, first_name: true, last_name: true, title: true, photo_url: true } });
  return ranked
    .flatMap(([u, t]) => {
      const p = people.find((x) => x.user_id === u);
      return p ? [{ personId: p.id, userId: p.user_id, name: nameOf(p), title: p.title, photoUrl: p.photo_url, n: t.paths.size, sub: `${t.paths.size} path${t.paths.size === 1 ? "" : "s"} finished · ${t.certs} certificate${t.certs === 1 ? "" : "s"}` }] : [];
    })
    .slice(0, 5);
}

/** L-E050: Top Teachers — every instructor of a published path (even with 0 learners), learners in the window, and how many finished. */
export async function topTeachers(window: "month" | "all"): Promise<BoardRow[]> {
  const since = window === "month" ? monthStart() : new Date(0);
  const { paths, finished } = await finishes();
  // The instructor: the path's expert, else whoever fronts the most lessons.
  const teacherOf = new Map<string, string>();
  for (const p of paths) {
    let t = p.expert_person_id;
    if (!t) {
      const c = new Map<string, number>();
      for (const l of p.courses.flatMap((x) => x.sections.flatMap((s) => s.lessons))) if (l.expert_person_id) c.set(l.expert_person_id, (c.get(l.expert_person_id) ?? 0) + 1);
      t = [...c].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
    if (t) teacherOf.set(p.id, t);
  }
  const enr = await prisma.learnEnrollment.findMany({ where: { learning_path_id: { in: [...teacherOf.keys()] }, created_at: { gte: since } }, select: { learning_path_id: true, user_id: true } });
  const ids = [...new Set(teacherOf.values())];
  const stat = new Map(ids.map((id) => [id, { paths: 0, learners: new Set<string>(), done: 0 }]));
  for (const [pathId, t] of teacherOf) stat.get(t)!.paths++;
  for (const e of enr) stat.get(teacherOf.get(e.learning_path_id)!)?.learners.add(`${e.user_id}|${e.learning_path_id}`);
  for (const f of finished) if (f.at >= since && teacherOf.has(f.pathId)) stat.get(teacherOf.get(f.pathId)!)!.done++;
  const people = await prisma.person.findMany({ where: { id: { in: ids }, user: { is: { is_test: false } } }, select: { id: true, user_id: true, first_name: true, last_name: true, title: true, photo_url: true } });
  return people
    .map((p) => {
      const s = stat.get(p.id)!;
      const n = s.learners.size;
      return { personId: p.id, userId: p.user_id, name: nameOf(p), title: p.title, photoUrl: p.photo_url, n, taught: s.paths, sub: `Teaches ${s.paths} path${s.paths === 1 ? "" : "s"} · ${n} learner${n === 1 ? "" : "s"} · ${s.done} finished` };
    })
    .sort((a, b) => b.n - a.n || b.taught - a.taught || a.name.localeCompare(b.name))
    .map(({ taught, ...r }) => (void taught, r))
    .slice(0, 5);
}
