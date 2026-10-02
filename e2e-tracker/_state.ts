import { db } from "../e2e-shell/_db";

/**
 * ── ⚠⚠⚠ THE TRACKER TESTS PUT THE DATABASE BACK (Scott, 2026-10-02) ──────────
 *
 * ⚠⚠ **THIS EXISTS BECAUSE MY OWN TESTS PUBLISHED INVENTED DATA.** The lane-A
 * spec set `Define start = 2026-05-01` and answered a gate criterion, and
 * `/status` — a PUBLIC page — printed *"Define · from 2026-05-01"* as fact. ⚠ The
 * same column is what `Day N` is computed from, so the lie would have compounded.
 *
 * ⚠⚠⚠ **SNAPSHOT BEFORE, RESTORE AFTER, AND ASSERT THE RESTORE.** A teardown
 * that runs but is never checked is a promise, not a guarantee — and it must run
 * **even when the test fails**, which is exactly when the database is dirtiest.
 * Playwright's `afterAll` runs on failure; the assertion inside it is what turns
 * "we tried to clean up" into "the state is provably what it was".
 *
 * ⚠ It restores the four tracker tables and nothing else. It is not a reset.
 */

/**
 * ⚠⚠⚠ THE HOUSE CLIENT, NOT A NEW ONE — AND BOTH REASONS WERE MEASURED HERE.
 *
 * ⚠ **IT LOADS `.env.local`.** Playwright does not, and my own client took
 * `process.env.DATABASE_URL` as `undefined`, so every snapshot failed in
 * `beforeAll` at 0ms with an EMPTY `PrismaClientKnownRequestError`. ⚠⚠ It
 * "passed" twice only because those runs happened in a shell where I had
 * sourced `.env.local` by hand — the gate has to work from a plain
 * `npm run check:work-tracker`, and it did not.
 *
 * ⚠ **AND IT CARRIES THE POOLER RETRY** (`E597` WS-D): the shared Supabase
 * pooler intermittently answers `08006 / EAUTHTIMEOUT`, and `_db.ts` already
 * retries exactly that and nothing else. Rolling my own client threw both of
 * those away and re-learned them the slow way.
 */
const prisma = db();

export type TrackerSnapshot = {
  tasks: { task_id: string; status: string; owner: string | null; note: string | null; stage: string | null }[];
  gates: { gate_id: string; criterion_index: number; value: string }[];
  dates: { phase: string; start_date: Date | null; end_date: Date | null }[];
  milestones: { id: string; title: string; date: Date; status: string; sort: number; published: boolean; description: string | null }[];
  shippedIds: string[];
};

export async function snapshotTracker(): Promise<TrackerSnapshot> {
  /* ⚠⚠ SEQUENTIAL, NOT `Promise.all`. Five parallel queries from a second Prisma
     client — on top of the app's — intermittently exhausted the Supabase POOLER:
     the suite passed twice and then failed in `beforeAll` at 0ms with an empty
     `PrismaClientKnownRequestError`. ⚠ A snapshot runs twice per suite and is not
     performance-critical; a flaky teardown is worse than a slow one, because the
     thing it guards is data on a PUBLIC page. */
  const tasks = await prisma.workTrackerTaskState.findMany({
    select: { task_id: true, status: true, owner: true, note: true, stage: true },
  });
  const gates = await prisma.workTrackerGateState.findMany({
    select: { gate_id: true, criterion_index: true, value: true },
  });
  const dates = await prisma.workTrackerPhaseDate.findMany({
    select: { phase: true, start_date: true, end_date: true },
  });
  const milestones = await prisma.workTrackerMilestone.findMany({
    select: { id: true, title: true, date: true, status: true, sort: true, published: true, description: true },
  });
  const shipped = await prisma.workTrackerShipped.findMany({ select: { id: true } });
  return { tasks, gates, dates, milestones, shippedIds: shipped.map((s) => s.id) };
}

/**
 * ⚠ Restore to EXACTLY the snapshot: rows the test added are deleted, rows it
 * changed are written back, rows it deleted are recreated. ⚠⚠ Then it RE-READS
 * and throws if anything differs — the assertion is the point.
 */
export async function restoreTracker(before: TrackerSnapshot): Promise<void> {
  /* Gates, dates and milestones are small and fully owned by the tracker, so the
     honest restore is "make the table equal the snapshot". */
  await prisma.workTrackerGateState.deleteMany({});
  for (const g of before.gates) await prisma.workTrackerGateState.create({ data: g });

  await prisma.workTrackerPhaseDate.deleteMany({});
  for (const d of before.dates) await prisma.workTrackerPhaseDate.create({ data: d });

  const keepMilestones = new Set(before.milestones.map((m) => m.id));
  await prisma.workTrackerMilestone.deleteMany({ where: { id: { notIn: [...keepMilestones] } } });
  for (const m of before.milestones) {
    await prisma.workTrackerMilestone.upsert({ where: { id: m.id }, update: m, create: m });
  }

  /* ⚠ Shipped entries are only ever ADDED by a test, so the restore deletes what
     was not there before rather than rewriting what was. */
  await prisma.workTrackerShipped.deleteMany({ where: { id: { notIn: before.shippedIds } } });

  const keepTasks = new Set(before.tasks.map((t) => t.task_id));
  await prisma.workTrackerTaskState.deleteMany({ where: { task_id: { notIn: [...keepTasks] } } });
  for (const t of before.tasks) {
    await prisma.workTrackerTaskState.upsert({
      where: { task_id: t.task_id },
      update: { status: t.status, owner: t.owner, note: t.note, stage: t.stage },
      create: t,
    });
  }

  /* ⚠⚠⚠ AND NOW PROVE IT. A teardown nobody checks is a promise. */
  const after = await snapshotTracker();
  const norm = (s: TrackerSnapshot) =>
    JSON.stringify({
      tasks: [...s.tasks].sort((a, b) => a.task_id.localeCompare(b.task_id)),
      gates: [...s.gates].sort((a, b) => `${a.gate_id}${a.criterion_index}`.localeCompare(`${b.gate_id}${b.criterion_index}`)),
      dates: [...s.dates].sort((a, b) => a.phase.localeCompare(b.phase)),
      milestones: [...s.milestones].sort((a, b) => a.id.localeCompare(b.id)),
      shippedIds: [...s.shippedIds].sort(),
    });
  if (norm(after) !== norm(before)) {
    throw new Error(
      "TRACKER STATE WAS NOT RESTORED — a test left data on the public page.\n" +
        `before: ${norm(before).slice(0, 400)}\nafter : ${norm(after).slice(0, 400)}`
    );
  }
}

/**
 * ⚠ Kept as a named no-op rather than deleted: the client is a SHARED singleton
 * across every spec in the run, so disconnecting it in one file's `afterAll`
 * would break the next file's `beforeAll`. The process exit closes it.
 */
export async function disconnectTracker() {
  /* intentionally empty — see above */
}
