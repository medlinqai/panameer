/**
 * Instructor SHAPE and formatting — the client-safe half of WS6.
 *
 * Split out from `learn-instructors.ts` because that file imports prisma, and
 * the LP card is rendered from a client component: importing the type from
 * there dragged the pg driver into the browser bundle and the build failed on
 * "can't resolve dns". Types and pure string formatting have no business
 * sitting behind a database import.
 */

export type Instructor = {
  id: string;
  name: string;
  photoUrl: string | null;
  /** The provider profile to link to, when the marketplace would show it. */
  profileSlug: string | null;
  /** How many lessons in this scope they teach. 0 when only a declared lead. */
  lessons: number;
};

/** A lesson reduced to the only field the derivation needs. */
export type LessonExpertRef = { expert_person_id: string | null };

/**
 * Count distinct experts across a set of lessons, most-taught first.
 *
 * Pure, so a caller with an already-loaded tree doesn't go back to the
 * database, and so it can be unit-reasoned about without one.
 */
export function tallyExperts(lessons: LessonExpertRef[]): { id: string; lessons: number }[] {
  const counts = new Map<string, number>();
  for (const l of lessons) {
    if (!l.expert_person_id) continue;
    counts.set(l.expert_person_id, (counts.get(l.expert_person_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, n]) => ({ id, lessons: n }))
    .sort((a, b) => b.lessons - a.lessons);
}

/** "Marelise Steenkamp and 2 others" — the card and header label. */
export function instructorLabel(instructors: Instructor[]): string {
  if (instructors.length === 0) return "";
  const [lead, ...rest] = instructors;
  if (rest.length === 0) return lead.name;
  if (rest.length === 1) return `${lead.name} and ${rest[0].name}`;
  return `${lead.name} and ${rest.length} others`;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";
