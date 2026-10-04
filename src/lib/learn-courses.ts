import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";

export type CourseCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  href: string;
  pathSlug: string;
  pathTitle: string;
  group: string | null;
  audience: string;
  lessons: number;
  playable: number;
};

export type CourseGroup = {
  pathSlug: string;
  pathTitle: string;
  group: string | null;
  audience: string;
  courses: CourseCard[];
};

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
          sections: {
            select: {
              lessons: {
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
