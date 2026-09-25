import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";

/**
 * ── ⚠⚠⚠ THE COURSE CATALOGUE (ruling 53d, brief 9) ──────────────────────
 *
 * ⚠ **RULING 53d:** *"`/learn/courses` is a 308 to `/learn/paths`, so two tabs
 * point at one page. Courses gets a real page of its own, five tabs each naming
 * a different place."*
 *
 * ── ⚠⚠⚠ THE STOP THIS CLEARED FIRST ────────────────────────────────────
 *
 * ⚠⚠ Scott: *"Before building it, report what a course is that a path is not.
 * **If the answer is nothing, STOP AND REPORT** rather than shipping two names
 * for one list."* ⚠ **IT IS NOT NOTHING, and the schema says so in its own
 * words** — `Course`'s model comment reads *"A course maps to one Oracle
 * application."*
 *
 *   paths 23 · courses 54 · lessons 522
 *   `learning_path_id` is NOT NULL — a course belongs to exactly ONE path
 *   courses per path: min 1 · median 1 · max 9
 *
 * ⚠⚠ **A PATH IS A JOB** (*"Basic Payables"*); **A COURSE IS ONE ORACLE
 * APPLICATION** (*"How to Use the Invoices Application"*). Different grain,
 * different noun — so the page has something of its own to show.
 *
 * ── ⚠⚠⚠ THE DEFECT THIS MUST NOT RE-CREATE, AND IT IS WHY THE 308 EXISTED ─
 *
 * ⚠⚠ `/learn/courses` **once rendered `PathCard` — learning PATHS — under the
 * heading "All Courses"**, off the same `getLearnHome()` query `/learn/paths`
 * uses. ⚠⚠⚠ **TWO URLs, ONE PAGE, AND ONE OF THEM NAMED AFTER A THING IT DID
 * NOT SHOW.** `E362` found it, `E364` WS-8 redirected it away.
 * ⚠ **SO THIS MODULE QUERIES `Course` AND NEVER `LearningPath`-as-a-card.** The
 * page is a list of courses or it is the old defect wearing a new commit.
 *
 * ── ⚠⚠ ONE DEFINITION OF PLAYABLE, AND IT IS NOT DEFINED HERE ───────────
 *
 * ⚠⚠⚠ `isPlayable` is imported from `lib/learn.ts`. **IT IS NOT RE-EXPRESSED
 * AS A PRISMA `where`**, because `E610` recorded that this exact rule had been
 * hand-written in FOUR places — *"a hand-rolled copy agrees until the rule
 * changes."* ⚠ The lessons are selected and the predicate is applied in memory,
 * so there is exactly one statement of what "plays" means.
 *
 * ⚠ **PUBLISHED PATHS ONLY.** A draft path is invisible everywhere else, and a
 * course is only reachable through its path's URL — so a course on a draft path
 * has no door, and listing it would be `E579` by another route.
 */
export type CourseCard = {
  id: string;
  /** ⚠ MAY BE EMPTY — see `title` handling in the page. Never back-filled. */
  title: string;
  slug: string;
  summary: string | null;
  /** ⚠ The course's only URL runs through its path. */
  href: string;
  pathSlug: string;
  pathTitle: string;
  /** ⚠ `null` on a path with no group — the page buckets those last. */
  group: string | null;
  audience: string;
  lessons: number;
  /** ⚠ How many of those lessons actually play, by the shared predicate. */
  playable: number;
};

export type CourseGroup = {
  pathSlug: string;
  pathTitle: string;
  group: string | null;
  audience: string;
  courses: CourseCard[];
};

/**
 * ⚠⚠ EVERY COURSE ON EVERY PUBLISHED PATH, GROUPED BY THE PATH IT BELONGS TO.
 *
 * ⚠⚠⚠ **THE GROUPING IS THE HONEST EXPRESSION OF THE RELATIONSHIP, NOT A
 * LAYOUT CHOICE.** `learning_path_id` is NOT NULL: a course cannot exist
 * outside a path, and **15 of 23 paths hold exactly one course**, so a flat
 * A–Z list of 54 courses would hide the one fact that explains what a course
 * is. ⚠ It also gives an UNTITLED course an identity — see the page.
 *
 * ⚠ ONE QUERY. The lessons ride along on the include rather than being counted
 * per course, so this does not fan out.
 */
export async function getLearnCourses(): Promise<CourseGroup[]> {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      group: true,
      audience: true,
      courses: {
        orderBy: { sort_order: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          /* ⚠⚠ LESSONS HANG OFF SECTIONS, NOT OFF THE COURSE. `Course` has
             `sections Section[]` and `Section` has `lessons Lesson[]` — there
             is no `course.lessons` relation, and assuming one is what the
             typecheck caught on the first build of this file.
             ⚠ `Section` IS A SUBHEADING, NEVER A LEVEL (`PathSpine`'s recorded
             rule): it is flattened away here because a COURSE card counts
             lessons, and the subheadings are the path page's business. */
          sections: {
            select: {
              lessons: {
                /* ⚠ ONLY WHAT `isPlayable` READS. A course card is a count, and
                   pulling descriptions here would load the catalogue's text to
                   render a number. */
                select: { vimeo_ref: true, production_status: true },
              },
            },
          },
        },
      },
    },
  });

  return paths
    .map((p) => ({
      pathSlug: p.slug,
      pathTitle: p.title,
      group: p.group,
      audience: String(p.audience),
      courses: p.courses.map((c) => {
        /* ⚠ FLATTENED ONCE, READ TWICE — the total and the playable count come
           from the same array, so they cannot drift apart. */
        const lessons = c.sections.flatMap((s) => s.lessons);
        return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        href: `/learn/${p.slug}/course/${c.slug}`,
        pathSlug: p.slug,
        pathTitle: p.title,
        group: p.group,
        audience: String(p.audience),
        lessons: lessons.length,
        playable: lessons.filter(isPlayable).length,
        };
      }),
    }))
    /* ⚠ A PUBLISHED PATH WITH NO COURSES RENDERS NOTHING RATHER THAN AN EMPTY
       HEADING. The heading would be a promise of content that is not there. */
    .filter((g) => g.courses.length > 0);
}

/**
 * ⚠⚠ THE TWO FIGURES THE HEADER STATES, DERIVED FROM THE SAME ROWS THE PAGE
 * DRAWS — so the header cannot disagree with the list beneath it.
 *
 * ⚠ Exported and pure so `check:learn-views` can drive it from a fixture
 * rather than asserting a rendered number (`E607`).
 */
export function courseTotals(groups: CourseGroup[]): {
  courses: number;
  paths: number;
  playable: number;
} {
  const courses = groups.reduce((n, g) => n + g.courses.length, 0);
  const playable = groups.reduce(
    (n, g) => n + g.courses.filter((c) => c.playable > 0).length,
    0
  );
  return { courses, paths: groups.length, playable };
}
