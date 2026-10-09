import { prisma } from "@/lib/prisma";
import { getPathForumTeaser, type PathForumTeaser } from "@/lib/forums";
import { pathInterestFor } from "@/lib/path-interest";
import type { Viewer } from "@/lib/access";
import { shownRunTime } from "@/lib/lesson-duration";
import { LESSON_STATE_SHORT, isPlayable, lessonState, pathIsOpenTo, playableProgress } from "@/lib/learn";
import {
  instructorIdsFor,
  loadInstructors,
  resolveInstructors,
  tallyExperts,
} from "@/lib/learn-instructors";
import { lessonFace, withoutPlaceholders } from "@/lib/learn-faces";
import type { Instructor } from "@/lib/learn-instructor-format";

export type AppLessonRow = {
  id: string;
  title: string;
  runTime: string | null;
  playable: boolean;
  stateLabel: string;
  completed: boolean;
  current: boolean;
  instructor: Instructor | null;
  instructorInherited: boolean;
};

export type AppCourse = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  lessons: number;
  completed: number;
  percent: number;
  sectionCount: number;
  instructors: Instructor[];
  /** True for the one course the learner is standing in. */
  current: boolean;
  sections: { id: string; title: string; lessons: AppLessonRow[]; completed: number }[];
};

export type LeaderRow = { label: string; lessons: number; isViewer: boolean };

export type AppPathView = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  lessons: number;
  completed: number;
  percent: number;
  enrolled: boolean;
  instructors: Instructor[];
  courses: AppCourse[];
  /** Where to send Resume; null when everything is watched. */
  nextLesson: { id: string; title: string; position: number; playable: boolean } | null;
  ready: boolean;
  forum: PathForumTeaser | null;
  interest: { count: number; mine: boolean };
  test: {
    passThreshold: number | null;
    maxAttempts: number | null;
    exists: boolean;
    ready: boolean;
    attemptsUsed: number;
    passed: boolean;
  };
  certificate: { earned: boolean; verifyUrl: string | null };
  enrolledCount: number | null;
  leaderboard: LeaderRow[];
  /** Derived from the course titles. See `certificateClaims`. */
  claims: string[];
};

export const AUDIENCE_FLOOR = 10;

export function certificateClaims(courseTitles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of courseTitles) {
    const t = raw
      .replace(/^\s*\d+\s*[.)]?\s*/, "")
      .replace(/^How to Use the\s+/i, "Use the ")
      .replace(/^How to Use\s+/i, "Use ")
      .replace(/^How to Deploy\s+/i, "Deploy ")
      .replace(/^How to Implement\s+/i, "Implement ")
      .replace(/^How to\s+/i, "")
      .replace(/^Introducing\s+/i, "Work in ")
      .replace(/^The Fundamentals of\s+/i, "Apply the fundamentals of ")
      .trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.charAt(0).toUpperCase() + t.slice(1));
  }
  return out.slice(0, 6);
}

export function leaderLabel(first: string | null, last: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f && l) return `${f[0].toUpperCase()}. ${l}`;
  if (l) return l;
  if (f) return f;
  /* No name on the row — a rank with no label rather than an email. */
  return "A learner";
}

