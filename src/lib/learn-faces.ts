import type { Instructor } from "@/lib/learn-instructor-format";

/** Trimmed, case-folded placeholder names that must never become a person. */
const PLACEHOLDER = /^(tbd|t\.?b\.?d\.?|tba|n\/?a|none|unknown|placeholder|\?+)$/i;

export function isPlaceholderInstructor(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (!n) return true;
  return n.split(/\s+/).every((part) => PLACEHOLDER.test(part));
}

export type LessonFace = {
  /** Null means RENDER NOTHING — no circle, no name. */
  instructor: Instructor | null;
  inherited: boolean;
};

export function lessonFace(
  lesson: { expert_person_id?: string | null; expertPersonId?: string | null },
  directory: Map<string, Omit<Instructor, "lessons">>,
  courseInstructors: Instructor[],
  pathInstructors: Instructor[] = []
): LessonFace {
  const id = lesson.expert_person_id ?? lesson.expertPersonId ?? null;

  if (id) {
    const person = directory.get(id);
    if (person && !isPlaceholderInstructor(person.name)) {
      return { instructor: { ...person, lessons: 1 }, inherited: false };
    }
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
