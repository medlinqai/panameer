import { prisma } from "@/lib/prisma";
import { ensurePathBoard } from "@/lib/forums";
import { PLAYABLE_STATUSES, isPlayable, urlMissing as urlMissingRow } from "@/lib/learn";

export class LearnAdminError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "CONFLICT" | "BLOCKED" | "INVALID"
  ) {
    super(message);
    this.name = "LearnAdminError";
  }
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniquePathSlug(
  base: string,
  exceptId?: string
): Promise<string> {
  const root = slugify(base) || "path";
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await prisma.learningPath.findFirst({
      where: { slug: candidate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new LearnAdminError("Could not find a free slug for that title.", "CONFLICT");
}

/** Same, scoped to a path — Course slugs are unique per learning path. */
export async function uniqueCourseSlug(
  learningPathId: string,
  base: string,
  exceptId?: string
): Promise<string> {
  const root = slugify(base) || "course";
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await prisma.course.findFirst({
      where: {
        learning_path_id: learningPathId,
        slug: candidate,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new LearnAdminError("Could not find a free slug for that title.", "CONFLICT");
}

export type LearnLibraryStats = {
  paths: number;
  publishedPaths: number;
  courses: number;
  sections: number;
  lessons: number;
  playable: number;
  /** Lessons whose production status SAYS a URL was added but which have no */
  urlMissing: number;
};

export async function getLearnStats(): Promise<LearnLibraryStats> {
  const [paths, publishedPaths, courses, sections, lessons, urlMissing, withRef] =
    await Promise.all([
      prisma.learningPath.count(),
      prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
      prisma.course.count(),
      prisma.section.count(),
      prisma.lesson.count(),
      prisma.lesson.count({
        where: {
          production_status: { in: [...PLAYABLE_STATUSES] },
          OR: [{ vimeo_ref: null }, { vimeo_ref: "" }],
        },
      }),
      prisma.lesson.count({
        where: {
          production_status: { in: [...PLAYABLE_STATUSES] },
          NOT: [{ vimeo_ref: null }, { vimeo_ref: "" }],
        },
      }),
    ]);

  return {
    paths,
    publishedPaths,
    courses,
    sections,
    lessons,
    playable: withRef,
    urlMissing,
  };
}

export type AdminPathRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  audience: string;
  group: string | null;
  status: string;
  coverImage: string | null;
  expert: string | null;
  expertPersonId: string | null;
  isCustom: boolean;
  counts: { courses: number; lessons: number; withUrl: number };
};

/** Every path with the rollups the list view sorts and filters on. */
export async function listPaths(): Promise<AdminPathRow[]> {
  const rows = await prisma.learningPath.findMany({
    orderBy: [{ audience: "asc" }, { group: "asc" }, { sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      audience: true,
      group: true,
      status: true,
      cover_image: true,
      is_custom: true,
      expert_person_id: true,
      expert: { select: { first_name: true, last_name: true } },
      courses: {
        select: {
          id: true,
          sections: {
            select: {
              lessons: { select: { vimeo_ref: true, production_status: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      audience: p.audience,
      group: p.group,
      status: p.status,
      coverImage: p.cover_image,
      expertPersonId: p.expert_person_id,
      expert: p.expert
        ? `${p.expert.first_name ?? ""} ${p.expert.last_name ?? ""}`.trim() || null
        : null,
      isCustom: p.is_custom,
      counts: {
        courses: p.courses.length,
        lessons: lessons.length,
        withUrl: lessons.filter(isPlayable).length,
      },
    };
  });
}

/** The distinct `group` values already in use, for the create/edit suggestions. */
export async function listGroups(): Promise<string[]> {
  const rows = await prisma.learningPath.findMany({
    where: { group: { not: null } },
    select: { group: true },
    distinct: ["group"],
    orderBy: { group: "asc" },
  });
  return rows.map((r) => r.group!).filter(Boolean);
}

/** People who can front a path or a lesson. */
export async function listExperts(query?: string): Promise<
  { id: string; name: string; email: string | null; photoUrl: string | null }[]
> {
  const q = query?.trim();
  const rows = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { first_name: { contains: q, mode: "insensitive" } },
            { last_name: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
    take: 50,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      /* `title` — the profile's title lives on the PERSON since `E595` WS-B. */
      title: true,
      photo_url: true,
      user: { select: { email: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)",
    email: p.user?.email ?? null,
    photoUrl: p.photo_url,
  }));
}

// ---------------------------------------------------------------------------
// WS1 — Learning Path CRUD
// ---------------------------------------------------------------------------

export type PathInput = {
  title: string;
  slug?: string | null;
  summary?: string | null;
  audience: string;
  group?: string | null;
  expertPersonId?: string | null;
  coverImage?: string | null;
  introVideoRef?: string | null;
  status?: string;
};

/** Every write here sets `is_custom: true`. */
/** THE FORUM IS CREATED WITH THE PATH, IN THE SAME TRANSACTION . */
export async function createPath(input: PathInput) {
  const slug = await uniquePathSlug(input.slug?.trim() || input.title);
  return prisma.$transaction(async (tx) => {
    const path = await tx.learningPath.create({
      data: {
        title: input.title.trim(),
        slug,
        summary: input.summary?.trim() || null,
        audience: input.audience as never,
        group: input.group?.trim() || null,
        expert_person_id: input.expertPersonId || null,
        cover_image: input.coverImage?.trim() || null,
        intro_video_ref: input.introVideoRef?.trim() || null,
        status: (input.status ?? "DRAFT") as never,
        is_custom: true,
      },
      select: { id: true, slug: true, title: true, summary: true },
    });
    // THE SAME IDEMPOTENT HELPER the seed and the backfill call — one shape
    await ensurePathBoard(tx, path);
    return { id: path.id, slug: path.slug };
  });
}

export async function updatePath(id: string, input: PathInput) {
  const existing = await prisma.learningPath.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  // A SLUG ONLY CHANGES WHEN SOMEONE ASKS IT TO.
  const slug =
    input.slug?.trim()
      ? slugify(input.slug) === existing.slug
        ? existing.slug
        : await uniquePathSlug(input.slug, id)
      : existing.slug;

  return prisma.learningPath.update({
    where: { id },
    data: {
      title: input.title.trim(),
      slug,
      summary: input.summary?.trim() || null,
      audience: input.audience as never,
      group: input.group?.trim() || null,
      expert_person_id: input.expertPersonId || null,
      cover_image: input.coverImage?.trim() || null,
      intro_video_ref: input.introVideoRef?.trim() || null,
      ...(input.status ? { status: input.status as never } : {}),
      is_custom: true,
    },
    select: { id: true, slug: true },
  });
}

/** Delete a path — BLOCKED while it still has courses. */
export async function deletePath(id: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      /* `forumBoards` ADDED BY `P1-J3-E383`. See the threads check below. */
      _count: { select: { courses: true, enrollments: true } },
      forumBoards: { select: { _count: { select: { threads: true } } } },
    },
  });
  if (!path) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  if (path._count.enrollments > 0) {
    throw new LearnAdminError(
      `${path._count.enrollments} learner${path._count.enrollments === 1 ? " is" : "s are"} enrolled in this path. Unpublish it instead of deleting it — deleting would destroy their progress.`,
      "BLOCKED"
    );
  }
  if (path._count.courses > 0) {
    throw new LearnAdminError(
      `This path still has ${path._count.courses} course${path._count.courses === 1 ? "" : "s"}. Delete those first — deleting the path would take every section and lesson under it with it, and there's no undo.`,
      "BLOCKED"
    );
  }

  const threads = path.forumBoards.reduce((n, b) => n + b._count.threads, 0);
  if (threads > 0) {
    throw new LearnAdminError(
      `This path's forum has ${threads} thread${threads === 1 ? "" : "s"}. Delete those first — deleting the path would take the group and every question in it with it, and there's no undo.`,
      "BLOCKED"
    );
  }

  await prisma.learningPath.delete({ where: { id } });
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// WS2 — the nested structure (Course → Section → Lesson)
// ---------------------------------------------------------------------------

export async function getPathTree(id: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      audience: true,
      group: true,
      status: true,
      cover_image: true,
      intro_video_ref: true,
      expert_person_id: true,
      expert: { select: { first_name: true, last_name: true } },
      courses: {
        orderBy: [{ sort_order: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          style: true,
          sort_order: true,
          thumbnail_url: true,
          intro_video_ref: true,
          sections: {
            orderBy: [{ sort_order: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              thumbnail_url: true,
              sort_order: true,
              lessons: {
                orderBy: [{ sort_order: "asc" }, { title: "asc" }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  run_time: true,
                  vimeo_ref: true,
                  thumbnail_url: true,
                  production_status: true,
                  sort_order: true,
                  expert_person_id: true,
                  expert: { select: { first_name: true, last_name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!path) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  const name = (e: { first_name: string | null; last_name: string | null } | null) =>
    e ? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || null : null;

  return {
    id: path.id,
    title: path.title,
    slug: path.slug,
    summary: path.summary,
    audience: path.audience,
    group: path.group,
    status: path.status,
    coverImage: path.cover_image,
    introVideoRef: path.intro_video_ref,
    expertPersonId: path.expert_person_id,
    expert: name(path.expert),
    courses: path.courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      style: c.style,
      sortOrder: c.sort_order,
      thumbnailUrl: c.thumbnail_url,
      introVideoRef: c.intro_video_ref,
      sections: c.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        thumbnailUrl: s.thumbnail_url,
        sortOrder: s.sort_order,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          runTime: l.run_time,
          vimeoRef: l.vimeo_ref,
          thumbnailUrl: l.thumbnail_url,
          productionStatus: l.production_status,
          sortOrder: l.sort_order,
          expertPersonId: l.expert_person_id,
          expert: name(l.expert),
        })),
      })),
    })),
  };
}

export type PathTree = Awaited<ReturnType<typeof getPathTree>>;

/** Next free ordinal in a list, so a new child lands at the end. */
async function nextOrder(
  kind: "course" | "section" | "lesson",
  parentId: string
): Promise<number> {
  const last =
    kind === "course"
      ? await prisma.course.findFirst({
          where: { learning_path_id: parentId },
          orderBy: { sort_order: "desc" },
          select: { sort_order: true },
        })
      : kind === "section"
        ? await prisma.section.findFirst({
            where: { course_id: parentId },
            orderBy: { sort_order: "desc" },
            select: { sort_order: true },
          })
        : await prisma.lesson.findFirst({
            where: { section_id: parentId },
            orderBy: { sort_order: "desc" },
            select: { sort_order: true },
          });
  return (last?.sort_order ?? -1) + 1;
}

export type CourseInput = {
  title: string;
  slug?: string | null;
  summary?: string | null;
  style?: string | null;
  thumbnailUrl?: string | null;
  introVideoRef?: string | null;
};

export async function createCourse(learningPathId: string, input: CourseInput) {
  const path = await prisma.learningPath.findUnique({
    where: { id: learningPathId },
    select: { id: true },
  });
  if (!path) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  return prisma.course.create({
    data: {
      learning_path_id: learningPathId,
      title: input.title.trim(),
      slug: await uniqueCourseSlug(learningPathId, input.slug?.trim() || input.title),
      summary: input.summary?.trim() || null,
      style: (input.style || null) as never,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      intro_video_ref: input.introVideoRef?.trim() || null,
      sort_order: await nextOrder("course", learningPathId),
      is_custom: true,
    },
    select: { id: true },
  });
}

export async function updateCourse(id: string, input: CourseInput) {
  const existing = await prisma.course.findUnique({
    where: { id },
    select: { id: true, slug: true, learning_path_id: true },
  });
  if (!existing) throw new LearnAdminError("That course no longer exists.", "NOT_FOUND");

  // Same rule as updatePath: an omitted slug means leave the URL alone.
  const slug =
    input.slug?.trim()
      ? slugify(input.slug) === existing.slug
        ? existing.slug
        : await uniqueCourseSlug(existing.learning_path_id, input.slug, id)
      : existing.slug;

  return prisma.course.update({
    where: { id },
    data: {
      title: input.title.trim(),
      slug,
      summary: input.summary?.trim() || null,
      style: (input.style || null) as never,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      intro_video_ref: input.introVideoRef?.trim() || null,
      is_custom: true,
    },
    select: { id: true },
  });
}

export type SectionInput = {
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
};

/** (course, title) is a Section's natural key — the XLS carries no ids, so that */
export async function createSection(courseId: string, input: SectionInput) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) throw new LearnAdminError("That course no longer exists.", "NOT_FOUND");

  const clash = await prisma.section.findFirst({
    where: { course_id: courseId, title: input.title.trim() },
    select: { id: true },
  });
  if (clash) {
    throw new LearnAdminError(
      "This course already has a section with that title. Section titles have to be unique inside a course.",
      "CONFLICT"
    );
  }

  return prisma.section.create({
    data: {
      course_id: courseId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      sort_order: await nextOrder("section", courseId),
      is_custom: true,
    },
    select: { id: true },
  });
}

export async function updateSection(id: string, input: SectionInput) {
  const existing = await prisma.section.findUnique({
    where: { id },
    select: { id: true, course_id: true },
  });
  if (!existing) throw new LearnAdminError("That section no longer exists.", "NOT_FOUND");

  const clash = await prisma.section.findFirst({
    where: { course_id: existing.course_id, title: input.title.trim(), NOT: { id } },
    select: { id: true },
  });
  if (clash) {
    throw new LearnAdminError(
      "Another section in this course already has that title.",
      "CONFLICT"
    );
  }

  return prisma.section.update({
    where: { id },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      is_custom: true,
    },
    select: { id: true },
  });
}

/** Deleting a course or a section takes its children with it (the FK cascades) */
export async function deleteCourse(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, _count: { select: { sections: true } } },
  });
  if (!course) throw new LearnAdminError("That course no longer exists.", "NOT_FOUND");
  if (course._count.sections > 0) {
    throw new LearnAdminError(
      `This course still has ${course._count.sections} section${course._count.sections === 1 ? "" : "s"}. Delete those first — there's no undo.`,
      "BLOCKED"
    );
  }
  await prisma.course.delete({ where: { id } });
  return { ok: true as const };
}

export async function deleteSection(id: string) {
  const section = await prisma.section.findUnique({
    where: { id },
    select: { id: true, _count: { select: { lessons: true } } },
  });
  if (!section) throw new LearnAdminError("That section no longer exists.", "NOT_FOUND");
  if (section._count.lessons > 0) {
    throw new LearnAdminError(
      `This section still has ${section._count.lessons} lesson${section._count.lessons === 1 ? "" : "s"}. Delete those first — there's no undo.`,
      "BLOCKED"
    );
  }
  await prisma.section.delete({ where: { id } });
  return { ok: true as const };
}

export async function deleteLesson(id: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, title: true, _count: { select: { progress: true } } },
  });
  if (!lesson) throw new LearnAdminError("That lesson no longer exists.", "NOT_FOUND");
  if (lesson._count.progress > 0) {
    throw new LearnAdminError(
      `${lesson._count.progress} learner${lesson._count.progress === 1 ? " has" : "s have"} completed this lesson. Deleting it would erase that from their record.`,
      "BLOCKED"
    );
  }
  await prisma.lesson.delete({ where: { id } });
  return { ok: true as const };
}

