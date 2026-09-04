import { prisma } from "@/lib/prisma";
import { ensurePathBoard } from "@/lib/forums";

/**
 * BACKFILL — a forum for every learning path that predates the column
 * (`P1-J3-E383`).
 *
 * SCOTT, 2026-09-04: *"every learning path should have a forum."*
 *
 * ⚠ `createPath()` and `prisma/seed-learn.ts` both create the board from now
 * on. This is only for the paths that already existed without one.
 *
 * ⚠⚠ IDEMPOTENT, THE SAME SHAPE `ensureBoards()` USES — `ensurePathBoard` upserts
 * by slug, so running this twice makes nothing twice. That is deliberate: a
 * one-shot script somebody has to remember not to re-run is a script that gets
 * re-run.
 *
 * ⚠ IT COVERS DRAFTS TOO, not just published paths. A draft's instructor is
 * exactly who should be able to open its forum while they are still recording
 * it — `canAccessPathForum` deliberately does not filter on status.
 */
async function main() {
  const paths = await prisma.learningPath.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      status: true,
      forumBoards: { select: { id: true } },
    },
    orderBy: { title: "asc" },
  });

  let created = 0;
  let already = 0;
  for (const p of paths) {
    const had = p.forumBoards.length > 0;
    await ensurePathBoard(prisma, p);
    if (had) already += 1;
    else created += 1;
  }

  console.log(`learning paths:        ${paths.length}`);
  console.log(`  boards CREATED:      ${created}`);
  console.log(`  already had one:     ${already}`);

  /* ⚠ THE INVARIANT, RE-READ FROM THE DATABASE rather than inferred from the
     loop above — the whole point of a backfill is that the end state is right,
     not that the script thought it did the right thing. */
  const boards = await prisma.forumBoard.count({
    where: { learning_path_id: { not: null } },
  });
  const general = await prisma.forumBoard.count({ where: { learning_path_id: null } });
  const dupes = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `select count(*)::bigint as n from (
       select learning_path_id from forum_boards
       where learning_path_id is not null
       group by learning_path_id having count(*) > 1
     ) d`
  );
  console.log(`path boards now:       ${boards}`);
  console.log(`general boards now:    ${general}  (must be 4)`);
  console.log(`⚠ paths with >1 board: ${dupes[0].n}  (must be 0)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
