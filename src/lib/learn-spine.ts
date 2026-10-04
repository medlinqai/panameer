import { isPlayable } from "@/lib/learn";

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
  courses: number;
  totalLessons: number;
  playableLessons: number;
  watchedLessons: number;
};

type LessonRow = { id: string; vimeo_ref: string | null; production_status: string };
type CourseRow = { id: string; title: string; sections: { lessons: LessonRow[] }[] };

const STATE_ORDER: SpineState[] = ["watched", "ready", "filming"];

export function buildSpine(
  courses: CourseRow[],
  done: Set<string> | ReadonlySet<string>
): Spine | null {
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

  if (playable === 0) return null;

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

export function blockLabel(b: SpineBlock): string {
  const n = `${b.lessons} lesson${b.lessons === 1 ? "" : "s"}`;
  const state =
    b.state === "watched" ? "watched" : b.state === "ready" ? "ready to watch" : "no video yet";
  return `${b.courseTitle} — ${n}, ${state}`;
}

/** The one explanation, said once above a group and never on every row. */
export const SPINE_LEGEND =
  "Each block is a course — its width is how many lessons are in it.";
