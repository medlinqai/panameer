import { prisma } from "@/lib/prisma";
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
export async function createPath(input: PathInput) {
  const slug = await uniquePathSlug(input.slug?.trim() || input.title);
  return prisma.learningPath.create({
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
    select: { id: true, slug: true },
  });
}

export async function updatePath(id: string, input: PathInput) {
  const existing = await prisma.learningPath.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) throw new LearnAdminError("That learning path no longer exists.", "NOT_FOUND");

  const wanted = input.slug?.trim() || input.title;
  const slug =
    slugify(wanted) === existing.slug ? existing.slug : await uniquePathSlug(wanted, id);

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
 * a deliberate sequence of steps. Enrolments are checked for the same reason,
 * and matter more — those are learners' records, not ours.
 */
export async function deletePath(id: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      _count: { select: { courses: true, enrollments: true } },
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

  await prisma.learningPath.delete({ where: { id } });
  return { ok: true as const };
}
