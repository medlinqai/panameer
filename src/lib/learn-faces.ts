import type { Instructor } from "@/lib/learn-instructor-format";

/**
 * WHOSE FACE GOES ON THIS LESSON — the ONE place that decides
 * (brief_learn_app_shell, "instructor faces").
 *
 * Scott: *"provide a great image of each instructor for every piece of learning
 * content... vanity goes a long way to motivation."* So a face appears on every
 * path, course, lesson row and certificate — which means the empty cases have to
 * be decided once, here, rather than four times in four components.
 *
 * `check:learn` asserts that no Learn component reads a lesson's expert id
 * directly. That guard is the reason this file is worth existing: the three
 * behaviours below are one `if` each, and one `if` each is exactly what gets
 * quietly omitted in the fourth component that needs a face.
 *
 * ── ⚠ THE FOUR CASES, WITH LIVE-DB COUNTS (2026-08-19) ───────────────────────
 *
 * | Situation                       | Count | Render                          |
 * |---------------------------------|-------|---------------------------------|
 * | expert with a photo             | 466   | the photo                       |
 * | expert with no photo            | 0     | initials (InstructorAvatar)     |
 * | NO expert at all                | 56    | INHERIT the course's dominant   |
 * | expert named "TBD"              | 0     | OMIT the face AND the name      |
 *
 * ⚠ THE BRIEF SAID 54 EXPERT-LESS LESSONS AND 2 "TBD" LESSONS. Measured: 56 and
 * ZERO. All four instructors in the catalog have photos, and no Person row's
 * name is a placeholder — so the TBD branch below is UNEXERCISED today. It is
 * still here, because the placeholder came from a spreadsheet and the next
 * import can put it back, and because a placeholder string becoming a person on
 * screen is not a failure you notice in review.
 *
 * ── ⚠ INHERITANCE IS A CHAIN, BECAUSE THE COURSE IS SOMETIMES EMPTY TOO ──────
 *
 * The brief says a lesson with no expert inherits "the course's dominant
 * instructor". Measured, that is not always available: five courses in Cost
 * Accounting have NO named expert on ANY of their 32 lessons, and its path
 * declares a lead instead. Talent Mgmt is the same shape with one lesson. So the
 * chain is lesson → course → path-declared-lead → omit, which is the same
 * fallback `resolveInstructors` already uses one level up.
 */

/** Trimmed, case-folded placeholder names that must never become a person. */
const PLACEHOLDER = /^(tbd|t\.?b\.?d\.?|tba|n\/?a|none|unknown|placeholder|\?+)$/i;

/**
 * Is this "person" actually a spreadsheet placeholder?
 *
 * Matches the WHOLE name, not a substring — there is a real surname "Tba" far
 * likelier than there is a policy of hiding people whose names contain those
 * three letters, and "Nan Abraham" must not vanish.
 */
export function isPlaceholderInstructor(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (!n) return true;
  return n.split(/\s+/).every((part) => PLACEHOLDER.test(part));
}

export type LessonFace = {
  /** Null means RENDER NOTHING — no circle, no name. */
  instructor: Instructor | null;
  /**
   * True when this face came from the course or the path rather than from the
   * lesson. Callers use it to soften the label ("Course instructor") so an
   * inherited face never asserts that this person taught this lesson.
   */
  inherited: boolean;
};

/**
 * Resolve the face for one lesson.
 *
 * `courseInstructors` / `pathInstructors` are the ALREADY-ORDERED lists from
 * `resolveInstructors` — most-taught first, so `[0]` is the dominant one and
 * this function does no counting of its own.
 */
export function lessonFace(
  lesson: { expert_person_id?: string | null; expertPersonId?: string | null },
  directory: Map<string, Omit<Instructor, "lessons">>,
  courseInstructors: Instructor[],
  pathInstructors: Instructor[] = []
): LessonFace {
  const id = lesson.expert_person_id ?? lesson.expertPersonId ?? null;

  if (id) {
    const person = directory.get(id);
    /*
      ⚠ AN ID WE COULDN'T LOAD IS NOT AN EXCUSE TO INHERIT. If the lesson names
      somebody and that row is gone, showing the course lead's face would credit
      the wrong person on the row that names a specific one. Fall through to the
      chain only when the lesson names NOBODY.
    */
    if (person && !isPlaceholderInstructor(person.name)) {
      return { instructor: { ...person, lessons: 1 }, inherited: false };
    }
    /*
      Either a placeholder, or a row we could not load. BOTH omit. The second is
      the case worth spelling out: the lesson names SOMEBODY, so putting the
      course lead's face there would attach a real name to a lesson they did not
      teach — a misattribution on a marketplace where the face is a link to a
      person you can hire. No face is the smaller error.
    */
    return { instructor: null, inherited: false };
  }

  const inheritedFrom = courseInstructors[0] ?? pathInstructors[0] ?? null;
  if (inheritedFrom && !isPlaceholderInstructor(inheritedFrom.name)) {
    return { instructor: inheritedFrom, inherited: true };
  }
  /* Nobody anywhere in the chain — an empty circle would be worse. */
  return { instructor: null, inherited: false };
}

/** Drop placeholder people out of an instructor list (headers, rails, stacks). */
export function withoutPlaceholders(instructors: Instructor[]): Instructor[] {
  return instructors.filter((i) => !isPlaceholderInstructor(i.name));
}
