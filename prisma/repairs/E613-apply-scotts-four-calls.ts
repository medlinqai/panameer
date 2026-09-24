import { writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { urlMissing } from "../../src/lib/learn";

/**
 * ── ⚠⚠⚠ `P2-A4-E613` WS-A — SCOTT'S FOUR CALLS, APPLIED ──────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-24: **`How to Implement` was FILMED** (footage exists,
 * needs editing). **End-to-End Business Processing, How to Configure and
 * Implementers were NEVER SHOT.**
 *
 * ⚠⚠⚠ IT WRITES ONE COLUMN — `Lesson.production_status` — AND NOTHING ELSE.
 * No title, no description, no ordering, no `vimeo_ref`, no create, no delete,
 * and `LearningPath` is not touched at all. That is the brief's single carve-out
 * from the standing "do not touch the catalogue" rule.
 *
 * ⚠ IT ONLY TOUCHES LESSONS THAT ARE **AMBER** — `urlMissing`, i.e. the stored
 * status claims a URL was added and `vimeo_ref` is empty. A lesson already
 * telling the truth is left exactly as it is.
 *
 * ⚠⚠ AND ONLY INSIDE THE FOUR PATHS SCOTT RULED ON. Measured 2026-09-24: **59
 * lessons are amber catalogue-wide, 41 of them in these four.** ⚠⚠⚠ **THE
 * OTHER 18 ARE NOT TOUCHED** — nobody has said whether they were shot, and
 * picking a rung for them would be the fabricated figure this whole brief
 * exists to remove.
 *
 * ⚠ RUN WITH `--dry` FIRST. The dry pass prints every row it would change and
 * writes nothing. ⚠⚠ THE UNDO FILE IS WRITTEN BEFORE THE WRITE (`E553`'s
 * pattern) and carries each lesson's prior value.
 */
const DRY = process.argv.includes("--dry");

/** ⚠ Scott's four calls, by path title. Nothing is defaulted. */
const CALLS: { title: string; shot: boolean }[] = [
  { title: "How to Implement", shot: true },
  { title: "End-to-End Business Processing (Buying Channels)", shot: false },
  { title: "How to Configure", shot: false },
  { title: "Implementers", shot: false },
];

/** ⚠⚠ `RAW_SHOT` IS THE LADDER'S WORD FOR SCOTT'S: shot, not mixed. */
const FILMED = "RAW_SHOT";
/** ⚠ `IN_CONCEPT` is the first rung — written, not shot. */
const NEVER_SHOT = "IN_CONCEPT";

async function main() {
  const before = await prisma.lesson.groupBy({ by: ["production_status"], _count: true });
  const lessonsBefore = await prisma.lesson.count();
  const pathsBefore = await prisma.learningPath.count();

  const touched: {
    id: string;
    path: string;
    lesson: string;
    from: string;
    to: string;
  }[] = [];

  for (const call of CALLS) {
    const path = await prisma.learningPath.findFirst({
      where: { title: call.title },
      select: {
        title: true,
        courses: {
          select: {
            sections: {
              select: {
                lessons: {
                  select: { id: true, title: true, vimeo_ref: true, production_status: true },
                },
              },
            },
          },
        },
      },
    });
    if (!path) {
      console.log(`⚠⚠ NO PATH TITLED "${call.title}" — nothing applied. This is a STOP.`);
      continue;
    }
    const lessons = path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    /* ⚠ AMBER ONLY — the extracted predicate, never a restatement of it. */
    const amber = lessons.filter(urlMissing);
    const to = call.shot ? FILMED : NEVER_SHOT;
    for (const l of amber) {
      touched.push({
        id: l.id,
        path: path.title,
        lesson: l.title,
        from: l.production_status,
        to,
      });
    }
    console.log(
      `${call.shot ? "FILMED     " : "NEVER SHOT "} "${path.title}" — ${amber.length} amber lesson(s) -> ${to}`
    );
  }

  console.log(`\n${DRY ? "would change" : "changing"} ${touched.length} lesson(s)`);
  if (DRY) {
    console.log("(dry run — nothing written)");
    await prisma.$disconnect();
    return;
  }

  /* ⚠⚠ THE UNDO FILE LANDS BEFORE THE WRITE. */
  const undo = `prisma/repairs/E613-undo-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(undo, JSON.stringify(touched, null, 2));
  console.log(`undo file written: ${undo}`);

  for (const t of touched) {
    await prisma.lesson.update({
      where: { id: t.id },
      /* ⚠⚠⚠ ONE COLUMN. Adding a second field here is the whole defect. */
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
  console.log(`\nLesson rows       ${lessonsBefore} -> ${lessonsAfter}  ${lessonsBefore === lessonsAfter ? "IDENTICAL ✓" : "⚠⚠ CHANGED"}`);
  console.log(`LearningPath rows ${pathsBefore} -> ${pathsAfter}  ${pathsBefore === pathsAfter ? "IDENTICAL ✓" : "⚠⚠ CHANGED"}`);

  const stillAmber = await prisma.lesson.findMany({
    select: { vimeo_ref: true, production_status: true },
  });
  console.log(`\namber catalogue-wide: ${stillAmber.filter(urlMissing).length} (was 59; the 18 outside Scott's four paths are untouched)`);
  await prisma.$disconnect();
}
main();
