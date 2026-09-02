import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import {
  instructorIdsFor,
  loadInstructors,
  resolveInstructors,
  tallyExperts,
} from "@/lib/learn-instructors";
import { lessonFace, withoutPlaceholders } from "@/lib/learn-faces";
import { headlineFor, levelFor, type LevelState } from "@/lib/learn-progress";
import type { Instructor } from "@/lib/learn-instructor-format";
import { getLearnerSignal, pickSuggestion, type Suggestion } from "@/lib/learn-suggestion";

/**
 * MY LEARNING — everything the signed-in `/learn` dashboard says, computed once
 * (brief_learn_app_shell WS2).
 *
 * ── ⚠ NOTHING ON THAT PAGE IS A LITERAL ──────────────────────────────────────
 *
 * The catalog is 23 paths / 54 courses / 522 lessons TODAY. Those three numbers
 * appear in the mockup, in the brief and in half the copy, and every one of them
 * is a query result here — `check:learn` fails the build if they turn up as
 * numeric literals in a component. The next XLS import changes all three.
 *
 * ── ⚠ AND NO SUMMED RUN TIMES ────────────────────────────────────────────────
 *
 * The mockup's `41.5 hrs invested` tile is REPLACED by a count of finished
 * courses. `Lesson.run_time` is display copy from a spreadsheet: measured on the
 * live DB, 290 of 522 rows are null and the non-null ones include `"3:22:00"`
 * for a three-minute lesson, `":56"`, `"Intro"`, `"NA"`, `"Done"`,
 * `"Incomplete"` and `"2 days, 1:04:00"`. There is no total to compute. Counts
 * are exact, so counts are what the page shows.
 *
 * ── ONE PASS, NOT A QUERY PER CARD ───────────────────────────────────────────
 *
 * The dashboard needs course-level and lesson-level completion for the WHOLE
 * catalog (the coverage ring is "of everything"), so it reads the whole tree
 * once — the same shape `getLearnHome` already reads — rather than 23 + 54
 * round trips for rows that all come from three tables.
 */

export type DashPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  /* ⚠ ADDED FOR `E043`. The suggestion's Foundations tiers resolve on the
     BEGINNERS audience, because no path is titled "Foundations". */
  audience: string;
  coverImage: string | null;
  lessons: number;
  completed: number;
  /** 0–100, of lessons. 0 for a path with no lessons rather than NaN. */
  percent: number;
  enrolled: boolean;
  certified: boolean;
  instructors: Instructor[];
  courses: number;
  coursesFinished: number;
  /** The next unwatched lesson in running order — the "Next:" strip. */
  nextLesson: { id: string; title: string; playable: boolean } | null;
};

export type ContinueCard = {
  pathTitle: string;
  pathSlug: string;
  courseTitle: string;
  /** 1-based position of this lesson in the whole path. */
  position: number;
  lesson: {
    id: string;
    title: string;
    description: string | null;
    runTime: string | null;
    playable: boolean;
    thumbnailUrl: string | null;
  };
  sectionTitle: string;
  /** Whose face and name go on it — already through the inheritance chain. */
  instructor: Instructor | null;
  instructorInherited: boolean;
  pathCompleted: number;
  pathLessons: number;
};

export type Achievement = {
  key: string;
  title: string;
  /** The one-line proof under the title. */
  detail: string;
  earned: boolean;
  /** `streak` is resolved in the browser — see learn-progress.ts. */
  clientComputed?: "streak10";
};

export type MyLearning = {
  headline: string;
  level: LevelState;
  totals: { paths: number; courses: number; lessons: number };
  mine: {
    lessonsCompleted: number;
    coursesFinished: number;
    pathsCertified: number;
    enrolledPaths: number;
  };
  /** Raw completion timestamps, for the browser-side streak. ISO strings. */
  completedAt: string[];
  paths: DashPath[];
  inProgress: DashPath[];
  continueCard: ContinueCard | null;
  /**
   * The right half of the empty state (`E043`). ⚠ NULL WHENEVER `continueCard`
   * IS SET — the half only exists when there is nothing on the go, so the read
   * behind it is skipped entirely for an active learner rather than computed
   * and thrown away.
   */
  suggestion: Suggestion | null;
  nextCertificate: { title: string; slug: string; percent: number; remaining: number; courses: number; coursesFinished: number } | null;
  achievements: Achievement[];
};

