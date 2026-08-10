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
 *   npm run learn:covers -- --apply --force --only=slug-a,slug-b
 *                                   re-assign JUST those paths, leave the rest
 *
 * ── SECOND PASS: PHOTOS EVERYWHERE ───────────────────────────────────────────
 *
 * The first pass left four paths on the designed title-card covers they were
 * imported with — the right call at the time, since overwriting a deliberate
 * cover with a stock photo is a regression. Seen together on the grid it was
 * the wrong call: four illustrated cards among nineteen photographs read as a
 * loading state, not as a deliberate distinction. All 23 are photos now.
 *
 * Two of the four slots are filled by the images excluded from the first pass
 * for carrying stock watermarks. RE-CHECKED AT FULL SOURCE RESOLUTION and they
 * are clean — no watermark at native size or at 2x on the bottom strip where
 * one would sit, no alpha channel, and a row-contrast profile matching a
 * known-clean control. Their files are also the two most recently modified in
 * the source folder, consistent with having been replaced.
 *
 * The other two reuse an image already in play, placed as far from the original
 * as the ordering allows — see `pickReuse`.
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
 * · Paths that ALREADY have a cover_image, unless `--force` says otherwise —
 *   and with `--only` that force is narrowed to named slugs, so a second pass
 *   can fix four paths without reshuffling the nineteen already reviewed and
 *   approved. Re-rolling settled assignments to change an unrelated one is how
 *   an approved plan quietly stops being the thing that was approved.
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
  /** Set when this slot had to share an image — names the other path holding it. */
  reusedFrom?: string;
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
  const only = (process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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

    /*
      WHICH PATHS ARE IN PLAY.

      A path with no cover is always assigned. A path that HAS one is left alone
      unless --force, and --only narrows that force to named slugs so a targeted
      second pass cannot disturb assignments already reviewed.
    */
    const isTarget = (p: (typeof paths)[number]) =>
      !p.cover_image || (force && (only.length === 0 || only.includes(p.slug)));

    if (only.length) {
      const unknown = only.filter((s) => !paths.some((p) => p.slug === s));
      if (unknown.length) throw new Error(`--only names unknown slug(s): ${unknown.join(", ")}`);
      if (!force) throw new Error("--only has no meaning without --force.");
    }

    const targets = paths.filter(isTarget);

    /*
      DETERMINISTIC ASSIGNMENT — unused images first, then the farthest reuse.

      21 covers, 23 paths, so two images must appear twice. Which two, and where,
      is decided rather than left to a modulo: every path not in play keeps what
      it has, the images nobody is holding go to the open slots in order, and a
      slot with nothing left to give it takes the image whose nearest existing
      use is FURTHEST away (`pickReuse`). On the current data that puts both
      repeats at the top of the grid against originals at the very bottom.

      Slug order throughout. It is the only field here that is unique, immutable
      and not editorial — ordering by title would reshuffle every assignment the
      next time somebody renames a path.
    */
    /*
      A TARGET STARTS EMPTY, and that blank is what makes re-running safe.

      Seeding a target with the cover it currently holds looks harmless and is
      not: `pickReuse` measures distance from images already in use, so a slot
      would see its OWN image sitting at distance zero and refuse to choose it
      again. The second run then picked something else, the third picked back —
      a plan that churns two paths every time it is regenerated, which is
      exactly the kind of quiet drift the approval step exists to prevent.

      Cleared, a re-run rebuilds the identical assignment from the identical
      inputs. Verified: second `--apply` reports 0 updated.
    */
    const plan: PlanRow[] = paths.map((p) => ({
      slug: p.slug,
      title: p.title,
      audience: p.audience,
      group: p.group,
      cover: isTarget(p) ? "" : p.cover_image ?? "",
      ...(isTarget(p) ? {} : { keptExisting: p.cover_image ?? undefined }),
    }));

    const held = new Set(
      plan.filter((r) => r.keptExisting).map((r) => r.cover)
    );
    const free = covers
      .map((c) => `/learn/covers/${c}`)
      .filter((c) => !held.has(c));

    /**
     * The image whose nearest current use is furthest from slot `at`.
     *
     * Ties break on the least-used image, then on name, so the plan is the same
     * every run — a plan that reshuffles on regeneration is not reviewable.
     */
    const pickReuse = (at: number): string => {
      const positions = new Map<string, number[]>();
      plan.forEach((r, n) => {
        if (!r.cover) return;
        positions.set(r.cover, [...(positions.get(r.cover) ?? []), n]);
      });
      const candidates = covers.map((c) => `/learn/covers/${c}`);
      return candidates
        .map((c) => {
          const pos = positions.get(c) ?? [];
          return {
            c,
            distance: pos.length ? Math.min(...pos.map((n) => Math.abs(n - at))) : Infinity,
            uses: pos.length,
          };
        })
        .sort((a, b) => b.distance - a.distance || a.uses - b.uses || a.c.localeCompare(b.c))[0].c;
    };

    for (let n = 0; n < plan.length; n++) {
      if (plan[n].keptExisting) continue;
      const next = free.shift();
      plan[n].cover = next ?? pickReuse(n);
      if (!next) {
        // The OTHER holder of this image — not this slot, which now also holds it.
        const other = plan.findIndex((r, m) => m !== n && r.cover === plan[n].cover);
        plan[n].reusedFrom = other >= 0 ? plan[other].title : "(unknown)";
      }
    }

    // Guard the one property the brief asks for by name.
    const adjacentClash = plan
      .map((r, n) => (n > 0 && r.cover === plan[n - 1].cover ? r.slug : null))
      .filter(Boolean);
    if (adjacentClash.length) {
      throw new Error(`Adjacent paths share a cover: ${adjacentClash.join(", ")}`);
    }

    const shared = [...new Set(plan.filter((r) => r.reusedFrom).map((r) => r.cover))];

    fs.writeFileSync(
      PLAN_FILE,
      JSON.stringify(
        {
          generated: "run `npm run learn:covers` to regenerate",
          covers: covers.length,
          paths: paths.length,
          assigned: targets.length,
          keptExisting: paths.length - targets.length,
          sharedImages: shared.length,
          plan,
        },
        null,
        2
      ) + "\n"
    );

    console.log(`\n${paths.length} paths · ${covers.length} covers`);
    console.log(
      `${targets.length} to assign · ${paths.length - targets.length} keeping an existing cover\n`
    );
    for (const r of plan) {
      const mark = r.keptExisting ? "keep" : "  → ";
      const cover = r.cover.replace("/learn/covers/", "");
      const note = r.reusedFrom ? `   (shared with "${r.reusedFrom}")` : "";
      console.log(`  ${mark} ${r.title.slice(0, 42).padEnd(44)} ${cover}${note}`);
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
      console.log(`  ${row.title}: ${row.cover_image ?? "(none)"} -> ${r.cover}`);
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
