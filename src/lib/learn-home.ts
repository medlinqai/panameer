import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { marketplaceVisibleWhere } from "@/lib/access";

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
  /** The single instructor who owns the whole path (WS6). */
  instructor: {
    id: string;
    name: string;
    photoUrl: string | null;
    /** Set when they have a public provider profile to link to. */
    profileSlug: string | null;
  } | null;
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
        expert: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            photo_url: true,
            providerProfile: { select: { id: true } },
          },
        },
        courses: {
          select: {
            sections: {
              select: {
                lessons: { select: { id: true, vimeo_ref: true, production_status: true } },
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
    Which instructors have a profile the marketplace would show? Resolved with
    the SAME predicate access.ts uses for listings rather than a hand-rolled
    check, because the two drifting apart is exactly how a listing ends up
    linking to a page that then refuses to render.
  */
  const expertProfileIds = paths
    .map((p) => p.expert?.providerProfile?.id)
    .filter((x): x is string => Boolean(x));
  const visibleProfiles = new Set(
    expertProfileIds.length > 0
      ? (
          await prisma.providerProfile.findMany({
            where: { id: { in: expertProfileIds }, ...marketplaceVisibleWhere() },
            select: { id: true },
          })
        ).map((r) => r.id)
      : []
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
      instructor: p.expert
        ? {
            id: p.expert.id,
            name:
              `${p.expert.first_name ?? ""} ${p.expert.last_name ?? ""}`.trim() ||
              "Panameer",
            photoUrl: p.expert.photo_url,
            // Only link to a profile the marketplace would actually show. A
            // course pointing at a hidden profile is a dead link, which is
            // worse than no link at all (WS7). Visibility is DERIVED — there is
            // no publish flag — so the id is present here only when the same
            // predicate access.ts uses for listings matched it.
            profileSlug: visibleProfiles.has(p.expert.providerProfile?.id ?? "")
              ? p.expert.providerProfile!.id
              : null,
          }
        : null,
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
  instructor: LearnCard["instructor"];
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
      expert: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          photo_url: true,
          providerProfile: { select: { id: true } },
        },
      },
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
                },
              },
            },
          },
        },
      },
    },
  });
  if (!path) return null;

  const [enrollment, progress, visibleProfile] = await Promise.all([
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
    path.expert?.providerProfile?.id
      ? prisma.providerProfile.findFirst({
          where: { id: path.expert.providerProfile.id, ...marketplaceVisibleWhere() },
          select: { id: true },
        })
      : Promise.resolve(null),
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
    instructor: path.expert
      ? {
          id: path.expert.id,
          name:
            `${path.expert.first_name ?? ""} ${path.expert.last_name ?? ""}`.trim() ||
            "Panameer",
          photoUrl: path.expert.photo_url,
          profileSlug: visibleProfile?.id ?? null,
        }
      : null,
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
  /** The instructor for this lesson: its own if set, otherwise the path's. */
  instructor: LearnCard["instructor"];
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
      expert: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          photo_url: true,
          providerProfile: { select: { id: true } },
        },
      },
    },
  });

  let instructor = path.instructor;
  if (own?.expert) {
    const visible = own.expert.providerProfile
      ? await prisma.providerProfile.findFirst({
          where: { id: own.expert.providerProfile.id, ...marketplaceVisibleWhere() },
          select: { id: true },
        })
      : null;
    instructor = {
      id: own.expert.id,
      name:
        `${own.expert.first_name ?? ""} ${own.expert.last_name ?? ""}`.trim() || "Panameer",
      photoUrl: own.expert.photo_url,
      profileSlug: visible?.id ?? null,
    };
  }

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
