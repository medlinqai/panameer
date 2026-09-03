import { prisma } from "@/lib/prisma";
import { isPlayable, pathHasPlayableLessons, playableProgress } from "@/lib/learn";
import { buildSpine, type Spine } from "@/lib/learn-spine";
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
  /** ⚠ `E364` — the Oracle product family. Null for a path outside the mapping. */
  pillar: string | null;
  /**
   * ⚠⚠ THE GRAPHIC THAT PICKS THE PATH (`P1-J3-E364` WS-4). Null when the
   * structure could not be resolved — the caller renders NO spine in that case
   * rather than a plausible one.
   */
  spine: Spine | null;
  /**
   * ⚠ HOW MANY OF THEM A LEARNER CAN ACTUALLY WATCH (`P1-J3-E362`). Carried so
   * `pickSuggestion` — a PURE function a future caller could feed an unfiltered
   * list — can refuse a path with nothing to watch on its own, rather than
   * trusting that somebody upstream filtered first.
   */
  playableLessons: number;
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
        /* ⚠ `E364` — the default slice on the pillar row. */
        pillar: true,
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

  /*
    ── ⚠⚠ A LEARNER ONLY SEES WHAT A LEARNER CAN WATCH (`P1-J3-E362`) ─────────

    SCOTT: *"If there is no video...no sense adding the course/lesson."*

    ⚠⚠ THE HEADLINE NUMBERS MOVE AND THAT IS CORRECT. This is where the
    dashboard's totals come from, so they go 23 -> 12 paths, 54 -> 39 courses and
    522 -> 305 lessons. `check:learn` GUARD 3 already forbids those as literals
    because they are query results, so every surface that prints them follows on
    its own.

    ⚠ HIDE, NEVER DELETE — a query-time filter, so a path returns the day it gets
    a video.
    ⚠ AND AN ENROLLED LEARNER KEEPS THEIR PATH: the filter is on DISCOVERY, not
    on "what I'm already in". Without the `enrolledIds` clause, somebody's own
    in-progress path would vanish from their dashboard, which is the same mistake
    as hiding a teacher's work.
    ⚠ THE COVERAGE ROW AND THE PATH LIST BOTH READ `rows`, so filtering here
    fixes all three at once rather than in three components.
  */
  const visible = paths.filter(
    (p) => pathHasPlayableLessons(p) || enrolledIds.has(p.id)
  );

  const rows: DashPath[] = visible.map((p) => {
    const pathInstructors = withoutPlaceholders(
      resolveInstructors(
        tallyExperts(p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons))),
        directory,
        p.expert_person_id
      )
    );

    let lessons = 0;
    /* ⚠ SUPERSEDED BY `pathProg.completed` (`E364` WS-5) — that one counts only
       PLAYABLE lessons on both sides of the ratio. This accumulator survives only
       to drive `finishedHere` per course below, which is a per-course question. */
    let finishedHere = 0;
    let nextLesson: DashPath["nextLesson"] = null;

    for (const c of p.courses) {
      const cl = c.sections.flatMap((s) => s.lessons);
      /*
        ── ⚠⚠ THE TOTALS COUNT WHAT A LEARNER CAN WATCH (`P1-J3-E362`) ────────

        ⚠ SUPERSEDED: `totalCourses += 1` for every course and `totalLessons +=
        cl.length` for every lesson. Filtering only at the PATH level moved the
        headline to 12 paths but left courses at 43 and lessons at 446 — because
        a visible path still counted the unplayable lessons inside it.

        ⚠⚠ THE HERO SAYS *"N learning paths, N lessons, all free."* A learner told
        446 lessons who can watch 305 has been given a number that overstates by a
        third. Scott's rule is about the lesson too: *"If there is no video...no
        sense adding the course/lesson."* So a course counts when it has something
        playable in it, and a lesson counts when it plays.

        ⚠ THIS IS NOT THE SAME AS HIDING THE CURRICULUM, and `lib/learn.ts`'s own
        note stands: *"An unplayable lesson still appears in the outline with its
        title and run time… we gate playback, not visibility."* The OUTLINE still
        shows everything; the COUNT counts what is watchable. `DashPath.lessons`
        below is deliberately still the full figure, so a path card can say
        "8 lessons · 7 ready".
      */
      if (cl.some(isPlayable)) totalCourses += 1;
      totalLessons += cl.filter(isPlayable).length;
      lessons += cl.length;
      /*
        ⚠ `finishedHere` IS A PER-COURSE QUESTION AND STAYS ON THE FULL COUNT.
        "Courses Finished" means every lesson in it is watched; a course with an
        unshot lesson is not finished, and counting it as such would be the
        mirror of the 94% bug `E364` WS-5 just closed.
      */
      const cd = cl.filter((l) => done.has(l.id)).length;
      if (cl.length > 0 && cd === cl.length) finishedHere += 1;
      if (!nextLesson) {
        const nxt = cl.find((l) => !done.has(l.id));
        if (nxt) nextLesson = { id: nxt.id, title: nxt.title, playable: isPlayable(nxt) };
      }
    }
    /* ⚠ `totalLessons` accrues per COURSE above, from playable lessons only. */
    coursesFinished += finishedHere;
    const pathProg = playableProgress(
      p.courses.flatMap((c) => c.sections.flatMap((sec) => sec.lessons)),
      done
    );
    const playableLessons = pathProg.playable;

    return {
      id: p.id,
      pillar: p.pillar,
      /* ⚠ QUERIED, NEVER INVENTED — `buildSpine` returns null when it cannot
         resolve the structure, and the component renders nothing. */
      spine: buildSpine(p.courses, done),
      playableLessons,
      title: p.title,
      slug: p.slug,
      group: p.group,
      audience: p.audience,
      coverImage: p.cover_image,
      lessons,
      /*
        ⚠ `E364` WS-5 — BOTH SIDES OVER PLAYABLE. `completed` was every progress
        row and `lessons` was every lesson, so Inventory Management capped at 94%.
        `DashPath.lessons` above stays the FULL figure on purpose — a card says
        "50 lessons · 47 ready" — but the ratio may only use what can be watched.
      */
      completed: pathProg.completed,
      percent: pathProg.percent,
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
