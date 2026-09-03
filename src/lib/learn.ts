import { prisma } from "@/lib/prisma";

/**
 * Public Learn queries (brief_learn_v1 WS2).
 *
 * Everything here is READ-ONLY and PUBLIC — no viewer, no ownership check,
 * because the curriculum is the front door. Enrollment and progress (WS4) are the
 * parts that need a session; browsing and watching do not.
 */

/**
 * THE PLAYBACK GATE, in one place.
 *
 * A lesson plays only when BOTH are true: the production ladder has reached
 * URL_ADDED_TO_LESSON, and a `vimeo_ref` is actually stored. Both halves are
 * required because the catalog disagrees with itself — 296 lessons carry the
 * status while the workbook's Vimeo column is empty, so the status records that
 * someone BELIEVES a URL was added and the column records whether one is there.
 * Trusting the status alone would render 296 empty players.
 *
 * The curriculum is NOT hidden behind this. An unplayable lesson still appears
 * in the outline with its title and run time — the brief is explicit that we
 * gate playback, not visibility. Someone deciding whether this path is worth
 * their time needs to see what it covers.
 */
export const PLAYABLE_STATUSES = [
  "URL_ADDED_TO_LESSON",
  "BLOG_CREATED",
  "BLOG_RELEASED",
] as const;

export function isPlayable(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): boolean {
  return (
    Boolean(lesson.vimeo_ref?.trim()) &&
    (PLAYABLE_STATUSES as readonly string[]).includes(lesson.production_status)
  );
}

/**
 * A path a learner can actually START — at least one playable lesson anywhere in
 * it (`P1-J3-E362`).
 *
 * **SCOTT, 2026-09-02:** *"If there is no video...no sense adding the
 * course/lesson."*
 *
 * ⚠⚠ DERIVED FROM `isPlayable` ABOVE, NEVER RE-IMPLEMENTED. There is exactly one
 * definition of playability on the server and this composes it. Measured
 * 2026-09-02: 305 of 522 lessons are playable and ELEVEN of 23 published paths
 * have zero.
 *
 * ── ⚠⚠ HIDE, NEVER DELETE, AND THE VISIBILITY IS PER AUDIENCE ────────────────
 *
 * Nothing is removed from the database. A path with no video today is a path
 * with video next month, and the day one is uploaded it comes back on its own —
 * no migration, no re-import, no code change, because this is a query-time
 * predicate and not a stored flag.
 *
 * ⚠ AND IT IS APPLIED ONLY ON THE LEARNER'S DISCOVERY SURFACES:
 *   HIDDEN   the `/learn` dashboard, its catalog grid, coverage, totals, and
 *            the suggested first path
 *   VISIBLE  `getPathsTaughtByProfile` (the instructor's own profile) and
 *            everything under `/admin`
 *
 * ⚠⚠ THE INSTRUCTOR EXCEPTION IS NOT OPTIONAL. Marelise Steenkamp teaches
 * lessons across five paths and THREE of them have zero playable lessons
 * (Payroll Mgmt, Benefits Admin, Talent Mgmt). A blunt global filter would mean
 * she opens her own profile and finds them gone — which reads as data loss, not
 * as a design rule. For a teacher an un-shot lesson is a WORK QUEUE.
 *
 * ⚠ AND AN ALREADY-ENROLLED LEARNER KEEPS THEIR PATH. The filter is on
 * DISCOVERY, not on "what I'm already in". Measured: 0 enrollments are affected
 * today, but the rule holds regardless.
 */
export function hasPlayableLessons(
  lessons: { vimeo_ref: string | null; production_status: string }[]
): boolean {
  return lessons.some(isPlayable);
}

/**
 * The same question about a path shaped as the nested tree the reads return.
 * ⚠ A CONVENIENCE OVER `hasPlayableLessons`, not a second rule.
 */
export function pathHasPlayableLessons(path: {
  courses: { sections: { lessons: { vimeo_ref: string | null; production_status: string }[] }[] }[];
}): boolean {
  return hasPlayableLessons(
    path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons))
  );
}

/**
 * A Vimeo reference → an embeddable player URL.
 *
 * The column is deliberately loose about what it holds (a bare id, a
 * `vimeo.com/123` link, an already-built `player.vimeo.com` embed), because it
 * is populated from a spreadsheet by hand and insisting on one shape would mean
 * a typo silently kills a video. Returns null when nothing usable can be made,
 * so a malformed value shows "coming soon" rather than an empty black frame.
 */
