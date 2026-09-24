import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ THE DEMAND SIGNAL (`P2-A4-E611` WS-C) ────────────────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"list them and mix them down only if there is an
 * interest."* ⚠ **Absence of requests is not absence of demand when there is no
 * request button.** This module is the button's one rule.
 *
 * ⚠⚠⚠ WHAT IT DOES NOT DO, AND MUST NEVER DO: promise anything. No date, no
 * ETA, no queue position, no *"we'll email you"*. ⚠ **Nothing emails anybody
 * when a video lands — there is no writer for that** — so a page may not say
 * one will.
 */

/**
 * Record that this member wants this path produced, or withdraw it.
 *
 * ⚠⚠ IDEMPOTENT BY CONSTRUCTION, NOT BY MEMORY. `@@unique([user_id,
 * learning_path_id])` means the database refuses a second row; the upsert
 * cannot double-count however many times the button is pressed.
 * ⚠⚠⚠ A WITHDRAWAL FLIPS `wanted`, IT DOES NOT DELETE. Deleting would erase the
 * rows the count reads, so the figure could never fall for a stated reason —
 * the same defect `E528`'s consumed-not-deleted tokens fixed.
 */
export async function setPathInterest(
  userId: string,
  learningPathId: string,
  wanted: boolean
): Promise<void> {
  await prisma.pathInterest.upsert({
    where: {
      user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId },
    },
    create: { user_id: userId, learning_path_id: learningPathId, wanted },
    update: { wanted },
  });
}

/**
 * How many people are waiting on this path, and whether THIS member is one.
 *
 * ⚠ `wanted: true` ONLY — a withdrawn row is history, not a vote. ⚠⚠ The row
 * still exists, which is the point; it is simply not counted.
 */
export async function pathInterestFor(
  userId: string | null,
  learningPathId: string
): Promise<{ count: number; mine: boolean }> {
  const [count, mine] = await Promise.all([
    prisma.pathInterest.count({
      where: { learning_path_id: learningPathId, wanted: true },
    }),
    userId
      ? prisma.pathInterest.findUnique({
          where: {
            user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId },
          },
          select: { wanted: true },
        })
      : Promise.resolve(null),
  ]);
  return { count, mine: mine?.wanted === true };
}

/**
 * ── ⚠⚠ THE PRODUCTION QUEUE — WHAT SCOTT READS ──────────────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"Sorted by what it costs to finish, then by demand —
 * recorded before planned, then votes. That is the production queue."*
 *
 * ⚠⚠⚠ A COUNT THAT LANDS IN A TABLE NOBODY HAS A SCREEN FOR IS THE SAME AS
 * LOSING IT. This function exists so the admin Learn console can show the
 * queue; it is not a report that runs into a log.
 *
 * ⚠ THE COST ORDER IS DERIVED FROM THE LESSONS, never stored: a path whose
 * unplayable lessons are mostly `recorded` is hours from shipping, one whose
 * lessons are `planned` is days. ⚠⚠ The 59 that falsely claim a URL are counted
 * as NEITHER — their real state is what Scott still has to rule on, and
 * guessing here would be the fabricated figure this whole day removed.
 */
export type QueueRow = {
  id: string;
  title: string;
  slug: string;
  /** ⚠ Lessons at `RAW_SHOT` or past it, with no `vimeo_ref`. Hours of work. */
  recorded: number;
  /** ⚠ Lessons that were never shot. Days of work. */
  planned: number;
  /** ⚠⚠ The 59 — status claims a URL, none stored. **Scott's call, not ours.** */
  unpublished: number;
  /** People waiting. `wanted: true` only. */
  votes: number;
};

export async function productionQueue(): Promise<QueueRow[]> {
  const { lessonState } = await import("@/lib/learn");
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      courses: {
        select: {
          sections: {
            select: { lessons: { select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
      _count: { select: { interest: { where: { wanted: true } } } },
    },
  });

  const rows: QueueRow[] = paths.map((p) => {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    let recorded = 0;
    let planned = 0;
    let unpublished = 0;
    for (const l of lessons) {
      const state = lessonState(l);
      if (state === "recorded") recorded += 1;
      else if (state === "planned") planned += 1;
      else if (state === "unpublished") unpublished += 1;
    }
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      recorded,
      planned,
      unpublished,
      votes: p._count.interest,
    };
  });

  /* ⚠ A path with nothing outstanding is not in a production queue. */
  return rows
    .filter((r) => r.recorded + r.planned + r.unpublished > 0)
    /* ⚠⚠ COST FIRST, THEN DEMAND — Scott's order, in that order. A path with
       recorded material outranks one without, however many votes the second
       has, because finishing it is hours rather than days. */
    .sort(
      (a, b) =>
        Number(b.recorded > 0) - Number(a.recorded > 0) ||
        b.votes - a.votes ||
        b.recorded - a.recorded ||
        a.title.localeCompare(b.title)
    );
}
