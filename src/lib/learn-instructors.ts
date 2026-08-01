import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere } from "@/lib/access";
import type { Instructor, LessonExpertRef } from "@/lib/learn-instructor-format";

// Re-exported so server callers have one import for the whole concern; the
// client-safe definitions live in learn-instructor-format.
export {
  tallyExperts,
  instructorLabel,
  type Instructor,
  type LessonExpertRef,
} from "@/lib/learn-instructor-format";

/**
 * WHO TEACHES THIS — derived from lessons, not declared on the path
 * (brief_learn_experience WS6, corrected).
 *
 * The first cut of WS6 assumed one instructor owned a whole Learning Path. The
 * data says otherwise, and says it loudly: Advanced Procurement is 85 lessons
 * by Scott and 18 by Linus, and "2. Overview" has three different people across
 * 24 lessons. `Lesson.expert_person_id` is where teaching is actually recorded —
 * 466 of the 522 lessons carry one — so that is what a path's and a course's
 * instructor list is computed from.
 *
 * `LearningPath.expert_person_id` still matters, but only as a FALLBACK for a
 * path whose lessons name nobody (Cost Accounting's 39 lessons, Talent Mgmt).
 * It is deliberately NOT merged into a non-empty derived list: doing so would
 * credit someone with teaching lessons they don't teach, which is the exact
 * misrepresentation the profile↔courses loop must not make on a marketplace.
 *
 * ORDERED BY LESSON COUNT, so "lead" means "taught the most of it" rather than
 * whoever happens to sort first. Ties break on name so the order is stable
 * between renders — a card whose faces reshuffle on refresh looks broken.
 */


/**
 * Load the Person rows for a set of ids, with the marketplace-visibility check
 * already applied to their profile links.
 *
 * Batched on purpose: the Learn home resolves instructors for 23 paths at once,
 * and a per-path lookup would be dozens of round trips for what is, across the
 * whole catalog, four people.
 */
export async function loadInstructors(
  ids: string[]
): Promise<Map<string, Omit<Instructor, "lessons">>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const people = await prisma.person.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      photo_url: true,
      providerProfile: { select: { id: true } },
    },
  });

  const profileIds = people
    .map((p) => p.providerProfile?.id)
    .filter((x): x is string => Boolean(x));

  // Same predicate access.ts uses for listings — a link to a profile the
  // marketplace would refuse to render is worse than no link.
  const visible = new Set(
    profileIds.length > 0
      ? (
          await prisma.providerProfile.findMany({
            where: { id: { in: profileIds }, ...marketplaceVisibleWhere() },
            select: { id: true },
          })
        ).map((r) => r.id)
      : []
  );

  return new Map(
    people.map((p) => [
      p.id,
      {
        id: p.id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Panameer",
        photoUrl: p.photo_url,
        profileSlug:
          p.providerProfile && visible.has(p.providerProfile.id)
            ? p.providerProfile.id
            : null,
      },
    ])
  );
}

/**
 * Turn a tally + a loaded directory into the ordered instructor list.
 *
 * `declaredLeadId` is the path's own `expert_person_id`. It is used ONLY when
 * the lessons name nobody — see the note at the top of this file.
 */
export function resolveInstructors(
  tally: { id: string; lessons: number }[],
  directory: Map<string, Omit<Instructor, "lessons">>,
  declaredLeadId?: string | null
): Instructor[] {
  const found = tally
    .map((t) => {
      const person = directory.get(t.id);
      return person ? { ...person, lessons: t.lessons } : null;
    })
    .filter((x): x is Instructor => x !== null)
    // Stable order: most lessons first, then by name so refreshes don't shuffle.
    .sort((a, b) => b.lessons - a.lessons || a.name.localeCompare(b.name));

  if (found.length > 0) return found;

  const declared = declaredLeadId ? directory.get(declaredLeadId) : null;
  return declared ? [{ ...declared, lessons: 0 }] : [];
}

/**
 * Every id this scope might need loaded — the lesson experts plus the declared
 * lead, since the lead is only consulted when the lessons are silent but has to
 * already be in the directory when that happens.
 */
export function instructorIdsFor(
  lessons: LessonExpertRef[],
  declaredLeadId?: string | null
): string[] {
  const ids = lessons.map((l) => l.expert_person_id).filter((x): x is string => Boolean(x));
  if (declaredLeadId) ids.push(declaredLeadId);
  return ids;
}

