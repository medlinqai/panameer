import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Seeds the Learn curriculum from `prisma/seed-data/learn-catalog.json`
 * (generated from Scott's "Video Catalog.xlsx") — brief_learn_v1 WS1.
 *
 * Shape is four levels: **LearningPath → Course → Section → Lesson**, mirroring
 * `seed-taxonomy.ts` in structure and in its `is_custom` shield.
 *
 * ── RE-RUN IS AN UPDATE, NOT A RE-SEED ────────────────────────────────────
 * This is the load-bearing behaviour, not a nicety. The catalog ships today
 * with `vimeo_ref` null on all 522 lessons, because the workbook has no video
 * URLs in it. When Scott populates the Vimeo column and re-exports, re-running
 * this must FILL IN the URLs on the lessons that already exist — not duplicate
 * the curriculum, and not wipe and rebuild it (which would orphan every
 * enrolment and every row of lesson progress pointing at the old ids).
 *
 * The XLS carries no ids, so identity is the HIERARCHY PATH:
 *
 *     learning_path.slug                      (audience + group + title)
 *     course        (learning_path_id, slug)
 *     section       (course_id, title)
 *     lesson        (section_id, title)
 *
 * Each of those is a database-level unique, so the match is an upsert rather
 * than a read-then-write race.
 *
 * ── THE SHIELD ────────────────────────────────────────────────────────────
 * `is_custom` marks a row a human authored or edited in the admin console
 * (brief_learn_admin_authoring). A re-import is authoritative only for the rows
 * IT created: anything flagged custom is left exactly as it is. Without that,
 * the first XLS re-run after someone fixes a lesson title in the admin UI would
 * quietly undo their work, and the spreadsheet would win an argument nobody knew
 * was happening.
 */

type CatalogLesson = {
  title: string;
  description: string | null;
  run_time: string | null;
  vimeo_ref: string | null;
  production_status: string;
  expert: string | null;
  sort_order: number;
};
type CatalogSection = { title: string; sort_order: number; lessons: CatalogLesson[] };
type CatalogCourse = {
  title: string;
  slug: string;
  style: string | null;
  sort_order: number;
  sections: CatalogSection[];
};
type CatalogPath = {
  title: string;
  slug: string;
  audience: string;
  group: string | null;
  sort_order: number;
  courses: CatalogCourse[];
};
type CatalogDoc = { _counts?: Record<string, number>; paths: CatalogPath[] };

export type LearnSeedCounts = {
  paths: { inserted: number; updated: number; shielded: number };
  courses: { inserted: number; updated: number; shielded: number };
  sections: { inserted: number; updated: number; shielded: number };
  lessons: { inserted: number; updated: number; shielded: number };
  lessonsWithVimeoRef: number;
  expertsMatched: number;
  expertsUnmatched: string[];
};

const CATALOG = path.join(__dirname, "seed-data", "learn-catalog.json");

/** Resolve "Scott Walls" → a Person id, once per name. */
async function buildExpertIndex(prisma: PrismaClient) {
  const people = await prisma.person.findMany({
    select: { id: true, first_name: true, last_name: true },
  });
  const byName = new Map<string, string>();
  for (const p of people) {
    const key = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, p.id);
  }
  return byName;
}

