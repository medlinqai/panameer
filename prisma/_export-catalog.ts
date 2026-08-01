import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "fs";
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
