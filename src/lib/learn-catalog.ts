import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { areaFor } from "@/lib/skill-areas";

// Learn's one data shape (2026-10-08): paths → courses → lessons, with the viewer's marks, the test and the certificate.
// Status language everywhere: done (ink ✓) · now (magenta dot) · not started (grey ring).
export type CatLesson = { id: string; title: string; minutes: number | null; playable: boolean; done: boolean; description: string | null; vimeoRef: string | null };
export type CatCourse = { id: string; slug: string; title: string; summary: string | null; lessons: CatLesson[]; minutes: number; done: number; teacher: string | null };
export type PathTag = "IN_PROGRESS" | "CERTIFIED" | "COMING_SOON" | null;
export type CatPath = {
  id: string; slug: string; title: string; summary: string | null; area: string | null; group: string | null; cover: string | null;
  teacher: { personId: string; name: string; title: string | null; photoUrl: string | null; profileId: string | null } | null;
  courses: CatCourse[]; lessons: number; minutes: number; playable: boolean;
  learners: number; completed: number;
  mine: { enrolled: boolean; done: number; total: number; next: (CatLesson & { index: number; courseIndex: number; courseTitle: string }) | null } | null;
  test: { ready: boolean; questions: number; threshold: number; maxAttempts: number; used: number; passed: boolean; best: number };
  certificate: { id: string; earnedOn: string; score: number | null; verifyUrl: string | null } | null;
  tag: PathTag;
  watching: boolean;
};

const minutesOf = (seconds: number | null, runTime: string | null) => {
  if (seconds) return Math.max(1, Math.round(seconds / 60));
  const m = runTime?.match(/(\d+):(\d{2})/);
  return m ? Math.max(1, Number(m[1]) + Math.round(Number(m[2]) / 60)) : null;
};
export { timeLabel } from "@/lib/learn-time";
const nameOf = (p: { first_name: string | null; last_name: string | null }) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

export async function learnCatalog(userId: string | null, opts: { slug?: string } = {}): Promise<CatPath[]> {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED", ...(opts.slug ? { slug: opts.slug } : {}) },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true, slug: true, title: true, summary: true, group: true, cover_image: true,
      expert: { select: { id: true, first_name: true, last_name: true, title: true, photo_url: true, providerProfile: { select: { id: true } } } },
      assessment: { select: { status: true, questions: true, pass_threshold: true, max_attempts: true } },
      skills: { select: { skill: { select: { area: true } } } },
      _count: { select: { enrollments: true, credentials: true } },
      courses: {
        orderBy: { sort_order: "asc" },
        select: {
          id: true, slug: true, title: true, summary: true,
          sections: { orderBy: { sort_order: "asc" }, select: { lessons: { orderBy: { sort_order: "asc" }, select: { id: true, title: true, description: true, duration_seconds: true, run_time: true, vimeo_ref: true, production_status: true, expert: { select: { first_name: true, last_name: true } } } } } },
        },
      },
    },
  });
  const ids = paths.map((p) => p.id);
  const [enrolled, progress, attempts, certs, watches] = userId
    ? await Promise.all([
        prisma.learnEnrollment.findMany({ where: { user_id: userId, learning_path_id: { in: ids } }, select: { learning_path_id: true } }),
        prisma.lessonProgress.findMany({ where: { user_id: userId }, select: { lesson_id: true } }),
        prisma.certificationAttempt.findMany({ where: { user_id: userId, learning_path_id: { in: ids } }, select: { learning_path_id: true, score: true, passed: true } }),
        prisma.certification.findMany({ where: { user_id: userId, learning_path_id: { in: ids } }, select: { id: true, learning_path_id: true, created_at: true, issued_on: true, public_credential_url: true } }),
        prisma.learnPathWatch.findMany({ where: { user_id: userId, learning_path_id: { in: ids } }, select: { learning_path_id: true } }).catch(() => []),
      ])
    : [[], [], [], [], []];
  const done = new Set(progress.map((p) => p.lesson_id));
  const enrolledSet = new Set(enrolled.map((e) => e.learning_path_id));
  const watching = new Set(watches.map((w) => w.learning_path_id));

  return paths.map((p) => {
    const courses: CatCourse[] = p.courses.map((c) => {
      const lessons = c.sections.flatMap((s) => s.lessons).map((l) => ({
        id: l.id, title: l.title, minutes: minutesOf(l.duration_seconds, l.run_time), playable: isPlayable(l), done: done.has(l.id), description: l.description, vimeoRef: l.vimeo_ref,
        _expert: l.expert ? nameOf(l.expert) : null,
      }));
      const experts = lessons.map((l) => l._expert).filter(Boolean) as string[];
      return {
        id: c.id, slug: c.slug, title: c.title, summary: c.summary,
        lessons: lessons.map(({ _expert, ...l }) => (void _expert, l)),
        minutes: lessons.reduce((n, l) => n + (l.minutes ?? 0), 0),
        done: lessons.filter((l) => l.done).length,
        teacher: experts.sort((a, b) => experts.filter((x) => x === b).length - experts.filter((x) => x === a).length)[0] ?? (p.expert ? nameOf(p.expert) : null),
      };
    });
    const flat = courses.flatMap((c, ci) => c.lessons.map((l) => ({ ...l, courseIndex: ci + 1, courseTitle: c.title })));
    const nDone = flat.filter((l) => l.done).length;
    const nextIdx = flat.findIndex((l) => !l.done && l.playable);
    const mine = userId && (enrolledSet.has(p.id) || nDone > 0)
      ? { enrolled: enrolledSet.has(p.id), done: nDone, total: flat.length, next: nextIdx >= 0 ? { ...flat[nextIdx], index: nextIdx + 1 } : null }
      : null;
    const tally = new Map<string, number>();
    for (const s of p.skills) if (s.skill.area) tally.set(s.skill.area, (tally.get(s.skill.area) ?? 0) + 1);
    const area = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? areaFor(p.title, p.group ? [p.group] : []);
    const myAttempts = attempts.filter((a) => a.learning_path_id === p.id);
    const cert = certs.find((c) => c.learning_path_id === p.id) ?? null;
    const passed = myAttempts.find((a) => a.passed) ?? null;
    const playable = flat.some((l) => l.playable);
    const questions = Array.isArray(p.assessment?.questions) ? (p.assessment!.questions as unknown[]).length : 0;
    return {
      id: p.id, slug: p.slug, title: p.title, summary: p.summary, area, group: p.group, cover: p.cover_image,
      teacher: p.expert ? { personId: p.expert.id, name: nameOf(p.expert), title: p.expert.title, photoUrl: p.expert.photo_url, profileId: p.expert.providerProfile?.id ?? null } : null,
      courses, lessons: flat.length, minutes: flat.reduce((n, l) => n + (l.minutes ?? 0), 0), playable,
      learners: p._count.enrollments, completed: p._count.credentials,
      mine,
      test: { ready: p.assessment?.status === "PUBLISHED", questions, threshold: p.assessment?.pass_threshold ?? 70, maxAttempts: p.assessment?.max_attempts ?? 3, used: myAttempts.length, passed: !!passed || !!cert, best: myAttempts.reduce((m, a) => Math.max(m, a.score), 0) },
      certificate: cert ? { id: cert.id, earnedOn: (cert.issued_on ?? cert.created_at).toISOString(), score: passed?.score ?? null, verifyUrl: cert.public_credential_url } : null,
      tag: cert || passed ? "CERTIFIED" : !playable ? "COMING_SOON" : mine ? "IN_PROGRESS" : null,
      watching: watching.has(p.id),
    };
  });
}