export async function seedLearn(prisma: PrismaClient): Promise<LearnSeedCounts> {
  if (!fs.existsSync(CATALOG)) {
    throw new Error(
      `Missing ${CATALOG}. Run: python3 scripts/generate-learn-catalog.py`
    );
  }
  const doc: CatalogDoc = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

  const counts: LearnSeedCounts = {
    paths: { inserted: 0, updated: 0, shielded: 0 },
    courses: { inserted: 0, updated: 0, shielded: 0 },
    sections: { inserted: 0, updated: 0, shielded: 0 },
    lessons: { inserted: 0, updated: 0, shielded: 0 },
    lessonsWithVimeoRef: 0,
    expertsMatched: 0,
    expertsUnmatched: [],
  };

  const experts = await buildExpertIndex(prisma);
  const unmatched = new Set<string>();
  const expertId = (name: string | null): string | null => {
    if (!name) return null;
    const hit = experts.get(name.trim().toLowerCase());
    if (hit) {
      counts.expertsMatched++;
      return hit;
    }
    unmatched.add(name.trim());
    return null;
  };

  for (const p of doc.paths) {
    const existingPath = await prisma.learningPath.findUnique({
      where: { slug: p.slug },
      select: { id: true, is_custom: true },
    });

    let pathId: string;
    if (!existingPath) {
      const created = await prisma.learningPath.create({
        data: {
          title: p.title,
          slug: p.slug,
          audience: p.audience as never,
          group: p.group,
          sort_order: p.sort_order,
          // PUBLISHED so WS2's public browse has something to show. Playability
          // is a separate gate (vimeo_ref) — the curriculum is public even
          // while none of it is watchable yet.
          status: "PUBLISHED",
        },
        select: { id: true },
      });
      pathId = created.id;
      counts.paths.inserted++;
    } else if (existingPath.is_custom) {
      pathId = existingPath.id;
      counts.paths.shielded++;
    } else {
      await prisma.learningPath.update({
        where: { id: existingPath.id },
        data: {
          title: p.title,
          audience: p.audience as never,
          group: p.group,
          sort_order: p.sort_order,
        },
      });
      pathId = existingPath.id;
      counts.paths.updated++;
    }

    for (const c of p.courses) {
      const existingCourse = await prisma.course.findUnique({
        where: { learning_path_id_slug: { learning_path_id: pathId, slug: c.slug } },
        select: { id: true, is_custom: true },
      });

      let courseId: string;
      if (!existingCourse) {
        const created = await prisma.course.create({
          data: {
            learning_path_id: pathId,
            title: c.title,
            slug: c.slug,
            style: (c.style as never) ?? null,
            sort_order: c.sort_order,
          },
          select: { id: true },
        });
        courseId = created.id;
        counts.courses.inserted++;
      } else if (existingCourse.is_custom) {
        courseId = existingCourse.id;
        counts.courses.shielded++;
      } else {
        await prisma.course.update({
          where: { id: existingCourse.id },
          data: {
            title: c.title,
            style: (c.style as never) ?? null,
            sort_order: c.sort_order,
          },
        });
        courseId = existingCourse.id;
        counts.courses.updated++;
      }

      for (const s of c.sections) {
        const existingSection = await prisma.section.findUnique({
          where: { course_id_title: { course_id: courseId, title: s.title } },
          select: { id: true, is_custom: true },
        });

        let sectionId: string;
        if (!existingSection) {
          const created = await prisma.section.create({
            data: { course_id: courseId, title: s.title, sort_order: s.sort_order },
            select: { id: true },
          });
          sectionId = created.id;
          counts.sections.inserted++;
        } else if (existingSection.is_custom) {
          sectionId = existingSection.id;
          counts.sections.shielded++;
        } else {
          await prisma.section.update({
            where: { id: existingSection.id },
            data: { sort_order: s.sort_order },
          });
          sectionId = existingSection.id;
          counts.sections.updated++;
        }

        for (const l of s.lessons) {
          const existingLesson = await prisma.lesson.findUnique({
            where: { section_id_title: { section_id: sectionId, title: l.title } },
            select: { id: true, is_custom: true },
          });

          if (!existingLesson) {
            await prisma.lesson.create({
              data: {
                section_id: sectionId,
                title: l.title,
                description: l.description,
                run_time: l.run_time,
                vimeo_ref: l.vimeo_ref,
                production_status: l.production_status as never,
                expert_person_id: expertId(l.expert),
                sort_order: l.sort_order,
              },
            });
            counts.lessons.inserted++;
            if (l.vimeo_ref) counts.lessonsWithVimeoRef++;
          } else if (existingLesson.is_custom) {
            counts.lessons.shielded++;
          } else {
            /*
              The mutable set, per the brief. `vimeo_ref` is the point of the
              whole exercise — but it is only written when the sheet HAS one.
              A null in the spreadsheet must not blank a URL that is already in
              the database: today every lesson comes through null, so an
              unconditional write would erase the URLs on the very re-run that
              was supposed to add them.
            */
            await prisma.lesson.update({
              where: { id: existingLesson.id },
              data: {
                description: l.description,
                run_time: l.run_time,
                production_status: l.production_status as never,
                expert_person_id: expertId(l.expert),
                sort_order: l.sort_order,
                ...(l.vimeo_ref ? { vimeo_ref: l.vimeo_ref } : {}),
              },
            });
            counts.lessons.updated++;
            if (l.vimeo_ref) counts.lessonsWithVimeoRef++;
          }
        }
      }
    }
  }

  counts.expertsUnmatched = [...unmatched].sort();
  return counts;
}