/** Move one child up or down among its siblings. */
export async function reorder(
  kind: "course" | "section" | "lesson",
  id: string,
  direction: "up" | "down"
) {
  const siblings = await siblingsOf(kind, id);
  const i = siblings.findIndex((s) => s.id === id);
  if (i < 0) throw new LearnAdminError("That item no longer exists.", "NOT_FOUND");

  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return { ok: true as const, moved: false };

  const order = [...siblings];
  [order[i], order[j]] = [order[j], order[i]];

  const table =
    kind === "course" ? prisma.course : kind === "section" ? prisma.section : prisma.lesson;
  await prisma.$transaction(
    order.map((row, index) =>
      // @ts-expect-error — the three delegates share this shape but not a type
      table.update({ where: { id: row.id }, data: { sort_order: index } })
    )
  );
  return { ok: true as const, moved: true };
}

async function siblingsOf(
  kind: "course" | "section" | "lesson",
  id: string
): Promise<{ id: string }[]> {
  if (kind === "course") {
    const row = await prisma.course.findUnique({
      where: { id },
      select: { learning_path_id: true },
    });
    if (!row) return [];
    return prisma.course.findMany({
      where: { learning_path_id: row.learning_path_id },
      orderBy: [{ sort_order: "asc" }, { title: "asc" }],
      select: { id: true },
    });
  }
  if (kind === "section") {
    const row = await prisma.section.findUnique({
      where: { id },
      select: { course_id: true },
    });
    if (!row) return [];
    return prisma.section.findMany({
      where: { course_id: row.course_id },
      orderBy: [{ sort_order: "asc" }, { title: "asc" }],
      select: { id: true },
    });
  }
  const row = await prisma.lesson.findUnique({
    where: { id },
    select: { section_id: true },
  });
  if (!row) return [];
  return prisma.lesson.findMany({
    where: { section_id: row.section_id },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: { id: true },
  });
}

