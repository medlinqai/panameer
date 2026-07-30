import * as dotenv from "dotenv"; import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedLearn } from "./seed-learn";

/** Standalone runner: `npm run seed:learn`. */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

(async () => {
  const c = await seedLearn(prisma);
  const row = (n: string, v: { inserted: number; updated: number; shielded: number }) =>
    console.log(`  ${n.padEnd(15)} inserted ${String(v.inserted).padStart(4)}  updated ${String(v.updated).padStart(4)}  shielded ${String(v.shielded).padStart(4)}`);
  console.log("Learn catalog seeded:");
  row("learning paths", c.paths);
  row("courses", c.courses);
  row("sections", c.sections);
  row("lessons", c.lessons);
  console.log(`  lessons with vimeo_ref: ${c.lessonsWithVimeoRef}`);
  console.log(`  expert links resolved:  ${c.expertsMatched}`);
  if (c.expertsUnmatched.length) {
    console.log(`  experts NOT matched to a Person (left null): ${c.expertsUnmatched.join(", ")}`);
  }
})().finally(() => prisma.$disconnect());
