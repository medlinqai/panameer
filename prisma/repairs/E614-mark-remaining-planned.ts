import { writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { urlMissing } from "../../src/lib/learn";

/**
 * ── ⚠⚠⚠ `P2-A4-E614` — THE LAST 18 FALSE VIDEO CLAIMS ────────────────────
 *
 * ⚠⚠ SCOTT, RULING 19, 2026-09-24: **"NONE OF THEM WERE FILMED. Mark all 18
 * `Planned`."**
 *
 * ⚠ `E613` applied Scott's four path-level calls and deliberately left these
 * 18 alone, because nobody had said whether they were shot and choosing a rung
 * would have been a fabricated figure. ⚠⚠ **RULING 19 IS THAT MISSING CALL.**
 *
 * ── ⚠⚠ SAME METHOD AS `E613`, NOT A NEW ONE ──────────────────────────────
 *
 * ⚠ Undo file written BEFORE the write · `production_status` the ONLY column
 * touched · row counts proven identical afterwards (522 lessons, 23 paths) ·
 * no `Lesson` created, none deleted, `LearningPath` not touched at all.
 *
 * ── ⚠⚠⚠ IT IS DERIVED, NOT A LIST OF IDS ─────────────────────────────────
 *
 * ⚠ The population is **every lesson `urlMissing` says is amber**, wherever it
 * is. ⚠⚠ A hard-coded list of 18 ids would be right only until somebody
 * corrected one by hand, and would silently skip a nineteenth. **The predicate
 * is the same one the page and the gate use** (`E585` — one rule, imported).
 *
 * ⚠⚠ THE `Duplicate Initiative` ROW IS **NOT** DELETED. Scott ruled on the
 * VIDEO CLAIM only. Whether that row should exist at all is a separate
 * question and is reported separately, not acted on here.
 *
 * ⚠ RUN WITH `--dry` FIRST.
 */
const DRY = process.argv.includes("--dry");

/** ⚠ `IN_CONCEPT` is the ladder's first rung — written, not shot. `Planned`. */
const NEVER_SHOT = "IN_CONCEPT";

async function main() {
  const before = await prisma.lesson.groupBy({ by: ["production_status"], _count: true });
  const lessonsBefore = await prisma.lesson.count();
  const pathsBefore = await prisma.learningPath.count();

  const rows = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      vimeo_ref: true,
      production_status: true,
      section: {
        select: { course: { select: { learningPath: { select: { title: true } } } } },
      },
    },
  });
  const amber = rows.filter(urlMissing);

  const touched = amber.map((l) => ({
    id: l.id,
    path: l.section.course.learningPath.title,
    lesson: l.title,
    from: l.production_status,
    to: NEVER_SHOT,
  }));

  const byPath = new Map<string, number>();
  for (const t of touched) byPath.set(t.path, (byPath.get(t.path) ?? 0) + 1);
  for (const [p, n] of [...byPath].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(3)}  ${p}`);
  console.log(`\n${DRY ? "would change" : "changing"} ${touched.length} lesson(s) -> ${NEVER_SHOT}`);

  if (DRY) {
    console.log("(dry run — nothing written)");
    await prisma.$disconnect();
    return;
  }

  const undo = `prisma/repairs/E614-undo-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(undo, JSON.stringify(touched, null, 2));
  console.log(`undo file written: ${undo}`);

  for (const t of touched) {
    await prisma.lesson.update({
      where: { id: t.id },
      /* ⚠⚠⚠ ONE COLUMN. A second field here is the whole defect. */
      data: { production_status: t.to as never },
    });
  }

  const after = await prisma.lesson.groupBy({ by: ["production_status"], _count: true });
  const lessonsAfter = await prisma.lesson.count();
  const pathsAfter = await prisma.learningPath.count();
  const fmt = (d: { production_status: string; _count: number }[]) =>
    Object.fromEntries(d.map((x) => [x.production_status, x._count]));

  console.log("\nBEFORE:", JSON.stringify(fmt(before as never)));
  console.log("AFTER: ", JSON.stringify(fmt(after as never)));
  console.log(
    `\nLesson rows       ${lessonsBefore} -> ${lessonsAfter}  ${lessonsBefore === lessonsAfter ? "IDENTICAL ✓" : "⚠⚠ CHANGED"}`
  );
  console.log(
    `LearningPath rows ${pathsBefore} -> ${pathsAfter}  ${pathsBefore === pathsAfter ? "IDENTICAL ✓" : "⚠⚠ CHANGED"}`
  );

  const recheck = await prisma.lesson.findMany({
    select: { vimeo_ref: true, production_status: true },
  });
  const left = recheck.filter(urlMissing).length;
  console.log(`\ncatalogue-wide false video claims: ${left}  ${left === 0 ? "ZERO ✓" : "⚠⚠ NOT ZERO"}`);
  await prisma.$disconnect();
}
main();