// ---------------------------------------------------------------------------
// WS3 — the Lesson editor and the video URL
// ---------------------------------------------------------------------------

export type LessonInput = {
  title: string;
  description?: string | null;
  runTime?: string | null;
  vimeoRef?: string | null;
  thumbnailUrl?: string | null;
  productionStatus?: string | null;
  expertPersonId?: string | null;
};

/** Normalise a pasted Vimeo reference on the way IN. */
export function normalizeVimeoRef(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;
  // IT MUST ACCEPT ITS OWN OUTPUT, and it did not.
  const bare = /^(\d+)\/([0-9a-z]+)$/i.exec(raw);
  if (bare) return `${bare[1]}/${bare[2]}`;
  const m = /vimeo\.com\/(?:channels\/[^/]+\/|video\/)?(\d+)(?:[/?]([0-9a-z]+))?/i.exec(raw);
  if (!m) return null;
  // Keep the unlisted-video hash: without it a private video 404s in the player.
  return m[2] ? `${m[1]}/${m[2]}` : m[1];
}

export async function updateLesson(id: string, input: LessonInput) {
  const existing = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, section_id: true },
  });
  if (!existing) throw new LearnAdminError("That lesson no longer exists.", "NOT_FOUND");

  const clash = await prisma.lesson.findFirst({
    where: { section_id: existing.section_id, title: input.title.trim(), NOT: { id } },
    select: { id: true },
  });
  if (clash) {
    throw new LearnAdminError(
      "Another lesson in this section already has that title.",
      "CONFLICT"
    );
  }

  let vimeo: string | null = null;
  if (input.vimeoRef?.trim()) {
    vimeo = normalizeVimeoRef(input.vimeoRef);
    if (!vimeo) {
      throw new LearnAdminError(
        "That isn't a Vimeo link or id we can play. Paste the video's URL from Vimeo, or its numeric id.",
        "INVALID"
      );
    }
  }

  return prisma.lesson.update({
    where: { id },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      run_time: input.runTime?.trim() || null,
      vimeo_ref: vimeo,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      ...(input.productionStatus
        ? { production_status: input.productionStatus as never }
        : {}),
      expert_person_id: input.expertPersonId || null,
      is_custom: true,
    },
    select: { id: true },
  });
}

