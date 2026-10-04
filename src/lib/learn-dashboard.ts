import { prisma } from "@/lib/prisma";
import { getPathsTaughtBy } from "@/lib/learn-home";
import { shownRunTime } from "@/lib/lesson-duration";
import { isPlayable, pathHasPlayableLessons, playableProgress } from "@/lib/learn";
import { buildSpine, type Spine } from "@/lib/learn-spine";
import {
  instructorIdsFor,
  loadInstructors,
  resolveInstructors,
  tallyExperts,
} from "@/lib/learn-instructors";
import { lessonFace, withoutPlaceholders } from "@/lib/learn-faces";
import { headlineFor } from "@/lib/learn-progress";
import type { Instructor } from "@/lib/learn-instructor-format";
import { getLearnerSignal, pickSuggestion, type Suggestion } from "@/lib/learn-suggestion";
import { starterPath } from "@/lib/learn-home";

export type DashPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  audience: string;
  coverImage: string | null;
  lessons: number;
  pillar: string | null;
  spine: Spine | null;
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
};

export function starterIsDone(playable: number, completedLessons: number): boolean {
  return playable > 0 && completedLessons >= playable;
}

export type StarterCard = {
  title: string;
  slug: string;
  playable: number;
  completedLessons: number;
  enrolled: boolean;
};

