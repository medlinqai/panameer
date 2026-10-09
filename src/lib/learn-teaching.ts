import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { teachesPathWhere } from "@/lib/learn-home";
import { pathInstructor } from "@/lib/learn-instructor";

// T-E002: the Teaching page — the paths you teach, each with its learners and the open questions on your lessons.
export type TeachLearner = { userId: string; name: string; photoUrl: string | null; pct: number; done: number; lastActive: Date | null };
export type TeachQuestion = { id: string; title: string; lessonTitle: string; askedAt: Date };
export type TeachPath = { id: string; slug: string; title: string; playable: number; learners: TeachLearner[]; questions: TeachQuestion[]; canMessage: boolean };

export async function teachingData(userId: string) {
  const me = await prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
  if (!me) return null;
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED", ...teachesPathWhere(me.id) },
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, courses: { select: { sections: { select: { lessons: { select: { id: true, title: true, vimeo_ref: true, production_status: true, expert_person_id: true } } } } } } },
  });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let finishedThisMonth = 0;
  const out: TeachPath[] = [];
  for (const p of paths) {
    const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const playable = lessons.filter(isPlayable).map((l) => l.id);
    const mine = lessons.filter((l) => l.expert_person_id === me.id);
    const [enrolled, threads, instructor] = await Promise.all([
      prisma.learnEnrollment.findMany({ where: { learning_path_id: p.id, user_id: { not: userId } }, select: { user_id: true, user: { select: { first_name: true, last_name: true, person: { select: { photo_url: true } } } } } }),
      mine.length ? prisma.forumThread.findMany({ where: { lesson_id: { in: mine.map((l) => l.id) }, reply_count: 0 }, orderBy: { created_at: "desc" }, take: 20, select: { id: true, title: true, lesson_id: true, created_at: true } }) : Promise.resolve([]),
      pathInstructor(p.id),
    ]);
    const progress = enrolled.length && playable.length
      ? await prisma.lessonProgress.groupBy({ by: ["user_id"], where: { user_id: { in: enrolled.map((e) => e.user_id) }, lesson_id: { in: playable } }, _count: { _all: true }, _max: { completed_at: true } })
      : [];
    const byUser = new Map(progress.map((g) => [g.user_id, { n: g._count._all, last: g._max.completed_at }]));
    const learners = enrolled
      .map((e) => {
        const g = byUser.get(e.user_id);
        const done = g?.n ?? 0;
        if (playable.length && done >= playable.length && g?.last && g.last >= monthStart) finishedThisMonth++;
        return { userId: e.user_id, name: `${e.user.first_name ?? ""} ${e.user.last_name ?? ""}`.trim() || "A learner", photoUrl: e.user.person?.photo_url ?? null, pct: playable.length ? Math.round((done / playable.length) * 100) : 0, done, lastActive: g?.last ?? null };
      })
      .sort((a, b) => (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0));
    const lessonTitle = new Map(mine.map((l) => [l.id, l.title]));
    out.push({
      id: p.id, slug: p.slug, title: p.title, playable: playable.length, learners,
      questions: threads.map((t) => ({ id: t.id, title: t.title, lessonTitle: lessonTitle.get(t.lesson_id ?? "") ?? "", askedAt: t.created_at })),
      canMessage: instructor === me.id,
    });
  }
  return {
    paths: out,
    kpis: { paths: out.length, learners: new Set(out.flatMap((p) => p.learners.map((l) => l.userId))).size, finishedThisMonth, openQuestions: out.reduce((n, p) => n + p.questions.length, 0) },
  };
}