export async function getAppPath(
  // — IT TAKES THE VIEWER, NOT THE ID. `getPathForumTeaser` asks
  slug: string,
  viewer: Viewer | null
): Promise<AppPathView | null> {
  const userId = viewer?.userId ?? null;
  const path = await prisma.learningPath.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      group: true,
      audience: true,
      expert_person_id: true,
      assessment: { select: { pass_threshold: true, max_attempts: true, status: true } },
      courses: {
        orderBy: [{ sort_order: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          sections: {
            orderBy: [{ sort_order: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              lessons: {
                where: { retired_at: null },
                orderBy: [{ sort_order: "asc" }, { title: "asc" }],
                select: {
                  id: true,
                  title: true,
                  run_time: true,
                  duration_source: true,
                  vimeo_ref: true,
                  production_status: true,
                  expert_person_id: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!path) return null;

  const allLessons = path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));

  const [enrolment, progress, directory, enrolledCountRaw, forum, interest, attempts, cert] = await Promise.all([
    userId
      ? prisma.learnEnrollment.findUnique({
          where: { user_id_learning_path_id: { user_id: userId, learning_path_id: path.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    userId
      ? prisma.lessonProgress.findMany({ where: { user_id: userId }, select: { lesson_id: true } })
      : Promise.resolve([]),
    loadInstructors(instructorIdsFor(allLessons, path.expert_person_id)),
    prisma.learnEnrollment.count({ where: { learning_path_id: path.id } }),
    // THE SAME TEASER THE PUBLIC PAGE USED — counts and `canOpen`, nothing
    getPathForumTeaser(viewer, path.id),
    pathInterestFor(userId, path.id),
    userId
      ? prisma.certificationAttempt.findMany({
          where: { user_id: userId, learning_path_id: path.id, is_preview: false },
          select: { passed: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.certification.findFirst({
          where: {
            issued_from: "LEARN",
            learning_path_id: path.id,
            providerProfile: { person: { user_id: userId } },
          },
          select: { public_credential_url: true },
        })
      : Promise.resolve(null),
  ]);

  const done = new Set(progress.map((p) => p.lesson_id));
  const pathInstructors = withoutPlaceholders(
    resolveInstructors(tallyExperts(allLessons), directory, path.expert_person_id)
  );

  /* The first unwatched lesson in running order — what Resume points at, and
     what marks the CURRENT course and the CURRENT row. */
  const order = path.courses.flatMap((c) =>
    c.sections.flatMap((s) => s.lessons.map((l) => ({ l, c })))
  );
  const nextIdx = order.findIndex((x) => !done.has(x.l.id));
  const nextId = nextIdx >= 0 ? order[nextIdx].l.id : null;
  const currentCourseId = nextIdx >= 0 ? order[nextIdx].c.id : null;

  const courses: AppCourse[] = path.courses.map((c) => {
    const courseLessons = c.sections.flatMap((s) => s.lessons);
    const courseInstructors = withoutPlaceholders(
      resolveInstructors(tallyExperts(courseLessons), directory, path.expert_person_id)
    );
    const sections = c.sections.map((s) => {
      const lessons: AppLessonRow[] = s.lessons.map((l) => {
        const face = lessonFace(l, directory, courseInstructors, pathInstructors);
        return {
          id: l.id,
          title: l.title,
          runTime: shownRunTime(l),
          playable: isPlayable(l),
          stateLabel: LESSON_STATE_SHORT[lessonState(l)],
          completed: done.has(l.id),
          current: l.id === nextId,
          instructor: face.instructor,
          instructorInherited: face.inherited,
        };
      });
      return {
        id: s.id,
        title: s.title,
        lessons,
        completed: lessons.filter((l) => l.completed).length,
      };
    });
    const completed = sections.reduce((n, s) => n + s.completed, 0);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      lessons: courseLessons.length,
      completed,
      /* `E364` WS-5 — playable denominator. */
      percent: playableProgress(courseLessons, done).percent,
      sectionCount: c.sections.length,
      instructors: courseInstructors,
      current: c.id === currentCourseId,
      sections,
    };
  });

  const completed = allLessons.filter((l) => done.has(l.id)).length;
  const aboveFloor = enrolledCountRaw >= AUDIENCE_FLOOR;

  return {
    id: path.id,
    title: path.title,
    slug: path.slug,
    summary: path.summary,
    group: path.group,
    audience: path.audience,
    lessons: allLessons.length,
    completed,
    /* `E364` WS-5 — playable denominator, path level. */
    percent: playableProgress(allLessons, done).percent,
    enrolled: Boolean(enrolment),
    // THE SAME PREDICATE DISCOVERY USES . This was the THIRD
    ready: pathIsOpenTo(allLessons.some(isPlayable), Boolean(enrolment)),
    forum,
    interest,
    instructors: pathInstructors,
    courses,
    nextLesson:
      nextIdx >= 0
        ? {
            id: order[nextIdx].l.id,
            title: order[nextIdx].l.title,
            position: nextIdx + 1,
            playable: isPlayable(order[nextIdx].l),
          }
        : null,
    test: {
      passThreshold: path.assessment?.pass_threshold ?? null,
      maxAttempts: path.assessment?.max_attempts ?? null,
      exists: Boolean(path.assessment),
      ready: path.assessment?.status === "PUBLISHED",
      attemptsUsed: attempts.length,
      passed: attempts.some((a) => a.passed),
    },
    certificate: { earned: Boolean(cert), verifyUrl: cert?.public_credential_url ?? null },
    enrolledCount: aboveFloor ? enrolledCountRaw : null,
    leaderboard: aboveFloor ? await getLeaderboard(path.id, userId) : [],
    claims: certificateClaims(path.courses.map((c) => c.title)),
  };
}

/** This path, this month — ranked by lessons finished SINCE THE 1st. */
async function getLeaderboard(pathId: string, viewerId: string | null): Promise<LeaderRow[]> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const rows = await prisma.lessonProgress.findMany({
    where: {
      completed_at: { gte: monthStart },
      lesson: { section: { course: { learning_path_id: pathId } } },
    },
    select: { user_id: true, user: { select: { first_name: true, last_name: true } } },
  });

  const tally = new Map<string, { label: string; lessons: number }>();
  for (const r of rows) {
    const cur = tally.get(r.user_id) ?? {
      label: leaderLabel(r.user.first_name, r.user.last_name),
      lessons: 0,
    };
    cur.lessons += 1;
    tally.set(r.user_id, cur);
  }

  const ranked = [...tally.entries()]
    .map(([id, v]) => ({ ...v, isViewer: id === viewerId }))
    .sort((a, b) => b.lessons - a.lessons || a.label.localeCompare(b.label));

  const top = ranked.slice(0, 5);
  /* The viewer always sees where THEY stand, even outside the top five — that
     is the only reason a leaderboard motivates anybody. */
  const me = ranked.find((r) => r.isViewer);
  if (me && !top.includes(me)) top.push(me);
  return top.map((r) => ({ ...r, label: r.isViewer ? "You" : r.label }));
}
