import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../../src/lib/prisma";
import { ensurePathBoard } from "../../src/lib/forums";

/**
 * ── ⚠⚠⚠ `P2-A4-E683` WS-B — THE FOUNDATIONS FOLD. A DATA REPAIR. ─────────
 *
 * ⚠⚠⚠ **THIS WRITES TO THE ONE DATABASE THAT ALSO SERVES PRODUCTION** (ruling
 * 38, `ofkctqkhclnaihnmbyfx`). ⚠ **AUTHORISED BY SCOTT IN A MESSAGE THAT NAMES
 * THIS WORKSTREAM, 2026-09-26:** *"WS-B is authorised by this message — the
 * Foundations fold, `E655`'s pattern: undo file written first, compare by id,
 * no deletes, the four old paths left unpublished rather than removed."*
 *
 * ── ⚠⚠ `E655`'s PATTERN, ALL FOUR PARTS ──────────────────────────────────
 * 1. ⚠⚠ **THE UNDO FILE IS WRITTEN BEFORE THE WRITE**, not after. A repair that
 *    records what it did only once it has succeeded has no record of the case
 *    that matters.
 * 2. ⚠⚠⚠ **EVERY COMPARISON IS BY ID, NEVER BY COUNT — A COUNT MISSES A SWAP.**
 *    The precheck names the four path ids and their four course ids and refuses
 *    on any difference, including a difference of one.
 * 3. ⚠ **NO DELETES.** The four old paths are left in place with
 *    `status: DRAFT`; their forum boards, their expert attribution and their
 *    assessment are untouched (rule 5 — they may be somebody's only entrance).
 * 4. ⚠ Row counts reported before and after.
 *
 * ── ⚠⚠ WHAT THIS SCRIPT DELIBERATELY DOES **NOT** DO ────────────────────
 *
 * ⚠⚠⚠ **IT DOES NOT MOVE THE ASSESSMENT, AND THAT IS A REPORTED CONSEQUENCE,
 * NOT AN OVERSIGHT.** `1. Background` owns a generated, reviewed
 * `LearnAssessment`, and `LearnAssessment` is 1:1 with a path. Unpublishing
 * that path makes its test unreachable. ⚠ **Moving a test is a different act
 * from folding courses and Scott did not authorise it**, so the row is left
 * exactly where it is and the consequence is reported. **Nobody has taken it —
 * `LessonProgress` holds 0 rows — so nothing is lost today.**
 *
 * ⚠⚠ **IT SETS NO `expert_person_id` ON THE NEW PATH.** The four carry two
 * different experts between them and two carry none; picking one would
 * attribute four people's courses to a single person. ⚠ A null expert is the
 * honest answer, and **`learn_lessons.expert_person_id` is untouched**, so
 * load-bearing rule 10's protected set is unaffected by this repair.
 *
 * ⚠ **THE TITLE IS THE BRIEF'S OWN WORD, NOT AN INVENTION**, and it is Scott's
 * to change: premise 1 names the absent thing as `Oracle Cloud Foundations`.
 * ⚠⚠ Because the starter is chosen by a FLAG, **renaming this path later is a
 * one-row data edit and changes no code** — which is the entire point of WS-A.
 */

const PATHS = {
  "d2329e96-dbdc-422b-81f5-2e1f2a2caa4f": {
    title: "1. Background",
    course: "2b99319d-0828-4298-bcf9-6d39d2f70d7e",
  },
  "15e83bc9-146c-4746-8846-a01313e3f1f8": {
    title: "2. Overview",
    course: "bfc376ce-c484-42af-9438-265f0b37ab95",
  },
  "b39fd678-9540-4e22-ba5e-76af49a55b2a": {
    title: "3. Roles & Careers",
    course: "5717a554-188b-4048-acc5-a151027624c7",
  },
  "4f036a44-a060-4d1b-847e-3847c2a5f150": {
    title: "4. How to Login & Get Started",
    course: "c3ee94ac-b579-4e9a-b947-d5e910c0495a",
  },
} as const;
/** ⚠ The order is the fold's order and it is the paths' existing `sort_order`. */
const ORDER = Object.keys(PATHS) as (keyof typeof PATHS)[];

const NEW_TITLE = "Oracle Cloud Foundations";
const NEW_SLUG = "oracle-cloud-foundations";
const UNDO = join("prisma", "repairs", "E683-foundations-fold-2026-09-26.json");

function die(why: string): never {
  console.error(`\n⚠⚠⚠ REFUSED — ${why}\n   Nothing was written.`);
  process.exit(1);
}

