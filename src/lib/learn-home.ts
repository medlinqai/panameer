import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { marketplaceVisibleWhere } from "@/lib/access";
import {
  instructorIdsFor,
  loadInstructors,
  resolveInstructors,
  tallyExperts,
  type Instructor,
} from "@/lib/learn-instructors";

/**
 * The learner's view of the catalog (brief_learn_experience WS1).
 *
 * Separate from `learn.ts` (the anonymous read) and `learn-admin.ts` (the
 * authoring read) because this one is the only one that knows who is asking:
 * enrolment and progress are per-user, and every query here is scoped to a
 * session-resolved id. That id is NEVER accepted from the client — the caller
 * passes what the session resolved, so a crafted request can't read another
 * learner's progress.
 */

export type LearnCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  coverImage: string | null;
  lessons: number;
  playable: number;
  /**
   * Everyone who teaches a lesson in this path, most-taught first (WS6).
   * A path can genuinely have several — Advanced Procurement has two, and
   * "2. Overview" has three — so this is a list, not a person.
   */
  instructors: Instructor[];
  enrolled: boolean;
  /** 0–100, of lessons completed. Null when not enrolled. */
  progress: number | null;
  completedLessons: number;
};

/**
 * Every published path, with this learner's enrolment and progress folded in.
 *
 * One pass over the catalog rather than a query per card: 23 paths today, but
 * the counts come from lessons and a per-card round trip would be 23 queries
 * that all read the same three tables.
 */