export async function createLesson(sectionId: string, input: LessonInput) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) throw new LearnAdminError("That section no longer exists.", "NOT_FOUND");

  const clash = await prisma.lesson.findFirst({
    where: { section_id: sectionId, title: input.title.trim() },
    select: { id: true },
  });
  if (clash) {
    throw new LearnAdminError(
      "This section already has a lesson with that title. Lesson titles have to be unique inside a section.",
      "CONFLICT"
    );
  }

  let vimeo: string | null = null;
  if (input.vimeoRef?.trim()) {
    vimeo = normalizeVimeoRef(input.vimeoRef);
    if (!vimeo) {
      throw new LearnAdminError(
        "That isn't a Vimeo link or id we can play.",
        "INVALID"
      );
    }
  }

  return prisma.lesson.create({
    data: {
      section_id: sectionId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      run_time: input.runTime?.trim() || null,
      vimeo_ref: vimeo,
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      production_status: (input.productionStatus ?? "IN_CONCEPT") as never,
      expert_person_id: input.expertPersonId || null,
      sort_order: await nextOrder("lesson", sectionId),
      is_custom: true,
    },
    select: { id: true },
  });
}

/** Set just the URL — the fast path for the per-section table, where an admin */
export async function setLessonUrl(id: string, rawUrl: string | null) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, production_status: true },
  });
  if (!lesson) throw new LearnAdminError("That lesson no longer exists.", "NOT_FOUND");

  if (!rawUrl || !rawUrl.trim()) {
    // Clearing the URL rolls the ladder back off URL_ADDED_TO_LESSON.
    const rollback = lesson.production_status === "URL_ADDED_TO_LESSON";
    await prisma.lesson.update({
      where: { id },
      data: {
        vimeo_ref: null,
        ...(rollback ? { production_status: "LOADED_TO_STREAMING" as never } : {}),
        is_custom: true,
      },
    });
    return { ok: true as const, vimeoRef: null, statusChanged: rollback };
  }

  const vimeo = normalizeVimeoRef(rawUrl);
  if (!vimeo) {
    throw new LearnAdminError(
      "That isn't a Vimeo link or id we can play. Paste the video's URL from Vimeo, or its numeric id.",
      "INVALID"
    );
  }

  const alreadyClaims = (
    (PLAYABLE_STATUSES as readonly string[])
  ).includes(lesson.production_status);

  await prisma.lesson.update({
    where: { id },
    data: {
      vimeo_ref: vimeo,
      ...(alreadyClaims ? {} : { production_status: "URL_ADDED_TO_LESSON" as never }),
      is_custom: true,
    },
  });
  return { ok: true as const, vimeoRef: vimeo, statusChanged: !alreadyClaims };
}

