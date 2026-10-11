import { prisma } from "@/lib/prisma";
import { inCur, listHref, metric, series, span, type Ctx } from "@/lib/admin-usage/core";
import { peopleList, type Lists } from "@/lib/admin-usage/lists";
import { finishes } from "@/lib/learn-homepage";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { DataTable, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E006: Learn — enrollments and lessons per day, per-path and per-teacher tables, Ready-to-Test members waiting for a test.
async function data(c: Ctx) {
  const [paths, enrolls, lessons, attempts, certs, fin] = await Promise.all([
    prisma.learningPath.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, slug: true, instructor_person_id: true, assessment: { select: { status: true } }, instructor: { select: { first_name: true, last_name: true } } } }),
    prisma.enrollment.findMany({ select: { user_id: true, learning_path_id: true, created_at: true } }),
    prisma.lessonProgress.findMany({ where: { completed_at: span(c) }, select: { user_id: true, completed_at: true } }),
    prisma.certificationAttempt.findMany({ where: { is_preview: false }, select: { user_id: true, learning_path_id: true, passed: true, created_at: true } }),
    prisma.credential.findMany({ where: { issued_from: "PANAMEER", learning_path_id: { not: null } }, select: { user_id: true, learning_path_id: true } }),
    finishes(),
  ]);
  const ok = <T extends { user_id: string }>(xs: T[]) => xs.filter((x) => c.userOk(x.user_id));
  const finished = fin.finished.filter((f) => c.userOk(f.userId));
  // Finished every lesson out, no certificate, and the path's test isn't open yet.
  const certified = new Set(certs.map((x) => `${x.user_id}|${x.learning_path_id}`));
  const testOpen = new Set(paths.filter((p) => p.assessment?.status === "PUBLISHED").map((p) => p.id));
  const waiting = finished.filter((f) => !certified.has(`${f.userId}|${f.pathId}`) && !testOpen.has(f.pathId));
  return { paths, enrolls: ok(enrolls), lessons: ok(lessons), attempts: ok(attempts), finished, waiting };
}

export async function learnLists(c: Ctx): Promise<Lists> {
  return {
    enrollments: async () => peopleList(`Enrolled (${c.label})`, (await data(c)).enrolls.filter((e) => inCur(c, e.created_at)).map((e) => e.user_id)),
    learners: async () => peopleList(`Watched a lesson (${c.label})`, (await data(c)).lessons.filter((l) => inCur(c, l.completed_at)).map((l) => l.user_id)),
    waiting: async () => { const d = await data(c); const title = new Map(d.paths.map((p) => [p.id, p.title])); const per = new Map(d.waiting.map((w) => [w.userId, title.get(w.pathId) ?? "—"])); return peopleList("Ready to Test — waiting for a test", [...per.keys()], (id) => per.get(id) ?? ""); },
  };
}

export async function Learn({ c }: { c: Ctx }) {
  const d = await data(c);
  const rows = d.paths.map((p) => {
    const enrolled = d.enrolls.filter((e) => e.learning_path_id === p.id && inCur(c, e.created_at)).length;
    const finished = d.finished.filter((f) => f.pathId === p.id && inCur(c, f.at)).length;
    const tests = d.attempts.filter((a) => a.learning_path_id === p.id && inCur(c, a.created_at));
    const passed = tests.filter((a) => a.passed).length;
    return { p, enrolled, finished, tests: tests.length, passed };
  }).sort((a, b) => b.enrolled - a.enrolled || b.finished - a.finished);
  const teachers = new Map<string, { name: string; paths: number; enrolled: number; finished: number }>();
  for (const r of rows) {
    if (!r.p.instructor_person_id || !r.p.instructor) continue;
    const t = teachers.get(r.p.instructor_person_id) ?? { name: `${r.p.instructor.first_name} ${r.p.instructor.last_name}`.trim(), paths: 0, enrolled: 0, finished: 0 };
    t.paths++; t.enrolled += r.enrolled; t.finished += r.finished;
    teachers.set(r.p.instructor_person_id, t);
  }
  return (
    <div className="space-y-3">
      <Grid2>
        <UsageChart title="Enrollments per Day" subtitle={c.label} points={series(c, d.enrolls.map((e) => e.created_at))} />
        <UsageChart title="Lessons Watched per Day" subtitle={c.label} points={series(c, d.lessons.map((l) => l.completed_at))} />
      </Grid2>
      <Tiles>
        <Tile label="Enrollments" {...metric(c, d.enrolls.map((e) => e.created_at))} href={listHref(c, "enrollments")} />
        <Tile label="Lessons Watched" {...metric(c, d.lessons.map((l) => l.completed_at))} href={listHref(c, "learners")} />
        <Tile label="Paths Finished" {...metric(c, d.finished.map((f) => f.at))} />
        <Tile label="Waiting for a Test" value={d.waiting.length} delta="finished, test not open yet" href={listHref(c, "waiting")} />
      </Tiles>
      <DataTable title="Learning Paths" subtitle={c.label} head={["Learning path", "Enrolled", "Finished", "Tests taken", "Passed", "Pass rate"]} rows={rows.map((r) => ({ cells: [r.p.title, r.enrolled, r.finished, r.tests, r.passed, r.tests ? `${Math.round((r.passed / r.tests) * 100)}%` : "—"], href: `/learn/${r.p.slug}` }))} />
      <DataTable title="Teachers" subtitle={c.label} head={["Teacher", "Paths", "Enrolled", "Finished"]} rows={[...teachers.entries()].sort((a, b) => b[1].enrolled - a[1].enrolled).map(([id, t]) => ({ cells: [t.name, t.paths, t.enrolled, t.finished], href: `/admin/users/${id}` }))} />
    </div>
  );
}
