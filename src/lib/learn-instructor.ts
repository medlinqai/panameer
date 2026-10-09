import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { isPlayable } from "@/lib/learn";

// L-E035..L-E038: the instructor hears when a trainee enrolls and finishes, so they can follow up and get feedback.

/** The path's instructor: `expert_person_id`, else whoever fronts the most lessons in the path. */
export async function pathInstructor(pathId: string): Promise<string | null> {
  const p = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { expert_person_id: true, courses: { select: { sections: { select: { lessons: { select: { expert_person_id: true } } } } } } },
  });
  if (!p) return null;
  if (p.expert_person_id) return p.expert_person_id;
  const tally = new Map<string, number>();
  for (const c of p.courses) for (const s of c.sections) for (const l of s.lessons) if (l.expert_person_id) tally.set(l.expert_person_id, (tally.get(l.expert_person_id) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function learnerFor(userId: string) {
  const p = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true, first_name: true, last_name: true } });
  return p ? { ...p, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Someone", first: p.first_name?.trim() || "them" } : null;
}

/** Fired from every enrollment route. One notice per learner per path, ever. */
export async function notifyInstructorEnrolled(userId: string, pathId: string) {
  const [learner, instructor, path] = await Promise.all([learnerFor(userId), pathInstructor(pathId), prisma.learningPath.findUnique({ where: { id: pathId }, select: { title: true } })]);
  if (!learner || !instructor || !path || instructor === learner.id) return;
  await notify({
    event: "learn.path_enrolled.instructor",
    personId: instructor,
    entityType: "LearningPath",
    entityId: pathId,
    dedupeKey: `learn.path_enrolled.instructor:${pathId}:${learner.id}`,
    vars: { learnerName: learner.name, learnerFirst: learner.first, learnerUserId: userId, pathTitle: path.title },
  });
}

/** L-E037: when every playable lesson in the path is done, tell the learner and the instructor (once each). */
export async function notifyPathCompletedIfDone(userId: string, pathId: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { title: true, slug: true, courses: { select: { sections: { select: { lessons: { select: { id: true, vimeo_ref: true, production_status: true } } } } } } },
  });
  if (!path) return;
  const playable = path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons.filter(isPlayable).map((l) => l.id)));
  if (!playable.length) return;
  const done = await prisma.lessonProgress.count({ where: { user_id: userId, lesson_id: { in: playable } } });
  if (done < playable.length) return;
  const learner = await learnerFor(userId);
  if (!learner) return;
  await notify({
    event: "learn.path_completed.learner",
    personId: learner.id,
    entityType: "LearningPath",
    entityId: pathId,
    dedupeKey: `learn.path_completed:${pathId}:${learner.id}`,
    vars: { pathTitle: path.title, pathSlug: path.slug },
  });
  const instructor = await pathInstructor(pathId);
  if (!instructor || instructor === learner.id) return;
  await notify({
    event: "learn.path_completed.instructor",
    personId: instructor,
    entityType: "LearningPath",
    entityId: pathId,
    dedupeKey: `learn.path_completed.instructor:${pathId}:${learner.id}`,
    vars: { learnerName: learner.name, learnerFirst: learner.first, learnerUserId: userId, pathTitle: path.title },
  });
}

/** L-E038: true when one of the two teaches a path the other is enrolled in. */
export async function teachesEnrolled(userA: string, userB: string): Promise<boolean> {
  const people = await prisma.person.findMany({ where: { user_id: { in: [userA, userB] } }, select: { id: true, user_id: true } });
  const pa = people.find((p) => p.user_id === userA)?.id;
  const pb = people.find((p) => p.user_id === userB)?.id;
  if (!pa || !pb) return false;
  for (const [teacher, learnerUser] of [[pa, userB], [pb, userA]] as const) {
    const enrolled = await prisma.learnEnrollment.findMany({ where: { user_id: learnerUser }, select: { learning_path_id: true } });
    for (const e of enrolled) if ((await pathInstructor(e.learning_path_id)) === teacher) return true;
  }
  return false;
}
