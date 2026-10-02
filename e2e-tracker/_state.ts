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

/**
 * ── ⚠⚠⚠ EVERY COLUMN A TEST CAN TOUCH, NOT EVERY COLUMN THAT MATTERED WHEN THIS
 *    WAS WRITTEN (`P2-ALL-E765`) ────────────────────────────────────────────────
 *
 * ⚠⚠ **THIS LIST IS THE ASSERTION.** The restore makes each table equal the
 * snapshot, and the proof at the bottom compares the snapshot to a re-read — so a
 * column that is NOT selected here is a column the restore drops and the proof
 * cannot see. ⚠⚠⚠ **THAT IS NOT A HYPOTHETICAL: `is_current` WAS MISSING AND
 * `check:work-tracker` CLEARED THE ADMIN'S CURRENT PHASE ON A PUBLIC PAGE, TWICE,
 * WHILE REPORTING THE STATE RESTORED.** `/status` went back to printing *"01/06
 * Define"* when the build is in `Build`, and every row count was identical, so a
 * count-based check saw nothing. ⚠ It is ruling 12 exactly — an assertion its own
 * mutation cannot fail is not an assertion.
 *
 * ⚠ **SO: WHEN A COLUMN IS ADDED TO ANY `work_tracker_*` TABLE, IT IS ADDED HERE
 * IN THE SAME CHANGE.** Only `created_at` / `updated_at` are left out, and only
 * because they churn on every write by definition.
 */
export type TrackerSnapshot = {
  tasks: {
    task_id: string; status: string; owner: string | null; note: string | null;
    stage: string | null; release_id: string | null; updated_by: string | null;
  }[];
  gates: { gate_id: string; criterion_index: number; value: string; updated_by: string | null }[];
  dates: {
    phase: string; start_date: Date | null; end_date: Date | null;
    is_current: boolean; updated_by: string | null;
  }[];
  milestones: {
    id: string; title: string; description: string | null; date: Date; status: string;
    sort: number; published: boolean; code: string | null; start_date: Date | null;
    target_date: Date | null; summary: string | null; updated_by: string | null;
  }[];
  /** ⚠ Admin-authored tasks (`E765`). They are rows on the public page like any
   *  other, so a test that adds one and fails must not leave it there. */
  customTasks: {
    id: string; title: string; phase: string; stage: string | null; release_id: string | null;
    status: string; owner: string | null; note: string | null; sort: number; updated_by: string | null;
  }[];
  shippedIds: string[];
  /** ⚠ Followers are tracker state too — a test that follows and fails leaves a
   *  person subscribed to notifications they never asked for. */
  followerPersonIds: string[];
};

export async function snapshotTracker(): Promise<TrackerSnapshot> {
  /* ⚠⚠ SEQUENTIAL, NOT `Promise.all`. Five parallel queries from a second Prisma
     client — on top of the app's — intermittently exhausted the Supabase POOLER:
     the suite passed twice and then failed in `beforeAll` at 0ms with an empty
     `PrismaClientKnownRequestError`. ⚠ A snapshot runs twice per suite and is not
     performance-critical; a flaky teardown is worse than a slow one, because the
     thing it guards is data on a PUBLIC page. */
  const tasks = await prisma.workTrackerTaskState.findMany({
    select: {
      task_id: true, status: true, owner: true, note: true,
      stage: true, release_id: true, updated_by: true,
    },
  });
  const gates = await prisma.workTrackerGateState.findMany({
    select: { gate_id: true, criterion_index: true, value: true, updated_by: true },
  });
  const dates = await prisma.workTrackerPhaseDate.findMany({
    select: { phase: true, start_date: true, end_date: true, is_current: true, updated_by: true },
  });
  const milestones = await prisma.workTrackerRelease.findMany({
    select: {
      id: true, title: true, description: true, date: true, status: true, sort: true,
      published: true, code: true, start_date: true, target_date: true,
      summary: true, updated_by: true,
    },
  });
  const customTasks = await prisma.workTrackerCustomTask.findMany({
    select: {
      id: true, title: true, phase: true, stage: true, release_id: true,
      status: true, owner: true, note: true, sort: true, updated_by: true,
    },
  });
  const shipped = await prisma.workTrackerShipped.findMany({ select: { id: true } });
  const followers = await prisma.workTrackerFollower.findMany({ select: { person_id: true } });
  return {
    tasks,
    gates,
    dates,
    milestones,
    customTasks,
    shippedIds: shipped.map((s) => s.id),
    followerPersonIds: followers.map((f) => f.person_id),
  };
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
  await prisma.workTrackerRelease.deleteMany({ where: { id: { notIn: [...keepMilestones] } } });
  for (const m of before.milestones) {
    await prisma.workTrackerRelease.upsert({ where: { id: m.id }, update: m, create: m });
  }

  /* ⚠ Custom tasks (`E765`): delete what the test added, write back what it
     changed, recreate what it removed — the same three cases as everywhere else. */
  const keepCustom = new Set(before.customTasks.map((c) => c.id));
  await prisma.workTrackerCustomTask.deleteMany({ where: { id: { notIn: [...keepCustom] } } });
  for (const c of before.customTasks) {
    await prisma.workTrackerCustomTask.upsert({ where: { id: c.id }, update: c, create: c });
  }

  /* ⚠ Shipped entries are only ever ADDED by a test, so the restore deletes what
     was not there before rather than rewriting what was. */
  await prisma.workTrackerShipped.deleteMany({ where: { id: { notIn: before.shippedIds } } });

  /* ⚠ Followers: delete anyone the test added, restore anyone it removed. */
  await prisma.workTrackerFollower.deleteMany({
    where: { person_id: { notIn: before.followerPersonIds } },
  });
  for (const pid of before.followerPersonIds) {
    await prisma.workTrackerFollower.upsert({
      where: { person_id: pid },
      update: {},
      create: { person_id: pid },
    });
  }

  const keepTasks = new Set(before.tasks.map((t) => t.task_id));
  await prisma.workTrackerTaskState.deleteMany({ where: { task_id: { notIn: [...keepTasks] } } });
  for (const t of before.tasks) {
    await prisma.workTrackerTaskState.upsert({
      where: { task_id: t.task_id },
      update: {
        status: t.status, owner: t.owner, note: t.note,
        stage: t.stage, release_id: t.release_id, updated_by: t.updated_by,
      },
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
      customTasks: [...s.customTasks].sort((a, b) => a.id.localeCompare(b.id)),
      shippedIds: [...s.shippedIds].sort(),
      followerPersonIds: [...s.followerPersonIds].sort(),
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
