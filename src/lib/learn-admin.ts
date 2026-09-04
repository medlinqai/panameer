import { prisma } from "@/lib/prisma";
/* ⚠ `P1-J3-E383` — one idempotent board helper, shared with the seed and the
   backfill so the three cannot drift. */
import { ensurePathBoard } from "@/lib/forums";
import { isPlayable } from "@/lib/learn";

/**
 * Learn authoring queries + mutations (brief_learn_admin_authoring).
 *
 * ADMIN-ONLY by construction: nothing here takes a Viewer, because every caller
 * is behind `guardApi("canAdminister")` and there is no per-row ownership to
 * scope to — the Learn catalog belongs to the platform, not to a tenant. That
 * makes the guard the ONLY thing standing between these writes and the public
 * curriculum, which is why it lives at the route boundary and every route has it.
 *
 * Separate from `learn.ts` on purpose. That file is the public read path and
 * filters to `status: PUBLISHED` everywhere; this one must see DRAFT rows or the
 * admin could never work on anything unpublished. Keeping them apart means the
 * public filter can never be accidentally dropped by an admin-driven change.
 */

export class LearnAdminError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "CONFLICT" | "BLOCKED" | "INVALID"
  ) {
    super(message);
    this.name = "LearnAdminError";
  }
}

/**
 * Title → URL slug. Deliberately conservative: strip accents, keep [a-z0-9-],
 * collapse runs. The admin can override it, so this only has to be a good
 * starting point, not a perfect one.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * A slug that isn't taken yet, by appending -2, -3, … as needed.
 *
 * `exceptId` lets an edit keep its own slug: without it, saving a path without
 * changing its title would collide with itself and silently become "foo-2".
 */
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
  /**
   * Lessons whose production status SAYS a URL was added but which have no
   * `vimeo_ref`. This is the number the whole brief exists to drive to zero —
   * the gap the spreadsheet left. See `learn.ts` for why the two disagree.
   */
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
          production_status: { in: ["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] },
          OR: [{ vimeo_ref: null }, { vimeo_ref: "" }],
        },
      }),
      prisma.lesson.count({
        where: {
          production_status: { in: ["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] },
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

/**
 * People who can front a path or a lesson.
 *
 * Deliberately NOT limited to providers: the schema comment on
 * `expert_person_id` is explicit that an expert need not have a provider
 * profile, so restricting the picker here would contradict the model. Ordered
 * by name and capped, since this feeds a searchable select rather than a page.
 */
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

/**
 * Every write here sets `is_custom: true`.
 *
 * That flag is the XLS re-run shield the WS1 seed established: a re-import is
 * authoritative only for rows it created, and anything a human touched is left
 * alone. An admin editing a path in this console IS that human touch, so the
 * flag has to be set on the way out of every mutation — otherwise the next
 * catalog import silently overwrites the work this console exists to do.
 */
/**
 * ⚠⚠ THE FORUM IS CREATED WITH THE PATH, IN THE SAME TRANSACTION (`P1-J3-E383`).
 *
 * SCOTT, 2026-09-04: *"every learning path should have a forum."* and *"this
 * needs to be baked into the LP creation."*
 *
 * ⚠ A PATH WITHOUT ITS FORUM MUST NOT BE A STATE THE DATABASE CAN BE IN, which
 * is why this is `$transaction` and not two awaits. A create that half-succeeded
 * would leave a path whose forum silently never appears, and nothing would ever
 * notice — `check:forums` asserts every path has exactly one board across the
 * LIVE library, so a gap becomes a red gate rather than a mystery.
 */
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
    /* ⚠ THE SAME IDEMPOTENT HELPER the seed and the backfill call — one shape,
       three callers, so they cannot drift. Title and description are the PATH'S
       OWN; no copy was written here. */
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

  /*
    A SLUG ONLY CHANGES WHEN SOMEONE ASKS IT TO.

    This previously fell back to the title when `slug` was absent, and then
    rewrote the stored slug whenever slugify(title) didn't match it. The catalog
    importer builds slugs with an audience/group prefix — "1. Background" is
    stored as "beginners-foundational-learning-paths-1-background" — so that
    condition was true for EVERY imported path, and any edit that omitted the
    slug field silently changed a live public URL. Assigning an instructor broke
    /learn/<path> for everyone holding the old link.

    Found by walking into a 404 in brief_learn_experience after an expert edit,
    not by reading the code. Now: an omitted slug means "leave it alone", and a
    supplied one is honoured. New paths still derive theirs from the title,
    where there is no existing URL to protect.
  */
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

/**
 * Delete a path — BLOCKED while it still has courses.
 *
 * The brief asks for "cascade or block; pick block + explain", and block is
 * right: the FK is `onDelete: Cascade`, so a single mis-click on a 100-lesson
 * path would take the whole subtree with it and there is no undo in this
 * console. Making the admin empty it first turns an irreversible accident into
 * a deliberate sequence of steps. Enrollments are checked for the same reason,
 * and matter more — those are learners' records, not ours.
 */
export async function deletePath(id: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      /* ⚠ `forumBoards` ADDED BY `P1-J3-E383`. See the threads check below. */
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

  /*
    ⚠⚠ ONE MORE COUNT, IN THE EXISTING VOICE — NOT A SECOND GUARD (`P1-J3-E383`).

    The two checks above already stop almost everything: a path anyone enrolled
    in cannot be deleted, and posting requires enrolment. ⚠ BUT AN INSTRUCTOR CAN
    POST WITHOUT ENROLLING — `canAccessPathForum` grants access by enrolment OR
    teaching — so a path with an instructor's welcome thread and ZERO enrolments
    passes both checks, and the board's `onDelete: Cascade` takes that thread
    with it.

    ⚠ THE FK WAS NOT SWITCHED TO `Restrict`, and the two messages above were not
    touched. A guard can say WHY; a database error cannot.
  */
  const threads = path.forumBoards.reduce((n, b) => n + b._count.threads, 0);
  if (threads > 0) {
    throw new LearnAdminError(
      `This path's forum has ${threads} thread${threads === 1 ? "" : "s"}. Delete those first — deleting the path would take the forum and every question in it with it, and there's no undo.`,
      "BLOCKED"
    );
  }

  await prisma.learningPath.delete({ where: { id } });
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// WS2 — the nested structure (Course → Section → Lesson)
// ---------------------------------------------------------------------------

/**
 * One path with its whole outline.
 *
 * Loaded in ONE query rather than lazily per branch. The largest path in the
 * catalog is 105 lessons across 6 courses — small enough that a single read is
 * cheaper than the round-trips, and it means expanding a course is instant
 * rather than a spinner. The COLLAPSING is a rendering decision (see the
 * editor), not a loading one.
 */
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

/**
 * (course, title) is a Section's natural key — the XLS carries no ids, so that
 * pair IS its identity and the database enforces it. A duplicate title has to
 * come back as an explanation, not as a raw unique-constraint error.
 */
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

/**
 * Deleting a course or a section takes its children with it (the FK cascades),
 * so both refuse while children exist — same reasoning as deletePath. A lesson
 * has no children and deletes directly, except that progress rows are checked
 * first: those belong to learners.
 */
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

/**
 * Move one child up or down among its siblings.
 *
 * Ordinals are NOT assumed to be dense or unique — the XLS import wrote them
 * from spreadsheet row order, and nothing has enforced them since. So this
 * reads the actual sibling order, swaps the two neighbours in that list, and
 * REWRITES every ordinal in one transaction. Swapping the two rows' stored
 * values instead would be a no-op whenever they happen to be equal, which on
 * imported data is common.
 */
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

/**
 * Normalise a pasted Vimeo reference on the way IN.
 *
 * `vimeoEmbedUrl` already tolerates every shape at render time, so storing the
 * raw paste would work — but then the column holds four formats for the same
 * thing and every future consumer has to tolerate all four too. Normalising
 * once, here, means the database says what it means. Returns null for a value
 * we can't make sense of, and the caller rejects it rather than storing a
 * string that will silently never play.
 */
export function normalizeVimeoRef(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;
  /*
    IT MUST ACCEPT ITS OWN OUTPUT, and it did not.

    The stored form of an unlisted video is `123456/abcdef` — id plus hash, no
    host. That matched neither the bare-numeric branch nor the vimeo.com regex,
    so `normalizeVimeoRef(normalizeVimeoRef(url))` returned null for every
    unlisted video. Harmless while the only caller was an admin pasting a full
    URL; it surfaced the moment the bulk loader passed an already-normalised ref
    back through `setLessonUrl`, which rejected 243 of 304 rows with "that isn't
    a Vimeo link". A function whose output its own input refuses is a trap, and
    the fix belongs here rather than in each caller remembering to pass raw.
  */
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

/**
 * Set just the URL — the fast path for the per-section table, where an admin
 * pastes down a column and never opens a lesson.
 *
 * Setting a URL also ADVANCES the production status to URL_ADDED_TO_LESSON when
 * it is behind, because otherwise the lesson still wouldn't play: the gate in
 * learn.ts needs both halves. Filling in the URL and having nothing happen is
 * precisely the confusion this brief exists to remove. A status already further
 * along the ladder (BLOG_CREATED, BLOG_RELEASED) is left alone — that is
 * forward progress we shouldn't undo.
 */
export async function setLessonUrl(id: string, rawUrl: string | null) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, production_status: true },
  });
  if (!lesson) throw new LearnAdminError("That lesson no longer exists.", "NOT_FOUND");

  if (!rawUrl || !rawUrl.trim()) {
    /*
      Clearing the URL rolls the ladder back off URL_ADDED_TO_LESSON.

      The symmetry matters more than it looks. Without it, clearing a URL leaves
      the lesson claiming a URL it no longer has — which manufactures a brand new
      row of exactly the inconsistency this brief exists to remove, from inside
      the tool built to remove it. Only that one rung is rolled back: BLOG_CREATED
      and BLOG_RELEASED are further progress and record something real that
      removing a video doesn't undo.
    */
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
    ["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] as string[]
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

/**
 * Can this path go live, and what will a learner find if it does?
 *
 * The brief draws a sharp line here and it is the right one: structure is a
 * BLOCKER, empty videos are a WARNING. A path with no lessons is not a page, it
 * is a dead link — nothing to show and nothing to fix by publishing. A path
 * whose lessons are all "coming soon" is a real page that says what is coming;
 * the public catalog already reports "0 ready to watch" honestly, so publishing
 * it is a legitimate choice and not ours to refuse.
 */
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
  const urlMissing = lessons.filter(
    (l) =>
      (["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] as string[]).includes(
        l.production_status
      ) && !l.vimeo_ref?.trim()
  ).length;

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
        ? `The only lesson here has no video yet, so it will show as "coming soon". You can still publish — the catalog says "0 ready to watch" rather than pretending otherwise.`
        : `None of the ${lessons.length} lessons have a video yet, so every one will show as "coming soon". You can still publish — the catalog says "0 ready to watch" rather than pretending otherwise.`
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

/**
 * Flip a path's status.
 *
 * Publishing re-checks readiness SERVER-SIDE rather than trusting that the UI
 * disabled the button — the readiness call and the publish are separate
 * requests, and a path can lose its last lesson in between. Unpublishing has no
 * gate: pulling something back is always allowed.
 */
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