// ---------------------------------------------------------------------------
// WS4 — publish controls
// ---------------------------------------------------------------------------

export type PublishReadiness = {
  canPublish: boolean;
  /** Hard reasons publishing is refused. */
  blockers: string[];
  /** Publishing is allowed, but the admin should know these first. */
  warnings: string[];
  lessons: number;
  playable: number;
  urlMissing: number;
};

/** Can this path go live, and what will a learner find if it does? */
export async function getPublishReadiness(id: string): Promise<PublishReadiness> {
  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      courses: {
        select: {
          id: true,
          title: true,
          sections: {
            select: {
              id: true,
              title: true,
              lessons: { select: { vimeo_ref: true, production_status: true } },
            },
          },
        },
      },
    },
  });
  if (!path) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  const blockers: string[] = [];
  const warnings: string[] = [];

  const lessons = path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
  const playable = lessons.filter(isPlayable).length;
  // — the extracted amber predicate, not a fifth copy of it.
  const urlMissing = lessons.filter(urlMissingRow).length;

  if (path.courses.length === 0) {
    blockers.push("This path has no courses. Add at least one course, section and lesson.");
  } else {
    const emptyCourses = path.courses.filter((c) => c.sections.length === 0);
    const emptySections = path.courses
      .flatMap((c) => c.sections)
      .filter((s) => s.lessons.length === 0);

    if (lessons.length === 0) {
      blockers.push(
        "This path has no lessons. A learner who clicked it would find an empty page."
      );
    }
    if (emptyCourses.length > 0) {
      warnings.push(
        `${emptyCourses.length} course${emptyCourses.length === 1 ? "" : "s"} have no sections and will render empty.`
      );
    }
    if (emptySections.length > 0) {
      warnings.push(
        `${emptySections.length} section${emptySections.length === 1 ? "" : "s"} have no lessons.`
      );
    }
  }

  if (lessons.length > 0 && playable === 0) {
    warnings.push(
      lessons.length === 1
        // CORRECTED 2026-09-25 — THIS ADMIN GUIDANCE DESCRIBED A LEARNER
        ? `The only lesson here has no video yet, so it will not be playable. You can still publish — the catalog says "0 ready to watch" rather than pretending otherwise.`
        : `None of the ${lessons.length} lessons have a video yet, so none will be playable. You can still publish — the catalog says "0 ready to watch" rather than pretending otherwise.`
    );
  }
  if (urlMissing > 0) {
    warnings.push(
      `${urlMissing} lesson${urlMissing === 1 ? " is" : "s are"} marked as having a URL but ${urlMissing === 1 ? "doesn't" : "don't"} have one.`
    );
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
    warnings,
    lessons: lessons.length,
    playable,
    urlMissing,
  };
}

/** Flip a path's status. */
export async function setPathStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  if (status === "PUBLISHED") {
    const readiness = await getPublishReadiness(id);
    if (!readiness.canPublish) {
      throw new LearnAdminError(readiness.blockers.join(" "), "BLOCKED");
    }
  }
  const updated = await prisma.learningPath.update({
    where: { id },
    data: { status, is_custom: true },
    select: { id: true, status: true, slug: true },
  });
  return updated;
}
