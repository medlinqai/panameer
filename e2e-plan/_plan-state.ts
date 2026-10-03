import { db } from "../e2e-shell/_db";

/**
 * ── THE PLAN TESTS OWN A THROWAWAY PLAN (`P2-ALL-E804`) ─────────────────────
 *
 * Scott, 2026-10-03: **"no test may read or write the panameer-build plan, ever
 * again."**
 *
 * The old version snapshotted the live plan, overwrote it with a fixture and
 * restored it afterwards. That is one crash, one killed run or one missed column
 * away from losing the plan `status.panameer.com` publishes — and it ran dozens
 * of times a day.
 *
 * So every plan test now CREATES ITS OWN plan under `TEST_OWNER` and deletes it
 * again. `playwright.plan.config.ts` starts a server with
 * `PLAN_OWNER_KEY=<TEST_OWNER>`, so `/status` renders the throwaway plan and the
 * live one is never read either.
 *
 * `refuseLive()` is the backstop: every helper here calls it, so a test that
 * names the live key throws instead of writing.
 */
const prisma = db();

/** The live plan's key. Named ONCE, here, so the guard can refuse it. */
const LIVE_OWNER = "panameer-build";

/** The plan every e2e-plan test uses. Must match `PLAN_OWNER_KEY` in the config. */
export const TEST_OWNER = "e2e-plan-throwaway";

export function refuseLive(ownerKey: string): void {
  if (ownerKey === LIVE_OWNER) {
    throw new Error(
      `A test tried to touch the live plan (owner_key="${LIVE_OWNER}"). ` +
        `Tests must use TEST_OWNER ("${TEST_OWNER}") — see e2e-plan/_plan-state.ts.`,
    );
  }
}

/**
 * A fresh, empty plan under `TEST_OWNER`. Any previous run's rows go first, so a
 * killed run cannot leave a fixture behind that the next one adds to.
 */
export async function createTestPlan(): Promise<string> {
  refuseLive(TEST_OWNER);
  const plan = await prisma.plan.upsert({
    where: { owner_key: TEST_OWNER },
    create: { owner_key: TEST_OWNER, title: "E2E throwaway plan" },
    update: {},
    select: { id: true },
  });
  await prisma.planRow.deleteMany({ where: { plan_id: plan.id } });
  return plan.id;
}

/** Remove the throwaway plan and its rows. Safe to call more than once. */
export async function dropTestPlan(): Promise<void> {
  refuseLive(TEST_OWNER);
  const plan = await prisma.plan.findUnique({
    where: { owner_key: TEST_OWNER },
    select: { id: true },
  });
  if (!plan) return;
  await prisma.planRow.deleteMany({ where: { plan_id: plan.id } });
  await prisma.plan.delete({ where: { id: plan.id } });
}

/**
 * The live plan's row count, for the one assertion worth keeping: that a run
 * left it alone. It reads a COUNT and nothing else — no titles, no dates, no
 * rows — and it never writes.
 */
export async function liveRowCount(): Promise<number> {
  const plan = await prisma.plan.findUnique({
    where: { owner_key: LIVE_OWNER },
    select: { id: true },
  });
  if (!plan) return 0;
  return prisma.planRow.count({ where: { plan_id: plan.id } });
}

export { prisma as planDb };
