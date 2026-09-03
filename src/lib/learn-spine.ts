import { isPlayable } from "@/lib/learn";

/**
 * THE SPINE — the graphic that picks a path (`P1-J3-E364` WS-4).
 *
 * **SCOTT, 2026-09-02:** *"if there was a graphic that could show me [courses and
 * lessons] in a minute, that would really help me choose the right path quickly —
 * which is all this page really needs to do."*
 *
 * ── ⚠⚠ WHY A PROPORTIONAL BAR AND NOT A NUMBER ───────────────────────────────
 *
 * Inventory Management is nine courses of 5 · 5 · 5 · 5 · 6 · 11 · 9 · 3 · 1
 * (measured, live). A learner seeing that as a bar takes in *eight even chunks,
 * one big middle course, and a stub at the end that isn't shot* in one glance. No
 * number on the page conveys the SHAPE of a path, and the shape is what somebody
 * choosing between paths is actually comparing.
 *
 * ── ⚠⚠ THE STRUCTURE IS QUERIED, NEVER INVENTED ──────────────────────────────
 *
 * `buildSpine` returns `null` when a path has no resolvable courses or no
 * playable lessons at all. ⚠ THE CALLER MUST RENDER NO SPINE IN THAT CASE AND THE
 * BUILD REPORTS IT — a plausible-looking bar over data we could not resolve is
 * the worst possible output of this feature, because it is exactly the thing a
 * learner would trust at a glance.
 *
 * ── THE THREE STATES ─────────────────────────────────────────────────────────
 *
 *   watched   solid magenta   — this learner has finished it
 *   ready     pale lilac      — playable, not yet watched
 *   filming   white, dashed   — no video yet
 *
 * ⚠ A COURSE WITH A MIX SPLITS INTO ADJACENT BLOCKS, which is how Min-Max-Planning
 * renders as 9 ready + 2 filming rather than as one lie in either direction.
 *
 * ⚠ PURE — no Prisma import, so the harness drives every branch with no database
 * and a client component can hold the type.
 */

export type SpineState = "watched" | "ready" | "filming";

export type SpineBlock = {
  courseId: string;
  courseTitle: string;
  state: SpineState;
  /** Lessons in THIS block — not in the whole course. */
  lessons: number;
  /** Percentage of the path's total lesson count. Widths sum to 100. */
  widthPct: number;
};

export type Spine = {
  blocks: SpineBlock[];
  /** Distinct courses represented. ⚠ Asserted to equal the path's course count. */
  courses: number;
  totalLessons: number;
  playableLessons: number;
  watchedLessons: number;
};

type LessonRow = { id: string; vimeo_ref: string | null; production_status: string };
type CourseRow = { id: string; title: string; sections: { lessons: LessonRow[] }[] };

/**
 * ⚠ ORDER IS THE PATH'S OWN COURSE ORDER, and within a course the three states
 * appear watched → ready → filming. A learner reads left-to-right as "done, next,
 * not shot yet", which is the only ordering that makes the bar a progress
 * statement rather than a bag of colours.
 */
const STATE_ORDER: SpineState[] = ["watched", "ready", "filming"];

export function buildSpine(
  courses: CourseRow[],
  done: Set<string> | ReadonlySet<string>
): Spine | null {
  /* ⚠ NO COURSES MEANS NO SPINE. Not an empty one — none. */
  if (!courses || courses.length === 0) return null;

  const total = courses.reduce(
    (n, c) => n + c.sections.reduce((m, s) => m + s.lessons.length, 0),
    0
  );
  if (total === 0) return null;

  const raw: { courseId: string; courseTitle: string; state: SpineState; lessons: number }[] = [];
  let playable = 0;
  let watched = 0;

  for (const c of courses) {
    const lessons = c.sections.flatMap((s) => s.lessons);
    const buckets: Record<SpineState, number> = { watched: 0, ready: 0, filming: 0 };
    for (const l of lessons) {
      if (!isPlayable(l)) buckets.filming += 1;
      else if (done.has(l.id)) buckets.watched += 1;
      else buckets.ready += 1;
    }
    playable += buckets.watched + buckets.ready;
    watched += buckets.watched;
    for (const state of STATE_ORDER) {
      if (buckets[state] > 0) {
        raw.push({ courseId: c.id, courseTitle: c.title, state, lessons: buckets[state] });
      }
    }
  }

  /*
    ⚠⚠ NOTHING PLAYABLE MEANS NO SPINE. `E362` already hides such a path from a
    learner, so this is belt and braces — but a bar made entirely of dashed
    outlines would read as "a path" when there is nothing to start.
  */
  if (playable === 0) return null;

  /*
    ⚠⚠ THE WIDTHS SUM TO EXACTLY 100. Percentages of integers do not, so the
    remainder goes on the LAST block rather than being left as a 99.7% bar with a
    hairline gap — which is visible, and reads as a rendering bug.
  */
  const blocks: SpineBlock[] = raw.map((b) => ({
    ...b,
    widthPct: Math.round((b.lessons / total) * 1000) / 10,
  }));
  const drift = 100 - blocks.reduce((n, b) => n + b.widthPct, 0);
  if (blocks.length > 0 && Math.abs(drift) > 0.0001) {
    blocks[blocks.length - 1].widthPct = Math.round((blocks[blocks.length - 1].widthPct + drift) * 10) / 10;
  }

  return {
    blocks,
    courses: new Set(blocks.map((b) => b.courseId)).size,
    totalLessons: total,
    playableLessons: playable,
    watchedLessons: watched,
  };
}

/**
 * ⚠ THE ACCESSIBLE LABEL, NOT ONLY A TOOLTIP. `P1-J3-E045` recorded the same
 * lesson on the coverage row: a `title` attribute is a mouse-only affordance and
 * a phone never sees it.
 */
export function blockLabel(b: SpineBlock): string {
  const n = `${b.lessons} lesson${b.lessons === 1 ? "" : "s"}`;
  const state =
    b.state === "watched" ? "watched" : b.state === "ready" ? "ready to watch" : "no video yet";
  return `${b.courseTitle} — ${n}, ${state}`;
}

/** The one explanation, said once above a group and never on every row. */
export const SPINE_LEGEND =
  "Each block is a course — its width is how many lessons are in it.";