export async function getLearnHome(userId: string | null): Promise<LearnCard[]> {
  const [paths, enrollments, progress] = await Promise.all([
    prisma.learningPath.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ audience: "asc" }, { group: "asc" }, { sort_order: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        group: true,
        audience: true,
        cover_image: true,
        // The declared lead — consulted only when no lesson names anybody.
        expert_person_id: true,
        courses: {
          select: {
            sections: {
              select: {
                lessons: {
                  select: {
                    id: true,
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
    userId
      ? prisma.learnEnrollment.findMany({
          where: { user_id: userId },
          select: { learning_path_id: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.lessonProgress.findMany({
          where: { user_id: userId },
          select: { lesson_id: true },
        })
      : Promise.resolve([]),
  ]);

  /*
    ONE directory lookup for the whole catalog. Instructors are derived per
    path from its lessons, but across 23 paths that resolves to four people —
    loading them per card would be dozens of round trips for the same rows.
  */
  const directory = await loadInstructors(
    paths.flatMap((p) =>
      instructorIdsFor(
        p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)),
        p.expert_person_id
      )
    )
  );

  const enrolled = new Set(enrollments.map((e) => e.learning_path_id));
  const done = new Set(progress.map((p) => p.lesson_id));

  return paths.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const completed = lessons.filter((l) => done.has(l.id)).length;
    const isEnrolled = enrolled.has(p.id);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      group: p.group,
      audience: p.audience,
      coverImage: p.cover_image,
      lessons: lessons.length,
      playable: lessons.filter(isPlayable).length,
      instructors: resolveInstructors(
        tallyExperts(lessons),
        directory,
        p.expert_person_id
      ),
      enrolled: isEnrolled,
      progress:
        isEnrolled && lessons.length > 0
          ? Math.round((completed / lessons.length) * 100)
          : isEnrolled
            ? 0
            : null,
      completedLessons: completed,
    };
  });
}

/**
 * The domain chips on the hero, driven by the catalog's own `group` values.
 *
 * Ordered by how much is behind them, not alphabetically: the chips are a way
 * in, and a chip leading to two lessons sitting above one leading to a hundred
 * makes the catalog look thinner than it is. Empty groups never appear.
 */
export function groupChips(cards: LearnCard[]): { group: string; paths: number; lessons: number }[] {
  const map = new Map<string, { group: string; paths: number; lessons: number }>();
  for (const c of cards) {
    if (!c.group) continue;
    const row = map.get(c.group) ?? { group: c.group, paths: 0, lessons: 0 };
    row.paths += 1;
    row.lessons += c.lessons;
    map.set(c.group, row);
  }
  return [...map.values()].sort((a, b) => b.lessons - a.lessons || a.group.localeCompare(b.group));
}

// ---------------------------------------------------------------------------
// WS2 — the path landing and course pages
// ---------------------------------------------------------------------------

export type LearnLessonRow = {
  id: string;
  title: string;
  description: string | null;
  runTime: string | null;
  playable: boolean;
  completed: boolean;
};

export type LearnCourseView = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  style: string | null;
  thumbnailUrl: string | null;
  introVideoRef: string | null;
  lessons: number;
  completed: number;
  /** Derived from THIS course's lessons — a path's courses can differ. */
  instructors: Instructor[];
  sections: {
    id: string;
    title: string;
    description: string | null;
    lessons: LearnLessonRow[];
  }[];
};

export type LearnPathView = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  coverImage: string | null;
  introVideoRef: string | null;
  instructors: Instructor[];
  enrolled: boolean;
  lessons: number;
  completed: number;
  progress: number;
  courses: LearnCourseView[];
};

/**
 * One path, its whole outline, and this learner's ticks against it.
 *
 * DRAFT paths are invisible here regardless of who is asking. The admin console
 * has its own preview (brief_learn_admin_authoring WS4) and it goes through the
 * admin-gated read; this is the learner path and it must not become a second
 * way to see unpublished work.
 */
export async function getLearnPath(
  slug: string,
  userId: string | null
): Promise<LearnPathView | null> {
  const path = await prisma.learningPath.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      group: true,
      audience: true,
      cover_image: true,
      intro_video_ref: true,
      // The declared lead — a fallback for a path whose lessons name nobody.
      expert_person_id: true,
      courses: {
        orderBy: [{ sort_order: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          style: true,
          thumbnail_url: true,
          intro_video_ref: true,
          sections: {
            orderBy: [{ sort_order: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              lessons: {
                orderBy: [{ sort_order: "asc" }, { title: "asc" }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  run_time: true,
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

  const allLessonRows = path.courses.flatMap((c) =>
    c.sections.flatMap((s) => s.lessons)
  );

  const [enrollment, progress, directory] = await Promise.all([
    userId
      ? prisma.learnEnrollment.findUnique({
          where: { user_id_learning_path_id: { user_id: userId, learning_path_id: path.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    userId
      ? prisma.lessonProgress.findMany({
          where: { user_id: userId },
          select: { lesson_id: true },
        })
      : Promise.resolve([]),
    loadInstructors(instructorIdsFor(allLessonRows, path.expert_person_id)),
  ]);

  const done = new Set(progress.map((p) => p.lesson_id));

  const courses: LearnCourseView[] = path.courses.map((c) => {
    const sections = c.sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        runTime: l.run_time,
        playable: isPlayable(l),
        completed: done.has(l.id),
      })),
    }));
    const flat = sections.flatMap((s) => s.lessons);
    const courseLessonRows = c.sections.flatMap((s) => s.lessons);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      style: c.style,
      thumbnailUrl: c.thumbnail_url,
      introVideoRef: c.intro_video_ref,
      lessons: flat.length,
      completed: flat.filter((l) => l.completed).length,
      // A course's instructors come from ITS OWN lessons: within one path the
      // courses can be taught by different people, and saying otherwise on a
      // course page would credit the wrong person on the very screen a buyer
      // clicks through to their profile from.
      instructors: resolveInstructors(
        tallyExperts(courseLessonRows),
        directory,
        path.expert_person_id
      ),
      sections,
    };
  });

  const allLessons = courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
  const completed = allLessons.filter((l) => l.completed).length;

  return {
    id: path.id,
    title: path.title,
    slug: path.slug,
    summary: path.summary,
    group: path.group,
    audience: path.audience,
    coverImage: path.cover_image,
    introVideoRef: path.intro_video_ref,
    instructors: resolveInstructors(
      tallyExperts(allLessonRows),
      directory,
      path.expert_person_id
    ),
    enrolled: Boolean(enrollment),
    lessons: allLessons.length,
    completed,
    progress: allLessons.length > 0 ? Math.round((completed / allLessons.length) * 100) : 0,
    courses,
  };
}

// ---------------------------------------------------------------------------
// WS3 — the lesson page
// ---------------------------------------------------------------------------

export type LearnLessonView = {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    runTime: string | null;
    vimeoRef: string | null;
    thumbnailUrl: string | null;
    playable: boolean;
    completed: boolean;
  };
  path: { id: string; title: string; slug: string; enrolled: boolean };
  course: { id: string; title: string; slug: string };
  section: { id: string; title: string };
  /**
   * The ONE instructor for this video. A lesson has a single teacher even when
   * its path has several — this is the level the data was always recorded at,
   * and the level the picture-in-picture has to be right about.
   */
  instructor: Instructor | null;
  /** Flat running order across the whole path, for prev/next and "X of N". */
  position: number;
  total: number;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  /** The lessons of THIS course, for the in-course nav list. */
  courseLessons: (LearnLessonRow & { current: boolean })[];
  pathCompleted: number;
  pathProgress: number;
};

export async function getLearnLesson(
  pathSlug: string,
  lessonId: string,
  userId: string | null
): Promise<LearnLessonView | null> {
  const path = await getLearnPath(pathSlug, userId);
  if (!path) return null;

  // The flat order a learner actually moves through: across sections and across
  // courses, because "next" from the last lesson of a course is the first of
  // the next one, not a dead end.
  const flat = path.courses.flatMap((c) =>
    c.sections.flatMap((s) => s.lessons.map((l) => ({ lesson: l, course: c, section: s })))
  );
  const i = flat.findIndex((x) => x.lesson.id === lessonId);
  if (i < 0) return null;
  const here = flat[i];

  const own = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      vimeo_ref: true,
      thumbnail_url: true,
      expert_person_id: true,
    },
  });

  /*
    This lesson's OWN expert wins. Falling back to the path's lead is only for
    a lesson that names nobody — showing the lead's face over someone else's
    video would be a straightforward misattribution, and it is the PIP, so it
    is the most visible claim on the page.
  */
  let instructor: Instructor | null = null;
  if (own?.expert_person_id) {
    const directory = await loadInstructors([own.expert_person_id]);
    const person = directory.get(own.expert_person_id);
    if (person) instructor = { ...person, lessons: 1 };
  }
  if (!instructor) instructor = path.instructors[0] ?? null;

  return {
    lesson: {
      id: here.lesson.id,
      title: here.lesson.title,
      description: here.lesson.description,
      runTime: here.lesson.runTime,
      vimeoRef: own?.vimeo_ref ?? null,
      thumbnailUrl: own?.thumbnail_url ?? null,
      playable: here.lesson.playable,
      completed: here.lesson.completed,
    },
    path: { id: path.id, title: path.title, slug: path.slug, enrolled: path.enrolled },
    course: { id: here.course.id, title: here.course.title, slug: here.course.slug },
    section: { id: here.section.id, title: here.section.title },
    instructor,
    position: i + 1,
    total: flat.length,
    prev: i > 0 ? { id: flat[i - 1].lesson.id, title: flat[i - 1].lesson.title } : null,
    next:
      i < flat.length - 1
        ? { id: flat[i + 1].lesson.id, title: flat[i + 1].lesson.title }
        : null,
    courseLessons: here.course.sections
      .flatMap((s) => s.lessons)
      .map((l) => ({ ...l, current: l.id === lessonId })),
    pathCompleted: path.completed,
    pathProgress: path.progress,
  };
}

// ---------------------------------------------------------------------------
// WS7 — profile ↔ courses (E137)
// ---------------------------------------------------------------------------

export type TaughtPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  lessons: number;
  /** How many of those lessons this particular person teaches. */
  taughtByThem: number;
  playable: number;
  coverImage: string | null;
};

/**
 * The published paths a person teaches — the "Learn from <name>" section on
 * their marketplace profile (E137).
 *
 * Takes a PERSON id, not a provider-profile id, because `expert_person_id`
 * points at a Person: the schema is explicit that an instructor needn't be a
 * marketplace provider, and going through the profile would silently drop
 * anyone who teaches without selling.
 *
 * PUBLISHED ONLY. A draft path is invisible everywhere else; surfacing it on a
 * public profile would be a hole in the same gate, and the link would 404 for
 * whoever clicked it.
 */
export async function getPathsTaughtBy(personId: string): Promise<TaughtPath[]> {
  const paths = await prisma.learningPath.findMany({
    /*
      TEACHING IS PER-LESSON (WS6, corrected), so a path counts as theirs when
      they teach ANY lesson in it — not only when they are its declared lead.
      The first version matched on expert_person_id alone and would have shown
      Linus none of Advanced Procurement despite his 18 lessons in it, on the
      one surface built to prove he teaches this.

      The declared lead still qualifies, for a path whose lessons name nobody.
    */
    where: {
      status: "PUBLISHED",
      OR: [
        { expert_person_id: personId },
        {
          courses: {
            some: {
              sections: {
                some: { lessons: { some: { expert_person_id: personId } } },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ group: "asc" }, { sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      group: true,
      cover_image: true,
      courses: {
        select: {
          sections: {
            select: {
              lessons: {
                select: {
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

  return paths.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const mine = lessons.filter((l) => l.expert_person_id === personId).length;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      group: p.group,
      lessons: lessons.length,
      // How many of them THIS person teaches. On a co-taught path, claiming all
      // 105 lessons for someone who taught 18 would be the misrepresentation
      // this whole correction exists to remove.
      taughtByThem: mine,
      playable: lessons.filter(isPlayable).length,
      coverImage: p.cover_image,
    };
  });
}

/**
 * Same, addressed by PROVIDER PROFILE id — what the marketplace profile page
 * has in hand. Resolves the Person itself rather than making every caller do
 * the join, and returns [] rather than throwing when the profile is gone.
 */
export async function getPathsTaughtByProfile(
  providerProfileId: string
): Promise<TaughtPath[]> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { person_id: true },
  });
  if (!profile) return [];
  return getPathsTaughtBy(profile.person_id);
}
