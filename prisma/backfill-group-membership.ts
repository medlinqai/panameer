import { prisma } from "../src/lib/prisma";

/**
 * ── ⚠⚠⚠ BACKFILL: THE 23 PATH GROUPS FROM EXISTING ENROLMENTS (`P2-A3-E612`)
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"Backfill the 23 path-backed groups from existing
 * enrolments, so nobody loses access the moment access starts being read from
 * the new table. Report the row count, and **prove nobody gained access who did
 * not have it before**."*
 *
 * ⚠⚠⚠ IT WRITES ONLY `GroupMembership` ROWS AND `ForumBoard.type`. It does not
 * touch `Lesson`, `LearningPath`, `LearnEnrollment` or any member's data.
 *
 * ⚠ RUN IT WITH `--dry` FIRST. The dry pass prints exactly what the real pass
 * would write and changes nothing.
 */
const DRY = process.argv.includes("--dry");

async function main() {
  const boards = await prisma.forumBoard.findMany({
    select: { id: true, slug: true, title: true, learning_path_id: true, type: true },
  });
  const pathBoards = boards.filter((b) => b.learning_path_id);
  const general = boards.filter((b) => !b.learning_path_id);

  console.log(
    `boards: ${boards.length} — ${pathBoards.length} path-backed, ${general.length} general`
  );

  /*
    ── ⚠⚠ EVERY BOARD GETS AN EXPLICIT TYPE ───────────────────────────────
    ⚠ Scott: *"none is left to a default that means 'nobody decided'."*
    ⚠⚠ ALL OF THEM ARE `OPEN`, FOR TWO DIFFERENT REASONS:
      · a PATH group's door is enrolment, and enrolment is open to anyone;
      · the 4 GENERAL groups are the product's own public rooms and are
        OWNERLESS (`host_person_id` is null on all four, measured 2026-09-23),
        so ⚠⚠⚠ **an approval queue nobody staffs is worse than an open door.**
  */
  const needType = boards.filter((b) => b.type !== "OPEN");
  console.log(`boards needing an explicit OPEN: ${needType.length}`);

  /*
    ⚠⚠⚠ THE BEFORE SET — WHO COULD READ EACH PATH BOARD, COMPUTED THE OLD WAY.
    ⚠ It is derived from the SAME two facts `canAccessPathForum` reads —
    enrolment and teaching — because the proof Scott asked for is that the set
    does not change, and a proof against a different rule proves nothing.
  */
  const before = new Map<string, Set<string>>();
  for (const b of pathBoards) {
    const [enrolled, taught] = await Promise.all([
      prisma.learnEnrollment.findMany({
        where: { learning_path_id: b.learning_path_id! },
        select: { user: { select: { person: { select: { id: true } } } } },
      }),
      prisma.person.findMany({
        where: {
          OR: [
            { learnPaths: { some: { id: b.learning_path_id! } } },
            {
              learnLessons: {
                some: { section: { course: { learning_path_id: b.learning_path_id! } } },
              },
            },
          ],
        },
        select: { id: true },
      }),
    ]);
    const set = new Set<string>();
    for (const e of enrolled) if (e.user.person?.id) set.add(e.user.person.id);
    for (const p of taught) set.add(p.id);
    before.set(b.id, set);
  }

  const totalBefore = [...before.values()].reduce((n, s) => n + s.size, 0);
  console.log(`people who could read a path board before: ${totalBefore} (board,person) pairs`);

  /*
    ⚠⚠ ONLY ENROLMENT WRITES A MEMBERSHIP ROW, NOT TEACHING. An instructor is in
    the room because they teach it, and `canAccessPathForum` still says so —
    ⚠⚠⚠ **writing them a membership row would state that they JOINED, which is
    not what happened.** The access set is unchanged either way, and that is the
    proof below.
  */
  let written = 0;
  for (const b of pathBoards) {
    const enrolled = await prisma.learnEnrollment.findMany({
      where: { learning_path_id: b.learning_path_id! },
      select: { user: { select: { person: { select: { id: true } } } } },
    });
    for (const e of enrolled) {
      const personId = e.user.person?.id;
      if (!personId) continue;
      written += 1;
      if (DRY) continue;
      await prisma.groupMembership.upsert({
        where: { board_id_person_id: { board_id: b.id, person_id: personId } },
        create: {
          board_id: b.id,
          person_id: personId,
          route: "BY_ENROLMENT",
          state: "ACTIVE",
          auto_approved: true,
        },
        update: { state: "ACTIVE" },
      });
    }
  }
  console.log(`${DRY ? "would write" : "wrote"} ${written} membership rows`);

  if (!DRY && needType.length > 0) {
    const r = await prisma.forumBoard.updateMany({
      where: { id: { in: needType.map((b) => b.id) } },
      data: { type: "OPEN" },
    });
    console.log(`set an explicit type on ${r.count} boards`);
  }

  /*
    ── ⚠⚠⚠ THE PROOF: NOBODY GAINED ACCESS ────────────────────────────────
    ⚠ The AFTER set is the union of the membership table and the teaching rule —
    which is what access reads once membership exists. It must EQUAL the before
    set exactly, in BOTH directions: a gain is a security hole, a loss locks
    somebody out of a room they were in.
  */
  let gained = 0;
  let lost = 0;
  for (const b of pathBoards) {
    const members = DRY
      ? []
      : await prisma.groupMembership.findMany({
          where: { board_id: b.id, state: "ACTIVE" },
          select: { person_id: true },
        });
    const taught = await prisma.person.findMany({
      where: {
        OR: [
          { learnPaths: { some: { id: b.learning_path_id! } } },
          {
            learnLessons: {
              some: { section: { course: { learning_path_id: b.learning_path_id! } } },
            },
          },
        ],
      },
      select: { id: true },
    });
    const after = new Set<string>([...members.map((m) => m.person_id), ...taught.map((p) => p.id)]);
    const b4 = before.get(b.id)!;
    for (const id of after) if (!b4.has(id)) gained += 1;
    for (const id of b4) if (!after.has(id)) lost += 1;
  }
  console.log(`access gained by nobody: ${gained === 0 ? "PROVEN" : `⚠⚠ ${gained} GAINED`}`);
  console.log(`access lost by nobody:   ${lost === 0 ? "PROVEN" : `⚠⚠ ${lost} LOST`}`);

  await prisma.$disconnect();
}

main();
