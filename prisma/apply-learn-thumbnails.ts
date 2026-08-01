import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { readFileSync, statSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadProfilePhoto, StorageError } from "../src/lib/storage";

/**
 * Apply a thumbnail plan (brief_learn_thumbnail_import WS2/WS3).
 *
 *   npm run learn:thumbnails -- <plan.json> [--apply]
 *
 * Dry by default. Without --apply it uploads nothing and writes nothing; it
 * just says what it would do. The plan itself was produced by the read-only
 * matcher (scripts/learn_thumbnails.py), so the decision of WHICH image goes
 * WHERE has already been made and reviewed by the time this runs — this file
 * only moves bytes and sets columns.
 *
 * IDEMPOTENT: a row that already carries an image is SKIPPED unless --force.
 *
 * That guard is not cosmetic. `uploadProfilePhoto` names every object with a
 * fresh uuid, so without it a second run re-uploads all 50 pictures and leaves
 * 50 orphans in the bucket — the database looks unchanged while storage grows
 * every time. Caught by running it twice and watching "distinct images
 * uploaded: 50" appear again on a run that should have done nothing.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Row = {
  id: string;
  title: string;
  file: string;
  rel: string;
  tier?: string;
  score?: number;
  had?: boolean;
};

type Plan = {
  lessons: Row[];
  paths: Row[];
  courses: Row[];
  sections: Row[];
  unmatched: { rel: string; reason: string }[];
  stats: Record<string, number>;
};

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Uploaded-file cache, so one image shared by two rows is stored once. */
const uploaded = new Map<string, string>();

async function upload(file: string): Promise<string> {
  const cached = uploaded.get(file);
  if (cached) return cached;

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext];
  if (!type) throw new Error(`unsupported image type: ${ext}`);

  const stat = statSync(file);
  if (stat.size === 0) {
    // The brief's OneDrive caveat. A placeholder reads as an empty file rather
    // than an error, so an unguarded run would happily upload 0 bytes and set a
    // URL pointing at nothing.
    throw new Error("file is 0 bytes — OneDrive placeholder, not downloaded");
  }

  const bytes = readFileSync(file);
  const url = await uploadProfilePhoto("learn", {
    type,
    size: bytes.byteLength,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  uploaded.set(file, url);
  return url;
}

async function applyRows(
  label: string,
  rows: Row[],
  write: (id: string, url: string) => Promise<unknown>,
  current: (id: string) => Promise<string | null>,
  apply: boolean,
  force: boolean
) {
  let done = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const row of rows) {
    try {
      if (!apply) {
        statSync(row.file); // prove it is readable before promising anything
        done++;
        continue;
      }
      if (!force && (await current(row.id))) {
        skipped++;
        continue;
      }
      const url = await upload(row.file);
      await write(row.id, url);
      done++;
    } catch (e) {
      const msg =
        e instanceof StorageError || e instanceof Error ? e.message : String(e);
      failures.push(`${row.title} ← ${row.rel}: ${msg}`);
    }
  }

  console.log(
    `${label.padEnd(9)} ${done}/${rows.length}` +
      (skipped ? ` (${skipped} unchanged)` : "") +
      (failures.length ? `  FAILED ${failures.length}` : "")
  );
  for (const f of failures) console.log(`    ! ${f}`);
  return failures.length;
}

async function main() {
  const planPath = process.argv[2];
  const apply = process.argv.includes("--apply");
  // Re-upload rows that already have an image. Only wanted when the source
  // pictures themselves have changed.
  const force = process.argv.includes("--force");
  if (!planPath) {
    console.error("usage: npm run learn:thumbnails -- <plan.json> [--apply] [--force]");
    process.exit(1);
  }

  const plan: Plan = JSON.parse(readFileSync(planPath, "utf8"));

  console.log(apply ? "APPLYING\n" : "DRY RUN — nothing will be written\n");

  let failures = 0;
  failures += await applyRows(
    "lessons",
    plan.lessons,
    (id, url) =>
      prisma.lesson.update({ where: { id }, data: { thumbnail_url: url } }),
    async (id) =>
      (await prisma.lesson.findUnique({ where: { id }, select: { thumbnail_url: true } }))
        ?.thumbnail_url ?? null,
    apply,
    force
  );
  failures += await applyRows(
    "LP covers",
    plan.paths,
    (id, url) =>
      prisma.learningPath.update({ where: { id }, data: { cover_image: url } }),
    async (id) =>
      (await prisma.learningPath.findUnique({ where: { id }, select: { cover_image: true } }))
        ?.cover_image ?? null,
    apply,
    force
  );
  failures += await applyRows(
    "courses",
    plan.courses,
    (id, url) =>
      prisma.course.update({ where: { id }, data: { thumbnail_url: url } }),
    async (id) =>
      (await prisma.course.findUnique({ where: { id }, select: { thumbnail_url: true } }))
        ?.thumbnail_url ?? null,
    apply,
    force
  );
  failures += await applyRows(
    "sections",
    plan.sections,
    (id, url) =>
      prisma.section.update({ where: { id }, data: { thumbnail_url: url } }),
    async (id) =>
      (await prisma.section.findUnique({ where: { id }, select: { thumbnail_url: true } }))
        ?.thumbnail_url ?? null,
    apply,
    force
  );

  console.log(`\ndistinct images uploaded: ${uploaded.size}`);
  console.log(`unplaced source images:   ${plan.unmatched.length} (see the plan)`);

  if (apply) {
    const [lessons, paths] = await Promise.all([
      prisma.lesson.count({ where: { thumbnail_url: { not: null } } }),
      prisma.learningPath.count({ where: { cover_image: { not: null } } }),
    ]);
    console.log(`\nnow in the catalog: ${lessons} lessons, ${paths} LP covers with an image`);
  }

  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

void main();
