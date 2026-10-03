import { db } from "../e2e-shell/_db";

/**
 * ── ⚠⚠⚠ THE PLAN TESTS PUT THE PLAN BACK (`P2-ALL-E784`) ────────────────────
 *
 * ⚠⚠ **THIS IS SCOTT'S LIVE DATA.** `panameer-build` is the plan
 * `status.panameer.com` renders from lane 3 onward, and there is one database
 * behind localhost, every preview and production. ⚠ A test row left behind is
 * published, which is precisely what `E765` cost on `/status` twice.
 *
 * ⚠⚠⚠ **EVERY COLUMN IS SNAPSHOTTED, NOT THE ONES THE TESTS HAPPEN TO TOUCH.**
 * The tracker teardown omitted `is_current` and the restore silently moved the
 * current phase while the row COUNTS matched — so the check that was supposed to
 * catch it passed. A snapshot is of the row, or it is not a snapshot.
 */
const prisma = db();

export type PlanSnapshot = {
  planIds: string[];
  rows: Record<string, unknown>[];
};

const ROW_COLUMNS = {
  id: true,
  plan_id: true,
  parent_id: true,
  sort: true,
  type: true,
  title: true,
  start_date: true,
  end_date: true,
  status: true,
  owner: true,
  hours: true,
  release_id: true,
  public_note: true,
  admin_note: true,
  created_at: true,
  updated_at: true,
  updated_by: true,
} as const;

export async function snapshotPlan(ownerKey: string): Promise<PlanSnapshot> {
  const plans = await prisma.plan.findMany({ where: { owner_key: ownerKey }, select: { id: true } });
  const ids = plans.map((p) => p.id);
  const rows = ids.length
    ? await prisma.planRow.findMany({ where: { plan_id: { in: ids } }, select: ROW_COLUMNS })
    : [];
  return { planIds: ids, rows: rows as unknown as Record<string, unknown>[] };
}

/**
 * ⚠ Parents before children, because `parent_id` has a real foreign key — a
 * flat replay would fail on the first child whose phase has not been written.
 */
export async function restorePlan(before: PlanSnapshot): Promise<void> {
  if (before.planIds.length === 0) return;
  await prisma.planRow.deleteMany({ where: { plan_id: { in: before.planIds } } });
  const ordered = [...before.rows].sort(
    (a, b) => Number(!!a.parent_id) - Number(!!b.parent_id),
  );
  for (const r of ordered) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.planRow.create({ data: r as any });
  }
}

/**
 * ⚠⚠ THE ASSERTION IS THE POINT. A teardown that runs but is never checked is a
 * promise, not a guarantee. ⚠ It compares the ROWS, field by field — not the
 * count, which is what let the tracker's missing column through.
 */
export async function assertPlanRestored(before: PlanSnapshot): Promise<void> {
  const after = await snapshotPlan(
    (await prisma.plan.findFirst({ where: { id: { in: before.planIds } }, select: { owner_key: true } }))
      ?.owner_key ?? "",
  );
  const norm = (rows: Record<string, unknown>[]) =>
    JSON.stringify(
      [...rows]
        .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "updated_at")))
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    );
  const a = norm(before.rows);
  const b = norm(after.rows);
  if (a !== b) {
    throw new Error(
      `plan rows were not restored: ${before.rows.length} before, ${after.rows.length} after — the plan is PUBLIC from lane 3`,
    );
  }
}

export { prisma as planDb };