export async function getMyLearning(userId: string): Promise<MyLearning> {
  const [paths, enrollments, progress, certs, attempts] = await Promise.all([
    prisma.learningPath.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ audience: "asc" }, { group: "asc" }, { sort_order: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        group: true,
        audience: true,
        cover_image: true,
        expert_person_id: true,
        courses: {
          orderBy: [{ sort_order: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            sections: {
              orderBy: [{ sort_order: "asc" }, { title: "asc" }],
              select: {
                id: true,
                title: true,
                lessons: {
                  orderBy: [{ sort_order: "asc" }, { title: "asc" }],
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    run_time: true,
                    thumbnail_url: true,
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
    }),
    prisma.learnEnrollment.findMany({
      where: { user_id: userId },
      select: { learning_path_id: true },
    }),
    prisma.lessonProgress.findMany({
      where: { user_id: userId },
      select: { lesson_id: true, completed_at: true },
      orderBy: { completed_at: "desc" },
    }),
    /*
      CERTIFIED = a LEARN-issued Certification pointing at the path. Not
      "completed every lesson": the certificate is the thing that lands on a
      profile with a verify URL, and the ring legend says "certified".
    */
    prisma.certification.findMany({
      where: {
        issued_from: "LEARN",
        learning_path_id: { not: null },
        providerProfile: { person: { user_id: userId } },
      },
      select: { learning_path_id: true },
    }),
    prisma.learnTestAttempt.findMany({
      where: { user_id: userId },
      select: { score: true, passed: true },
    }),
  ]);

  const directory = await loadInstructors(
    paths.flatMap((p) =>
      instructorIdsFor(
        p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)),
        p.expert_person_id
      )
    )
  );

  const enrolledIds = new Set(enrollments.map((e) => e.learning_path_id));
  const certifiedIds = new Set(certs.map((c) => c.learning_path_id).filter(Boolean) as string[]);
  const done = new Set(progress.map((p) => p.lesson_id));
  /* Most recent first — `progress` is already ordered, so [0] is the last thing
     this learner finished, which is what "pick up where you left off" means. */
  const lastDoneId = progress[0]?.lesson_id ?? null;

  let totalCourses = 0;
  let totalLessons = 0;
  let coursesFinished = 0;

  const rows: DashPath[] = paths.map((p) => {
    const pathInstructors = withoutPlaceholders(
      resolveInstructors(
        tallyExperts(p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons))),
        directory,
        p.expert_person_id
      )
    );

    let lessons = 0;
    let completed = 0;
    let finishedHere = 0;
    let nextLesson: DashPath["nextLesson"] = null;

    for (const c of p.courses) {
      totalCourses += 1;
      const cl = c.sections.flatMap((s) => s.lessons);
      lessons += cl.length;
      const cd = cl.filter((l) => done.has(l.id)).length;
      completed += cd;
      /* A course with no lessons is not "finished" — 0 of 0 is nothing done. */
      if (cl.length > 0 && cd === cl.length) finishedHere += 1;
      if (!nextLesson) {
        const nxt = cl.find((l) => !done.has(l.id));
        if (nxt) nextLesson = { id: nxt.id, title: nxt.title, playable: isPlayable(nxt) };
      }
    }
    totalLessons += lessons;
    coursesFinished += finishedHere;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      group: p.group,
      audience: p.audience,
      coverImage: p.cover_image,
      lessons,
      completed,
      percent: lessons > 0 ? Math.round((completed / lessons) * 100) : 0,
      enrolled: enrolledIds.has(p.id),
      certified: certifiedIds.has(p.id),
      instructors: pathInstructors,
      courses: p.courses.length,
      coursesFinished: finishedHere,
      nextLesson,
    };
  });

  // ── the continue card ────────────────────────────────────────────────────
  /*
    THE PATH THEY LAST TOUCHED, then its next unwatched lesson — not "the most
    recently created incomplete lesson", which would jump them into a path they
    have never opened. When nothing has been watched yet, the first enrolled
    path's first lesson is the honest answer; when nothing is enrolled either,
    there is NO CARD, because there is nowhere to pick up from.
  */
  let continueCard: ContinueCard | null = null;
  const flat = paths.flatMap((p) =>
    p.courses.flatMap((c) =>
      c.sections.flatMap((s) => s.lessons.map((l) => ({ l, s, c, p })))
    )
  );
  const hasUnwatched = (p: (typeof paths)[number]) =>
    p.courses.some((c) => c.sections.some((s) => s.lessons.some((l) => !done.has(l.id))));

  /*
    ⚠ THE LAST-TOUCHED PATH ONLY COUNTS IF THERE IS SOMETHING LEFT IN IT.

    Caught in the browser, not in a harness: a fixture whose most recent
    completion finished a path outright rendered NO continue card at all, while
    two other paths sat half-done. "Pick up where you left off" then answered
    "nowhere", which is false. So the last-touched path is the preference, not the
    rule — if it is finished, the next enrolled path with something unwatched is
    where they left off.
  */
  const lastRow = lastDoneId ? flat.find((x) => x.l.id === lastDoneId) : null;
  const homePath =
    (lastRow?.p && hasUnwatched(lastRow.p) ? lastRow.p : null) ??
    paths.find((p) => enrolledIds.has(p.id) && hasUnwatched(p)) ??
    null;

  if (homePath) {
    const order = homePath.courses.flatMap((c) =>
      c.sections.flatMap((s) => s.lessons.map((l) => ({ l, s, c })))
    );
    const idx = order.findIndex((x) => !done.has(x.l.id));
    if (idx >= 0) {
      const hit = order[idx];
      const row = rows.find((r) => r.id === homePath.id)!;
      const courseInstructors = withoutPlaceholders(
        resolveInstructors(
          tallyExperts(hit.c.sections.flatMap((s) => s.lessons)),
          directory,
          homePath.expert_person_id
        )
      );
      /*
        ⚠ THE FACE GOES THROUGH `lessonFace`, NOT THROUGH `expert_person_id`.
        This lesson may name nobody — 56 in the catalog don't — and this is the
        biggest face on the page.
      */
      const face = lessonFace(hit.l, directory, courseInstructors, row.instructors);
      continueCard = {
        pathTitle: homePath.title,
        pathSlug: homePath.slug,
        courseTitle: hit.c.title,
        position: idx + 1,
        sectionTitle: hit.s.title,
        lesson: {
          id: hit.l.id,
          title: hit.l.title,
          description: hit.l.description,
          runTime: hit.l.run_time,
          playable: isPlayable(hit.l),
          thumbnailUrl: hit.l.thumbnail_url,
        },
        instructor: face.instructor,
        instructorInherited: face.inherited,
        pathCompleted: row.completed,
        pathLessons: row.lessons,
      };
    }
  }

  // ── next certificate ─────────────────────────────────────────────────────
  const candidates = rows.filter((r) => r.enrolled && !r.certified && r.lessons > 0);
  const started = candidates.filter((r) => r.completed > 0);
  const nearest = [...(started.length > 0 ? started : candidates)].sort(
    (a, b) => a.lessons - a.completed - (b.lessons - b.completed)
  )[0];

  const lessonsCompleted = progress.length;
  const pathsCertified = certifiedIds.size;

  const achievements: Achievement[] = [
    {
      key: "first_certificate",
      title: "First Certificate",
      detail: pathsCertified > 0 ? `${pathsCertified} earned` : "Pass a path test",
      earned: pathsCertified > 0,
    },
    {
      key: "streak_10",
      title: "10-Day Streak",
      /* Filled in by the browser — the server can't know their timezone. */
      detail: "Ten days in a row",
      earned: false,
      clientComputed: "streak10",
    },
    {
      key: "hundred_lessons",
      title: "100 Lessons",
      detail: `${lessonsCompleted} watched`,
      earned: lessonsCompleted >= 100,
    },
    {
      key: "perfect_test",
      title: "Perfect Test",
      detail: attempts.some((a) => a.score === 100) ? "100% on a path test" : "Score 100% on a test",
      earned: attempts.some((a) => a.score === 100),
    },
    {
      /*
        ⚠ THIS REPLACES THE MOCKUP'S `Mentor — answer 25 in a room`. There are no
        rooms, there is no answer model, and there is nothing in the schema that
        could ever make that badge true. A badge that cannot be earned is worse
        than one fewer badge.
      */
      key: "course_finisher",
      title: "Course Finisher",
      detail: coursesFinished > 0 ? `${coursesFinished} of ${totalCourses} courses` : "Finish every lesson in a course",
      earned: coursesFinished > 0,
    },
    {
      key: "path_finisher",
      title: "Path Finisher",
      detail: pathsCertified >= 5 ? "Five paths certified" : `Certify 5 paths — ${pathsCertified} so far`,
      earned: pathsCertified >= 5,
    },
  ];

  /*
    ── ⚠ THE SUGGESTED FIRST PATH (`E043`) ────────────────────────────────────

    ⚠ ONLY WHEN THERE IS NOTHING ON THE GO. `continueCard` is the exact
    condition `MyLearning.tsx` renders the empty state on, so gating the read on
    the same value means an active learner pays nothing for a half they will
    never see — and the two can never disagree about which state the page is in.
  */
  const suggestion = continueCard ? null : pickSuggestion(rows, await getLearnerSignal(userId));

  return {
    headline: headlineFor({
      /*
        ⚠ `!r.certified`, AND THAT IS A FIX, NOT A TIDY-UP.

        Without it the nearest-certificate search picks the path with the fewest
        lessons remaining — which is ZERO for a path already certified — and the
        headline told a learner holding the certificate to "sit the test and claim
        the certificate". Caught in the browser against a fixture with one
        certificate and two paths in progress. `nextCertificate` below already
        excluded certified paths; the headline did not.
      */
      enrolled: rows
        .filter((r) => r.enrolled && !r.certified)
        .map((r) => ({ title: r.title, remaining: r.lessons - r.completed, completed: r.completed })),
    }),
    level: levelFor(lessonsCompleted),
    totals: { paths: rows.length, courses: totalCourses, lessons: totalLessons },
    mine: {
      lessonsCompleted,
      coursesFinished,
      pathsCertified,
      enrolledPaths: rows.filter((r) => r.enrolled).length,
    },
    completedAt: progress.map((p) => p.completed_at.toISOString()),
    paths: rows,
    inProgress: rows
      .filter((r) => r.enrolled && !r.certified)
      .sort((a, b) => b.percent - a.percent || b.completed - a.completed)
      .slice(0, 3),
    continueCard,
    suggestion,
    nextCertificate: nearest
      ? {
          title: nearest.title,
          slug: nearest.slug,
          percent: nearest.percent,
          remaining: nearest.lessons - nearest.completed,
          courses: nearest.courses,
          coursesFinished: nearest.coursesFinished,
        }
      : null,
    achievements,
  };
}
