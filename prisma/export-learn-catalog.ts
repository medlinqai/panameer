import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "fs";

/**
 * Dump the Learn catalog to JSON for the thumbnail matcher
 * (brief_learn_thumbnail_import).
 *
 *   npm run learn:export-catalog -- <out.json>
 *
 * Step 1 of a three-step pipeline that keeps the risky part read-only:
 *   1. this — the catalog as it stands;
 *   2. scripts/learn_thumbnails.py — matches local images to it, writes a plan;
 *   3. prisma/apply-learn-thumbnails.ts — uploads and sets the columns.
 *
 * The matcher is Python because the work is filesystem walking and string
 * comparison, and it must never hold a database handle: it cannot write if it
 * cannot connect.
 */
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const paths = await p.learningPath.findMany({
    select: {
      id: true, title: true, audience: true, group: true, cover_image: true,
      courses: {
        select: {
          id: true, title: true, thumbnail_url: true,
          sections: {
            select: {
              id: true, title: true, thumbnail_url: true,
              lessons: { select: { id: true, title: true, thumbnail_url: true } },
            },
          },
        },
      },
    },
  });
  writeFileSync(process.argv[2], JSON.stringify(paths, null, 1));
  const n = paths.reduce((a, x) => a + x.courses.reduce((b, c) => b + c.sections.reduce((d, s) => d + s.lessons.length, 0), 0), 0);
  console.log(`exported ${paths.length} paths, ${n} lessons → ${process.argv[2]}`);
  await p.$disconnect();
}
void main();
