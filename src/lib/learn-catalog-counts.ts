

import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";

export type CatalogCount = { key: "paths" | "courses" | "lessons"; value: string; label: string };

export async function getCatalogCounts(): Promise<CatalogCount[]> {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      courses: {
        select: {
          id: true,
          sections: {
            select: { lessons: { where: { retired_at: null }, select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
    },
  });

  let startablePaths = 0;
  let courses = 0;
  let lessons = 0;
  for (const p of paths) {
    const all = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const playable = all.filter(isPlayable).length;
    if (playable === 0) continue;
    startablePaths++;
    lessons += playable;
    courses += p.courses.filter((c) =>
      c.sections.some((s) => s.lessons.some(isPlayable))
    ).length;
  }

  const p = (n: number, one: string, many: string) => (n === 1 ? one : many);
  return [
    {
      key: "paths",
      value: String(startablePaths),
      label: p(startablePaths, "Path You Can Start", "Paths You Can Start"),
    },
    {
      key: "courses",
      value: String(courses),
      label: p(courses, "Course With Video", "Courses With Video"),
    },
    {
      key: "lessons",
      value: String(lessons),
      label: p(lessons, "Lesson You Can Watch", "Lessons You Can Watch"),
    },
  ];
}
