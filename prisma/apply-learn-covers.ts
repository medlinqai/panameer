import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * LEARNING-PATH COVER IMAGES (brief_learn_thumbnails_08_10 WS-2/WS-3).
 *
 * Assigns one cover from `public/learn/covers/` to every learning path that
 * does not already have one, and — only with `--apply` — writes
 * `LearningPath.cover_image`.
 *
 *   npm run learn:covers            plan only, writes learn-covers-plan.json
 *   npm run learn:covers -- --apply writes cover_image for real
 *
 * ── WHY IT IS TWO STEPS ──────────────────────────────────────────────────────
 *
 * Same rule the existing learn_thumbnails.py follows: never guess-attach. These
 * photos are generic — nobody can look at "girl on couch" and say which path it
 * belongs to — so the assignment is arbitrary by nature, and an arbitrary
 * assignment written straight to the database is one nobody reviewed. The plan
 * is the review step; Scott can hand-swap any pairing before it lands.
 *
 * ── WHAT IT DOES NOT TOUCH ───────────────────────────────────────────────────
 *
 * · Lesson.thumbnail_url and course covers. Both inherit the path cover through
 *   the existing fallback chain, and setting 522 lesson thumbnails to the same
 *   photo would be 522 rows to undo later.
 * · Paths that ALREADY have a cover_image. Four do — real images imported by
 *   brief_learn_thumbnail_import, all still resolving 200 — and overwriting a
 *   deliberate cover with a stock photo would be a regression. `--force`
 *   overrides if that is ever wanted.
 *
 * IDEMPOTENT. Re-running writes only rows whose cover_image differs from the
 * plan, and reports 0 changed on a second pass.
 */

const COVERS_DIR = path.resolve(process.cwd(), "public/learn/covers");
const PLAN_FILE = path.resolve(process.cwd(), "learn-covers-plan.json");

type PlanRow = {
  slug: string;
  title: string;
  audience: string;
  group: string | null;
  cover: string;
  /** Set when the path already had a cover and is being left alone. */
  keptExisting?: string;
};

function coverFiles(): string[] {
  if (!fs.existsSync(COVERS_DIR)) {
    throw new Error(`No covers directory at ${COVERS_DIR} — run WS-1 first.`);
  }
  return fs
    .readdirSync(COVERS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".jpg"))
    .sort();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    const covers = coverFiles();
    const paths = await prisma.learningPath.findMany({
      // BY SLUG. The brief asks for a stable order, and slug is the only field
      // here that is unique, immutable and not editorial — ordering by title
      // would reshuffle every assignment the next time somebody renames a path.
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        audience: true,
        group: true,
        cover_image: true,
      },
    });

    const needing = paths.filter((p) => force || !p.cover_image);

    /*
      DETERMINISTIC ASSIGNMENT, and with these counts it is also perfect.

      19 clean covers, 23 paths, 4 of which already have real covers → exactly
      19 paths to fill and exactly 19 images. One each, ZERO repeats. The brief
      budgeted for ~4 repeats spread far apart; leaving the four existing covers
      alone removes the need for any.

      The modulo is kept for the case where that stops being true (more paths,
      or --force). Cycling in slug order guarantees adjacent paths never share,
      and repeats land `covers.length` apart — the furthest apart they can be.
    */
    const plan: PlanRow[] = [];
    let i = 0;
    for (const p of paths) {
      if (!force && p.cover_image) {
        plan.push({
          slug: p.slug,
          title: p.title,
          audience: p.audience,
          group: p.group,
          cover: p.cover_image,
          keptExisting: p.cover_image,
        });
        continue;
      }
      plan.push({
        slug: p.slug,
        title: p.title,
        audience: p.audience,
        group: p.group,
        cover: `/learn/covers/${covers[i % covers.length]}`,
      });
      i++;
    }

    // Guard the one property the brief asks for by name.
    const adjacentClash = plan
      .map((r, n) => (n > 0 && r.cover === plan[n - 1].cover ? r.slug : null))
      .filter(Boolean);
    if (adjacentClash.length) {
      throw new Error(`Adjacent paths share a cover: ${adjacentClash.join(", ")}`);
    }

    fs.writeFileSync(
      PLAN_FILE,
      JSON.stringify(
        {
          generated: "run `npm run learn:covers` to regenerate",
          covers: covers.length,
          paths: paths.length,
          assigned: needing.length,
          keptExisting: paths.length - needing.length,
          plan,
        },
        null,
        2
      ) + "\n"
    );

    console.log(`\n${paths.length} paths · ${covers.length} covers`);
    console.log(
      `${needing.length} to assign · ${paths.length - needing.length} keeping an existing cover\n`
    );
    for (const r of plan) {
      const mark = r.keptExisting ? "keep" : "  → ";
      const cover = r.keptExisting ? "(existing import)" : r.cover.replace("/learn/covers/", "");
      console.log(`  ${mark} ${r.title.slice(0, 42).padEnd(44)} ${cover}`);
    }
    console.log(`\nPlan written to ${path.basename(PLAN_FILE)}`);

    if (!apply) {
      console.log("\nPLAN ONLY — nothing written. Re-run with --apply to commit it.\n");
      return;
    }

    let changed = 0;
    for (const r of plan) {
      if (r.keptExisting) continue;
      const row = paths.find((p) => p.slug === r.slug)!;
      if (row.cover_image === r.cover) continue;
      await prisma.learningPath.update({
        where: { id: row.id },
        data: { cover_image: r.cover },
      });
      changed++;
    }
    console.log(`\nAPPLIED — ${changed} path(s) updated, ${plan.length - changed} already correct.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
