import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { isPlayable } from "@/lib/learn";

// Notify Me (2026-10-08): watchers of a Coming Soon path are told once, when it first has a playable lesson.
export async function setPathWatch(userId: string, learningPathId: string, watch: boolean) {
  if (watch) {
    await prisma.learnPathWatch.upsert({ where: { user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId } }, create: { user_id: userId, learning_path_id: learningPathId }, update: {} });
  } else {
    await prisma.learnPathWatch.deleteMany({ where: { user_id: userId, learning_path_id: learningPathId } });
  }
}

/** Tells every not-yet-told watcher of each path that now has a playable lesson. Safe to call after any lesson save. */
export async function notifyOpenedPaths() {
  try {
    const waiting = await prisma.learnPathWatch.findMany({ where: { notified_at: null }, select: { id: true, user_id: true, learning_path_id: true } });
    if (!waiting.length) return 0;
    const pathIds = [...new Set(waiting.map((w) => w.learning_path_id))];
    const paths = await prisma.learningPath.findMany({
      where: { id: { in: pathIds }, status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, courses: { select: { sections: { select: { lessons: { where: { retired_at: null }, select: { vimeo_ref: true, production_status: true } } } } } } },
    });
    const open = paths.filter((p) => p.courses.some((c) => c.sections.some((s) => s.lessons.some((l) => isPlayable(l)))));
    let told = 0;
    for (const p of open) {
      const watchers = waiting.filter((w) => w.learning_path_id === p.id);
      const people = await prisma.person.findMany({ where: { user_id: { in: watchers.map((w) => w.user_id) } }, select: { id: true, user_id: true } });
      for (const w of watchers) {
        const person = people.find((x) => x.user_id === w.user_id);
        if (person)
          await notify({ event: "learn.path_opened", personId: person.id, entityType: "learning_path", entityId: p.id, dedupeKey: `learn.path_opened:${p.id}:${person.id}`, vars: { pathTitle: p.title, pathSlug: p.slug } });
        await prisma.learnPathWatch.update({ where: { id: w.id }, data: { notified_at: new Date() } });
        told++;
      }
    }
    return told;
  } catch (e) {
    console.error("[learn-watch] path-opened notices failed", e);
    return 0;
  }
}

/** L-E041: Notify Me for a path's certification test (told once, when the test opens). */
export async function setTestWatch(userId: string, learningPathId: string, watch: boolean) {
  await prisma.learnPathWatch.upsert({
    where: { user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId } },
    create: { user_id: userId, learning_path_id: learningPathId, test_watch: watch },
    update: { test_watch: watch },
  });
}

/** L-E042: the test is published — tell its watchers and everyone enrolled, once each. */
export async function notifyTestOpened(learningPathId: string) {
  const path = await prisma.learningPath.findUnique({ where: { id: learningPathId }, select: { id: true, slug: true, title: true } });
  if (!path) return 0;
  const [watchers, enrolled] = await Promise.all([
    prisma.learnPathWatch.findMany({ where: { learning_path_id: path.id, test_watch: true, test_notified_at: null }, select: { user_id: true } }),
    prisma.learnEnrollment.findMany({ where: { learning_path_id: path.id }, select: { user_id: true } }),
  ]);
  const users = [...new Set([...watchers, ...enrolled].map((w) => w.user_id))];
  const people = await prisma.person.findMany({ where: { user_id: { in: users } }, select: { id: true } });
  for (const p of people)
    await notify({ event: "learn.test_opened", personId: p.id, entityType: "learning_path", entityId: path.id, dedupeKey: `learn.test_opened:${path.id}:${p.id}`, vars: { pathTitle: path.title, pathSlug: path.slug } });
  await prisma.learnPathWatch.updateMany({ where: { learning_path_id: path.id, test_watch: true, test_notified_at: null }, data: { test_notified_at: new Date() } });
  return people.length;
}