export type MyLearning = {
  headline: string;
  totals: {
    paths: number;
    courses: number;
    lessons: number;
    inProduction: number;
  };
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
  suggestion: Suggestion | null;
  starter: StarterCard | null;
  nextCertificate: { title: string; slug: string; percent: number; remaining: number; courses: number; coursesFinished: number } | null;
  teaching: { title: string; slug: string; lessons: number; taughtByThem: number }[];
  certificates: {
    title: string;
    slug: string;
    earnedOn: string | null;
    score: number | null;
  }[];
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
                  duration_source: true,
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
    prisma.certification.findMany({
      where: {
        issued_from: "LEARN",
        learning_path_id: { not: null },
        providerProfile: { person: { user_id: userId } },
      },
      select: { learning_path_id: true, name: true, issued_on: true, created_at: true },
    }),
    prisma.certificationAttempt.findMany({
      where: { user_id: userId },
      select: { score: true, passed: true, learning_path_id: true, created_at: true },
    }),
  ]);

  const teacherPerson = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  const taught = teacherPerson ? await getPathsTaughtBy(teacherPerson.id) : [];
  const teaching = taught.map((t) => ({
    title: t.title,
    slug: t.slug,
    lessons: t.lessons,
    taughtByThem: t.taughtByThem,
  }));

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
  const lastDoneId = progress[0]?.lesson_id ?? null;

  let totalCourses = 0;
  let totalLessons = 0;
  let coursesFinished = 0;

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
    let finishedHere = 0;
    let nextLesson: DashPath["nextLesson"] = null;

    for (const c of p.courses) {
      const cl = c.sections.flatMap((s) => s.lessons);
      if (cl.some(isPlayable)) totalCourses += 1;
      totalLessons += cl.filter(isPlayable).length;
      lessons += cl.length;
      const cd = cl.filter((l) => done.has(l.id)).length;
      if (cl.length > 0 && cd === cl.length) finishedHere += 1;
      if (!nextLesson) {
        const nxt = cl.find((l) => !done.has(l.id));
        if (nxt) nextLesson = { id: nxt.id, title: nxt.title, playable: isPlayable(nxt) };
      }
    }
    coursesFinished += finishedHere;
    const pathProg = playableProgress(
      p.courses.flatMap((c) => c.sections.flatMap((sec) => sec.lessons)),
      done
    );
    const playableLessons = pathProg.playable;

    return {
      id: p.id,
      pillar: p.pillar,
      spine: buildSpine(p.courses, done),
      playableLessons,
      title: p.title,
      slug: p.slug,
      group: p.group,
      audience: p.audience,
      coverImage: p.cover_image,
      lessons,
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
  let continueCard: ContinueCard | null = null;
  const flat = paths.flatMap((p) =>
    p.courses.flatMap((c) =>
      c.sections.flatMap((s) => s.lessons.map((l) => ({ l, s, c, p })))
    )
  );
  const hasUnwatched = (p: (typeof paths)[number]) =>
    p.courses.some((c) => c.sections.some((s) => s.lessons.some((l) => !done.has(l.id))));

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
          runTime: shownRunTime(hit.l),
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
      detail: pathsCertified > 0 ? `${pathsCertified} earned` : `0 of 1 path certified`,
      earned: pathsCertified > 0,
    },
    /*
      ── ⚠⚠⚠ `streak_10` IS RETIRED (`P2-A4-E606` R3) ────────────────────────

      ⚠ SCOTT'S TEST: **keep what is a genuine record of something DONE; retire
      anything that rewards a HABIT rather than an accomplishment. A streak is a
      habit.** Ten consecutive days is not a thing the member achieved in the
      catalogue — it is a pattern of showing up, and rewarding it pushes toward
      opening a lesson to keep a number alive.
      ⚠⚠ IT WAS ALSO THE ONLY BADGE THE SERVER COULD NOT EARN — `earned: false`
      always, with `clientComputed` filling it in from the browser's timezone.
      **The one badge that was not a count was also the one that was not
      counted.**
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   { key: "streak_10", title: "10-Day Streak",
      //     detail: "Ten days in a row",  earned: false, clientComputed: "streak10" },
    */
    {
      key: "hundred_lessons",
      title: "100 Lessons",
      detail: `${lessonsCompleted} watched`,
      earned: lessonsCompleted >= 100,
    },
    {
      key: "perfect_test",
      title: "Perfect Test",
      /* ⚠ COUNTED IN BOTH STATES (R3). ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   detail: attempts.some((a) => a.score === 100) ? "100% on a path test" : "Score 100% on a test", */
      detail: attempts.some((a) => a.score === 100)
        ? "100% on a path test"
        : `Best so far: ${attempts.length ? Math.max(...attempts.map((a) => a.score ?? 0)) : 0}% of 100%`,
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
      /* ⚠ COUNTED IN BOTH STATES (R3). ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   detail: coursesFinished > 0 ? `${coursesFinished} of ${totalCourses} courses` : "Finish every lesson in a course", */
      detail: `${coursesFinished} of ${totalCourses} courses finished`,
      earned: coursesFinished > 0,
    },
    {
      key: "path_finisher",
      title: "Path Finisher",
      /* ⚠ COUNTED IN BOTH STATES (R3). ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   detail: pathsCertified >= 5 ? "Five paths certified" : `Certify 5 paths — ${pathsCertified} so far`, */
      detail: `${pathsCertified} of 5 paths certified`,
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

  /*
    ── ⚠⚠⚠ THE STARTER PATH, AND IT IS NOT GATED ON ANYTHING (`E683` WS-C) ──

    ⚠⚠ **COMPLETION MUST HAVE A WRITER OR THE CARD CANNOT SAY IT**, and it does:
    `LearnCard.completedLessons` is computed by `getLearnHome` from real
    `LessonProgress` rows. ⚠⚠⚠ **MEASURED 2026-09-26: `LessonProgress` HOLDS
    ZERO ROWS**, so today every member is honestly at *"0 of N"* — which is a
    **counted zero rendered in ink**, not a dash (ruling 53c).

    ⚠ **`playable`, NOT `lessons`.** The card's number is a promise about what
    the member can actually watch, the same rule the chips and the headline
    total already follow (`E362`). A path of 53 lessons with 25 playable would
    otherwise show a bar that can never fill.
    ⚠⚠ **DONE IS `completedLessons >= playable`, AND ONLY WHEN `playable > 0`** —
    with no playable lessons, `0 >= 0` would mark an empty path complete the
    moment it is flagged, which is the worst possible first impression.
  */
  const starterVerdict = await starterPath(userId);
  let starter: StarterCard | null = null;
  if (starterVerdict.kind === "one") {
    const p = starterVerdict.path;
    const done = starterIsDone(p.playable, p.completedLessons);
    starter = done
      ? null
      : {
          title: p.title,
          slug: p.slug,
          playable: p.playable,
          completedLessons: p.completedLessons,
          enrolled: p.enrolled,
        };
  }

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
    /* ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   level: levelFor(lessonsCompleted), */
    totals: {
      paths: rows.length,
      courses: totalCourses,
      lessons: totalLessons,
      /* ⚠ Counted over EVERY published path, not over `visible` — `visible`
         already includes a member's own enrolled-but-unready paths, which would
         make this figure differ per member. What is in production is a fact
         about the catalogue, the same number for everybody. */
      inProduction: paths.filter((p) => !pathHasPlayableLessons(p)).length,
    },
    mine: {
      lessonsCompleted,
      coursesFinished,
      pathsCertified,
      enrolledPaths: rows.filter((r) => r.enrolled).length,
    },
    completedAt: progress.map((p) => p.completed_at.toISOString()),
    /* ⚠ `P2-A4-E615` ruling 6 — one row per LEARN credential, newest first.
       ⚠⚠ `score` comes from the PASSING attempt on that path, so a retake after
       a pass cannot lower the number a member sees. */
    certificates: certs
      .filter((c) => c.learning_path_id)
      .map((c) => {
        const path = rows.find((r) => r.id === c.learning_path_id);
        const best = attempts
          .filter((a) => a.passed && a.learning_path_id === c.learning_path_id)
          .reduce<number | null>((n, a) => (n === null || a.score > n ? a.score : n), null);
        return {
          title: path?.title ?? c.name,
          slug: path?.slug ?? "",
          earnedOn: (c.issued_on ?? c.created_at)?.toISOString() ?? null,
          score: best,
        };
      })
      .sort((a, b) => (b.earnedOn ?? "").localeCompare(a.earnedOn ?? "")),
    teaching,
    paths: rows,
    /*
      ── ⚠⚠⚠ EVERY PATH THE MEMBER IS ENROLLED IN (`P2-A4-E615`, ruling 8) ───

      ⚠⚠ SCOTT, 2026-09-24: **"Every path I'm enrolled in. Enrolling makes a
      card appear, whether or not a lesson has been watched."**

      ⚠⚠⚠ TWO THINGS WERE HIDING PATHS, AND THE BRIEF ONLY NAMED ONE:
        1. ⚠ `.slice(0, 3)` — a member enrolled in a fourth path saw three
           cards and no way to know a fourth existed. **A cap is not a filter;
           it is a filter that does not say so.**
        2. ⚠⚠ `!r.certified` — finishing a path made its card DISAPPEAR, which
           reads as losing the work rather than completing it. A certified path
           is still a path you are in; it now renders with a `Complete` pill.

      ⚠ THE SORT IS UNCHANGED IN SPIRIT — furthest along first — but certified
      paths sort last rather than vanishing, because the card a member wants
      first is the one they can act on.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   inProgress: rows
      //     .filter((r) => r.enrolled && !r.certified)
      //     .sort((a, b) => b.percent - a.percent || b.completed - a.completed)
      //     .slice(0, 3),
    */
    inProgress: rows
      .filter((r) => r.enrolled)
      .sort(
        (a, b) =>
          Number(a.certified) - Number(b.certified) ||
          b.percent - a.percent ||
          b.completed - a.completed
      ),
    continueCard,
    suggestion,
    starter,
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
