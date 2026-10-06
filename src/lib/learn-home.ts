import { prisma } from "@/lib/prisma";
import { shownRunTime } from "@/lib/lesson-duration";
import { LESSON_STATE_LABEL, OTHER_GROUP, isPlayable, lessonState, pathHasPlayableLessons, pathIsOpenTo, playableProgress, playableProgressOfRows } from "@/lib/learn";
import { lessonFace } from "@/lib/learn-faces";
import {
  instructorIdsFor,
  loadInstructors,
  resolveInstructors,
  tallyExperts,
  type Instructor,
} from "@/lib/learn-instructors";

export type LearnCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  coverImage: string | null;
  ready: boolean;
  testReady: boolean;
  lessons: number;
  playable: number;
  instructors: Instructor[];
  enrolled: boolean;
  /** 0–100, of lessons completed. Null when not enrolled. */
  progress: number | null;
  completedLessons: number;
  searchText: string;
};

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
        assessment: { select: { status: true } },
        courses: {
          select: {
            title: true,
            sections: {
              select: {
                lessons: {
                  select: {
                    id: true,
                    title: true,
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
    const prog = playableProgress(lessons, done);
    const isEnrolled = enrolled.has(p.id);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      group: p.group,
      audience: p.audience,
      coverImage: p.cover_image,
      ready: pathIsOpenTo(pathHasPlayableLessons(p), enrolled.has(p.id)),
      testReady: p.assessment?.status === "PUBLISHED",
      lessons: lessons.length,
      playable: lessons.filter(isPlayable).length,
      instructors: resolveInstructors(
        tallyExperts(lessons),
        directory,
        p.expert_person_id
      ),
      enrolled: isEnrolled,
      progress: isEnrolled ? prog.percent : null,
      completedLessons: prog.completed,
      searchText: [
        p.title,
        p.summary ?? "",
        p.group ?? "",
        ...p.courses.map((c) => c.title),
        ...p.courses.flatMap((c) => c.sections.flatMap((sec) => sec.lessons.map((l) => l.title))),
        ...resolveInstructors(tallyExperts(lessons), directory, p.expert_person_id).map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}

export function groupChips(cards: LearnCard[]): { group: string; paths: number; lessons: number }[] {
  const map = new Map<string, { group: string; paths: number; lessons: number }>();
  for (const c of cards) {
    const key = c.group ?? OTHER_GROUP;
    const row = map.get(key) ?? { group: key, paths: 0, lessons: 0 };
    row.paths += 1;
    row.lessons += c.playable;
    map.set(key, row);
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
  stateLabel: string;
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
  ready: boolean;
};

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
        runTime: shownRunTime(l),
        stateLabel: LESSON_STATE_LABEL[lessonState(l)],
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
    progress: playableProgressOfRows(allLessons).percent,
    courses,
    ready: pathIsOpenTo(allLessons.some((l) => l.playable), Boolean(enrollment)),
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
    stateLabel: string;
  };
  path: { id: string; title: string; slug: string; enrolled: boolean };
  course: { id: string; title: string; slug: string };
  section: { id: string; title: string };
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

  const directory = own?.expert_person_id
    ? await loadInstructors([own.expert_person_id])
    : new Map<string, Omit<Instructor, "lessons">>();
  const instructor = lessonFace(
    { expert_person_id: own?.expert_person_id ?? null },
    directory,
    [],
    path.instructors
  ).instructor;

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
      stateLabel: here.lesson.stateLabel,
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

export function teachesPathWhere(personId: string) {
  return {
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
  };
}

export type TakenPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  coverImage: string | null;
  completed: boolean;
  lessons: number;
};

export async function getPathsTakenBy(userId: string | null): Promise<TakenPath[]> {
  if (!userId) return [];
  const rows = await prisma.learnEnrollment.findMany({
    where: { user_id: userId, learningPath: { status: "PUBLISHED" } },
    orderBy: { created_at: "desc" },
    select: {
      learningPath: {
        select: { id: true, title: true, slug: true, group: true, cover_image: true },
      },
    },
  });
  const pathIds = rows.map((r) => r.learningPath.id);
  const [lessonTotals, mine] = await Promise.all([
    prisma.lesson.groupBy({
      by: ["section_id"],
      where: { section: { course: { learning_path_id: { in: pathIds } } } },
      _count: { _all: true },
    }),
    prisma.lessonProgress.findMany({
      where: {
        user_id: userId,
        lesson: { section: { course: { learning_path_id: { in: pathIds } } } },
      },
      select: { lesson: { select: { section: { select: { course: { select: { learning_path_id: true } } } } } } },
    }),
  ]);
  const sections = await prisma.section.findMany({
    where: { id: { in: lessonTotals.map((t) => t.section_id) } },
    select: { id: true, course: { select: { learning_path_id: true } } },
  });
  const pathOfSection = new Map(sections.map((x) => [x.id, x.course.learning_path_id]));
  const total = new Map<string, number>();
  for (const t of lessonTotals) {
    const k = pathOfSection.get(t.section_id);
    if (k) total.set(k, (total.get(k) ?? 0) + t._count._all);
  }
  const done = new Map<string, number>();
  for (const m of mine) {
    const k = m.lesson.section.course.learning_path_id;
    done.set(k, (done.get(k) ?? 0) + 1);
  }
  return rows.map((r) => {
    const t = total.get(r.learningPath.id) ?? 0;
    const completed = t > 0 && (done.get(r.learningPath.id) ?? 0) >= t;
    return {
      id: r.learningPath.id,
      title: r.learningPath.title,
      slug: r.learningPath.slug,
      group: r.learningPath.group,
      coverImage: r.learningPath.cover_image,
      lessons: t,
      completed,
    };
  });
}

export async function getPathsTaughtBy(personId: string): Promise<TaughtPath[]> {
  const paths = await prisma.learningPath.findMany({
    where: {
      status: "PUBLISHED",
      ...teachesPathWhere(personId),
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

// ---------------------------------------------------------------------------
// Provider Home — the Build Skills row (brief_provider_home_page_v2 WS1)
// ---------------------------------------------------------------------------

export async function getHomeLearningPaths(
  userId: string | null,
  limit = 3
): Promise<LearnCard[]> {
  const cards = await getLearnHome(userId);
  if (cards.length === 0) return [];

  const profile = userId
    ? await prisma.providerProfile.findFirst({
        where: { person: { user_id: userId } },
        select: {
          skills: { select: { skill: { select: { name: true } } } },
          specializations: { select: { specialization: { select: { name: true } } } },
        },
      })
    : null;

  const vocab = new Set(
    [
      ...(profile?.skills ?? []).map((s) => s.skill.name),
      ...(profile?.specializations ?? []).map((s) => s.specialization.name),
    ].map((s) => s.toLowerCase())
  );

  const scored = cards.map((c) => {
    const group = (c.group ?? "").toLowerCase();
    let score = 0;
    if (group) {
      for (const term of vocab) {
        if (term === group || group.includes(term) || term.includes(group)) {
          score += 2;
          break;
        }
      }
    }
    // Enrolled paths sink: this row is for discovering something new, and the
    // provider already has "My Learning Paths" for what they started.
    if (c.enrolled) score -= 1;
    return { card: c, score, size: c.lessons };
  });

  scored.sort((a, b) => b.score - a.score || b.size - a.size);

  // One path per domain, so three cards aren't three slices of one subject.
  const picked: LearnCard[] = [];
  const seenGroups = new Set<string>();
  for (const s of scored) {
    const key = s.card.group ?? s.card.id;
    if (seenGroups.has(key)) continue;
    seenGroups.add(key);
    picked.push(s.card);
    if (picked.length === limit) break;
  }
  return picked;
}

export async function getHomeSearchChips(
  userId: string | null,
  limit = 4
): Promise<string[]> {
  if (!userId) return [];
  const profile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: userId } },
    select: {
      specializations: { select: { specialization: { select: { name: true } } } },
      skills: { select: { skill: { select: { name: true } } } },
    },
  });
  if (!profile) return [];

  // Specializations first: they are the broader, more searchable terms, and the
  // mockup's chips read as domains rather than as individual line-item skills.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [
    ...profile.specializations.map((s) => s.specialization.name),
    ...profile.skills.map((s) => s.skill.name),
  ]) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === limit) break;
  }
  return out;
}

export async function viewerTeaches(viewer: { userId: string } | null): Promise<boolean> {
  if (!viewer) return false;
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return false;
  const n = await prisma.learningPath.count({ where: teachesPathWhere(person.id) });
  return n > 0;
}

export type StarterVerdict =
  | { kind: "none" }
  | { kind: "one"; path: LearnCard }
  | { kind: "ambiguous"; ids: string[] };

export type StarterDecision =
  | { kind: "none" }
  | { kind: "one"; id: string }
  | { kind: "ambiguous"; ids: string[] };

export function decideStarter(marked: { id: string }[]): StarterDecision {
  if (marked.length === 0) return { kind: "none" };
  if (marked.length > 1) return { kind: "ambiguous", ids: marked.map((m) => m.id) };
  return { kind: "one", id: marked[0].id };
}

export async function starterPath(userId: string | null): Promise<StarterVerdict> {
  const marked = await prisma.learningPath.findMany({
    where: { is_starter: true, status: "PUBLISHED" },
    select: { id: true },
  });
  const decided = decideStarter(marked);
  if (decided.kind === "none") return { kind: "none" };
  if (decided.kind === "ambiguous") {
    console.error(
      `[learn] ⚠ ${decided.ids.length} paths are marked is_starter — refusing to choose. ids: ${decided.ids.join(", ")}`
    );
    return decided;
  }
  // THE CARD COMES FROM `getLearnHome`, NOT FROM A SECOND QUERY .
  const cards = await getLearnHome(userId);
  // what `decideStarter` has already decided, which is how the two drift.
  const card = cards.find((c) => c.id === decided.id);
  // A flagged path `getLearnHome` does not return is the unpublished case the
  return card ? { kind: "one", path: card } : { kind: "none" };
}