export function vimeoEmbedUrl(ref: string | null | undefined): string | null {
  const raw = ref?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `https://player.vimeo.com/video/${raw}`;
  if (/player\.vimeo\.com\/video\/\d+/.test(raw)) {
    return raw.startsWith("http") ? raw : `https://${raw}`;
  }
  // vimeo.com/123456789 and vimeo.com/123456789/abcdef (unlisted hash)
  const m = /vimeo\.com\/(?:channels\/[^/]+\/)?(\d+)(?:\/([0-9a-z]+))?/i.exec(raw);
  if (m) {
    return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  }
  return null;
}

/** Audience facet → the label the catalog uses. */
export const AUDIENCE_LABEL: Record<string, string> = {
  BEGINNERS: "Beginners",
  END_USER: "End Users",
  IMPLEMENTER: "Implementers",
  CONTENT_CREATOR: "Content Creators",
};

export const AUDIENCE_ORDER = [
  "BEGINNERS",
  "END_USER",
  "IMPLEMENTER",
  "CONTENT_CREATOR",
] as const;

export const STYLE_LABEL: Record<string, string> = {
  FA_OVERVIEW: "Functional Area Overview",
  HOW_TO_USE: "How to Use",
  HOW_TO_DEPLOY: "How to Deploy",
  DAILY_JOURNAL: "Daily Journal",
  ASK_THE_EXPERT: "Ask the Expert",
};

export type BrowsePath = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  lessons: number;
  playable: number;
  expert: string | null;
};

/** Every published path, with its counts, grouped for the browse page. */
export async function getBrowseTree(): Promise<
  { audience: string; groups: { group: string; paths: BrowsePath[] }[] }[]
> {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ audience: "asc" }, { group: "asc" }, { sort_order: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      group: true,
      audience: true,
      expert: { select: { first_name: true, last_name: true } },
      courses: {
        select: {
          sections: {
            select: {
              lessons: { select: { vimeo_ref: true, production_status: true } },
            },
          },
        },
      },
    },
  });

  const flat: BrowsePath[] = paths.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      group: p.group,
      audience: p.audience,
      lessons: lessons.length,
      playable: lessons.filter(isPlayable).length,
      expert: p.expert
        ? `${p.expert.first_name ?? ""} ${p.expert.last_name ?? ""}`.trim() || null
        : null,
    };
  });

  const byAudience = new Map<string, Map<string, BrowsePath[]>>();
  for (const p of flat) {
    if (!byAudience.has(p.audience)) byAudience.set(p.audience, new Map());
    const groups = byAudience.get(p.audience)!;
    const key = p.group ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return AUDIENCE_ORDER.filter((a) => byAudience.has(a)).map((audience) => ({
    audience,
    groups: [...byAudience.get(audience)!.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([group, paths]) => ({ group, paths })),
  }));
}

/**
 * One path with its full outline, for the landing page.
 *
 * `includeDraft` exists ONLY for the admin preview (WS4) and is never derived
 * from a query string here — the caller has to have already proved the viewer
 * is an admin, and passes an explicit boolean. Keeping the decision at the page
 * boundary rather than inside this function means the default read stays
 * PUBLISHED-only and a future caller can't opt into draft rows by accident.
 */
export async function getLearningPath(slug: string, includeDraft = false) {
  return prisma.learningPath.findFirst({
    where: { slug, ...(includeDraft ? {} : { status: "PUBLISHED" }) },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      group: true,
      audience: true,
      // Selected so a preview can tell the admin they're looking at a draft.
      status: true,
      expert: { select: { first_name: true, last_name: true, photo_url: true } },
      courses: {
        orderBy: { sort_order: "asc" },
        select: {
          id: true,
          title: true,
          style: true,
          summary: true,
          sections: {
            orderBy: { sort_order: "asc" },
            select: {
              id: true,
              title: true,
              lessons: {
                orderBy: { sort_order: "asc" },
                select: {
                  id: true,
                  title: true,
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
}

/** One lesson plus the sibling list needed to render prev / next. */
export async function getLesson(pathSlug: string, lessonId: string, includeDraft = false) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      section: {
        course: {
          learningPath: {
            slug: pathSlug,
            ...(includeDraft ? {} : { status: "PUBLISHED" }),
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      run_time: true,
      vimeo_ref: true,
      production_status: true,
      expert: { select: { first_name: true, last_name: true } },
      section: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              title: true,
              learningPath: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
  });
  if (!lesson) return null;

  // Flat running order across the whole path, so prev/next crosses section and
  // course boundaries the way a learner actually moves through it.
  const path = await getLearningPath(pathSlug, includeDraft);
  const order = (path?.courses ?? []).flatMap((c) =>
    c.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, sectionTitle: s.title })))
  );
  const i = order.findIndex((l) => l.id === lessonId);
  return {
    lesson,
    path,
    prev: i > 0 ? order[i - 1] : null,
    next: i >= 0 && i < order.length - 1 ? order[i + 1] : null,
    position: i + 1,
    total: order.length,
  };
}