async function main() {
  const apply = process.argv.includes("--apply");

  /* ── 1 · PRECHECK, BY ID ───────────────────────────────────────────────── */
  const before = {
    paths: await prisma.learningPath.count(),
    courses: await prisma.course.count(),
    published: await prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
  };
  console.log("BEFORE:", JSON.stringify(before));

  const four = await prisma.learningPath.findMany({
    where: { id: { in: ORDER as unknown as string[] } },
    select: {
      id: true,
      title: true,
      status: true,
      audience: true,
      pillar: true,
      group: true,
      sort_order: true,
      courses: { select: { id: true, title: true, sort_order: true } },
    },
  });
  if (four.length !== 4) die(`expected 4 paths by id, found ${four.length}`);
  for (const p of four) {
    const want = PATHS[p.id as keyof typeof PATHS];
    if (!want) die(`unexpected path id ${p.id}`);
    if (p.title.trim() !== want.title) die(`path ${p.id} is titled "${p.title}", expected "${want.title}"`);
    if (p.status !== "PUBLISHED") die(`path ${p.id} is ${p.status}, expected PUBLISHED`);
    /* ⚠⚠ "DIFFERS BY ONE" IS EXACTLY WHAT THIS CATCHES — a fifth course added
       to one of these paths since the stop gate would change what the fold
       means, so the repair refuses rather than guessing. */
    if (p.courses.length !== 1) die(`path ${p.id} has ${p.courses.length} courses, expected exactly 1`);
    if (p.courses[0].id !== want.course) die(`path ${p.id} holds course ${p.courses[0].id}, expected ${want.course}`);
  }
  if (await prisma.learningPath.count({ where: { slug: NEW_SLUG } }))
    die(`slug "${NEW_SLUG}" already exists — this repair has already run`);
  console.log("PRECHECK: 4 paths, 4 courses, every id matches the stop gate. ✓");

  /* ── 2 · ⚠⚠ THE UNDO FILE, WRITTEN BEFORE ANYTHING IS WRITTEN ─────────── */
  const undo = {
    id: "P2-A4-E683 WS-B — the Foundations fold",
    written_at: new Date().toISOString(),
    database: "ofkctqkhclnaihnmbyfx (the one database — also serves production)",
    how_to_undo: [
      "1. For each course below, set learning_path_id and sort_order back to `was`.",
      "2. For each path below, set status back to `was_status` (PUBLISHED).",
      "3. Delete the created path named in `created_slug` — and its forum board.",
      "⚠ NOTHING WAS DELETED BY THE REPAIR, so the undo only reverses moves and statuses.",
    ],
    created_slug: NEW_SLUG,
    paths: four.map((p) => ({ id: p.id, title: p.title, was_status: p.status })),
    courses: four.map((p) => ({
      id: p.courses[0].id,
      title: p.courses[0].title,
      was: { learning_path_id: p.id, sort_order: p.courses[0].sort_order },
    })),
    not_touched: {
      assessment_on_1_background:
        "CertificationTest stays attached to 1. Background, which becomes DRAFT. Its test is then unreachable. Reported, not moved — Scott did not authorise moving a test.",
      experts: "learn_lessons.expert_person_id untouched (load-bearing rule 10).",
      old_forum_boards: "left in place on the four unpublished paths.",
    },
  };
  /*
    ── ⚠⚠⚠ THREE MODES, BECAUSE "WRITTEN FIRST" MEANS **COMMITTED** FIRST ───

    ⚠⚠ `E553`'s undo file was *"committed BEFORE the write (`7b46004`)"*, and a
    file that appears and is used in the same second has not been preserved
    against the case that matters — the run that dies halfway. ⚠ So:
      · (no flag)      — dry run, writes nothing, prints the precheck.
      · `--write-undo` — writes the undo JSON **and stops**, so it can be
                         committed while the database is still untouched.
      · `--apply`      — **REQUIRES** that file to already exist, and re-verifies
                         it still describes the database before folding.
    ⚠⚠⚠ **THE APPLY READING THE FILE IT WILL BE JUDGED AGAINST IS THE POINT:**
    if anything moved between the two runs, the ids no longer match and it
    refuses.
  */
  if (process.argv.includes("--write-undo")) {
    if (existsSync(UNDO)) die(`${UNDO} already exists — refusing to overwrite an undo file`);
    writeFileSync(UNDO, JSON.stringify(undo, null, 2));
    console.log(`\nUNDO FILE WRITTEN: ${UNDO}`);
    console.log("⚠ COMMIT IT NOW, then re-run with --apply. Nothing has been written to the database.");
    await prisma.$disconnect();
    return;
  }
  if (!apply) {
    console.log(`\nDRY RUN. Nothing written. Next: --write-undo, commit, then --apply.`);
    console.log(JSON.stringify(undo, null, 2).slice(0, 900));
    await prisma.$disconnect();
    return;
  }
  if (!existsSync(UNDO))
    die(`${UNDO} does not exist — the undo file is written and COMMITTED before the fold, never alongside it`);
  /* ⚠⚠ AND IT MUST STILL DESCRIBE THIS DATABASE. A shape that moved between the
     two runs means the ids in that file no longer undo what is about to happen. */
  const onDisk = JSON.parse(readFileSync(UNDO, "utf8")) as typeof undo;
  const sameCourses =
    onDisk.courses.length === undo.courses.length &&
    onDisk.courses.every((c) =>
      undo.courses.some(
        (n) => n.id === c.id && n.was.learning_path_id === c.was.learning_path_id
      )
    );
  if (!sameCourses) die("the committed undo file no longer matches the database — refusing");
  console.log(`UNDO FILE PRESENT AND STILL ACCURATE: ${UNDO}`);

  /* ── 3 · THE FOLD ──────────────────────────────────────────────────────── */
  const created = await prisma.$transaction(async (tx) => {
    const path = await tx.learningPath.create({
      data: {
        title: NEW_TITLE,
        slug: NEW_SLUG,
        /* ⚠ All four are BEGINNERS — measured, they agree. */
        audience: "BEGINNERS",
        /* ⚠ Three of four are FOUNDATIONS; the fourth is null. The fold takes
           the majority value, which is also the only non-null one. */
        pillar: "FOUNDATIONS",
        group: "Foundational Learning Paths",
        summary: null,
        status: "PUBLISHED",
        sort_order: 1,
        /* ⚠⚠ NO EXPERT — see the docblock. */
        expert_person_id: null,
        /* ⚠ A human made this, so an XLS re-run must leave it alone. */
        is_custom: true,
      },
      select: { id: true, title: true, slug: true, summary: true },
    });

    for (const [i, pid] of ORDER.entries()) {
      await tx.course.update({
        where: { id: PATHS[pid].course },
        data: { learning_path_id: path.id, sort_order: i + 1 },
      });
    }
    await tx.learningPath.updateMany({
      where: { id: { in: ORDER as unknown as string[] } },
      data: { status: "DRAFT" },
    });
    return path;
  });
  console.log(`CREATED path ${created.id} "${created.title}"`);

  /*
    ⚠⚠ THE FORUM BOARD COMES FROM THE EXISTING WRITER, NOT FROM A SECOND
    IMPLEMENTATION (`E585`). Measured: **all 23 paths have a board**, so a
    raw-inserted path would be the only one without one. ⚠ No owner is passed —
    `ensurePathBoard` falls back to the Panameer owner, which is the documented
    behaviour for a path with no declared lead (`E572`).
  */
  await ensurePathBoard(prisma, created);
  console.log("FORUM BOARD ensured via ensurePathBoard (the one writer).");

  /* ── 4 · VERIFY BY ID ──────────────────────────────────────────────────── */
  let bad = 0;
  for (const [i, pid] of ORDER.entries()) {
    const c = await prisma.course.findUnique({
      where: { id: PATHS[pid].course },
      select: { learning_path_id: true, sort_order: true },
    });
    const ok = c?.learning_path_id === created.id && c.sort_order === i + 1;
    if (!ok) bad += 1;
    console.log(`  course ${PATHS[pid].course} -> path ${c?.learning_path_id} sort ${c?.sort_order} ${ok ? "✓" : "✗"}`);
  }
  const stillPublished = await prisma.learningPath.count({
    where: { id: { in: ORDER as unknown as string[] }, status: "PUBLISHED" },
  });
  const boards = await prisma.forumBoard.count({ where: { learning_path_id: created.id } });
  const after = {
    paths: await prisma.learningPath.count(),
    courses: await prisma.course.count(),
    published: await prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
  };
  console.log("AFTER:", JSON.stringify(after));
  console.log(`  old paths still PUBLISHED: ${stillPublished} (expect 0)`);
  console.log(`  forum boards on the new path: ${boards} (expect 1)`);
  console.log(`  courses on the new path: ${await prisma.course.count({ where: { learning_path_id: created.id } })} (expect 4)`);
  console.log(`  ⚠ NOTHING DELETED: paths ${before.paths} -> ${after.paths} (+1), courses ${before.courses} -> ${after.courses} (unchanged)`);
  if (bad > 0 || stillPublished !== 0) {
    console.error(`\n⚠⚠⚠ VERIFICATION FAILED — ${bad} courses wrong, ${stillPublished} still published. UNDO: ${UNDO}`);
    process.exitCode = 1;
  } else {
    console.log("\n✓ Verified by id. Known-good, not assumed-good.");
  }
  await prisma.$disconnect();
}

main();
