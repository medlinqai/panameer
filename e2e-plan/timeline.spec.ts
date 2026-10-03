import { expect, test } from "@playwright/test";
import { assertPlanRestored, planDb, restorePlan, snapshotPlan, type PlanSnapshot } from "./_plan-state";

/**
 * ── ⚠⚠ THE TIMELINE'S FOUR WALK FIXES (`P2-ALL-E797`) ───────────────────────
 *
 * ⚠ Scott, walking `status.panameer.com` 2026-10-03, on the chart itself:
 *   1. a phase with children starts **collapsed**, with its row count beside it;
 *   2. the hover tooltip was **off by one row** — `3.3 Profile` said
 *      *"3.2 Register"*;
 *   3. `6 Operate` has a start and no end and the chart said *"not scheduled"*.
 *
 * ⚠⚠ **IT RESTORES HIS LIVE PLAN** — see `_plan-state.ts`. One database serves
 * localhost, every preview and production.
 */

const OWNER = "panameer-build";
let before: PlanSnapshot;
let planId: string | null = null;

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

test.beforeAll(async () => {
  before = await snapshotPlan(OWNER);
  const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
  planId = plan?.id ?? null;
  if (!planId) return;
  await planDb.planRow.deleteMany({ where: { plan_id: planId } });
  /**
   * ⚠⚠⚠ THE FIXTURE REPRODUCES THE THREE SHAPES AND NOTHING ELSE. Every title
   * is distinct and every number is distinct, so no assertion below can pass by
   * matching the wrong row (ruling 11).
   */
  const parent = await planDb.planRow.create({
    data: {
      plan_id: planId, parent_id: null, sort: 0, type: "phase", title: "Build",
      status: "In progress", start_date: d("2026-10-01"), end_date: d("2026-11-30"),
    },
    select: { id: true },
  });
  await planDb.planRow.createMany({
    data: [
      { plan_id: planId, parent_id: parent.id, sort: 0, type: "task", title: "Register", status: "Done", start_date: d("2026-10-01"), end_date: d("2026-10-10") },
      { plan_id: planId, parent_id: parent.id, sort: 1, type: "task", title: "Profile", status: "In progress", start_date: d("2026-10-11"), end_date: d("2026-10-20") },
      { plan_id: planId, parent_id: parent.id, sort: 2, type: "task", title: "Connect", status: "Planned", start_date: d("2026-10-21"), end_date: d("2026-10-31") },
      /** ⚠ A start, NO end — the `6 Operate` shape. */
      { plan_id: planId, parent_id: null, sort: 1, type: "phase", title: "Operate", status: "Planned", start_date: d("2026-12-01"), end_date: null },
      /** ⚠ Neither date: the only row that may still say "not scheduled". */
      { plan_id: planId, parent_id: null, sort: 2, type: "phase", title: "Launch", status: "Planned", start_date: null, end_date: null },
    ],
  });
});

test.afterAll(async () => {
  await restorePlan(before);
  await assertPlanRestored(before);
});

/** The rows the chart has actually drawn, in DOM order. */
async function drawn(page: import("@playwright/test").Page) {
  return page.locator('[aria-label="Plan timeline"] [data-plan-row]').evaluateAll((els) =>
    els.map((e) => ({
      number: e.getAttribute("data-plan-row") ?? "",
      label: (e.textContent ?? "").replace(/\s+/g, " ").trim(),
      barTitle: e.querySelector("[data-plan-bar]")?.getAttribute("title") ?? null,
      barKind: e.querySelector("[data-plan-bar]")?.getAttribute("data-plan-bar") ?? null,
    })),
  );
}

test.describe("E797 — collapsible phases", () => {
  test("a phase with children starts collapsed and says how many it holds", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "Plan timeline" })).toBeVisible();

    const rows = await drawn(page);
    expect(rows.map((r) => r.number), "only the three top-level rows are drawn").toEqual(["1", "2", "3"]);
    /** ⚠⚠ THE COUNT IS THE POINT: one bar with nothing beside it hides that
     *  there are three rows underneath. */
    expect(rows[0].label).toContain("3 journeys");
    /** ⚠ And collapsed is ANNOUNCED, not only drawn. */
    await expect(page.locator('[data-plan-row="1"] button')).toHaveAttribute("aria-expanded", "false");
    /** ⚠⚠ A ROW WITH NO CHILDREN HAS NO CONTROL AND NO COUNT — a `▸` on a leaf
     *  would promise rows that do not exist. */
    await expect(page.locator('[data-plan-row="2"] button')).toHaveCount(0);
    expect(rows[1].label, "a leaf must not claim journeys").not.toContain("journeys");
  });

  test("clicking expands its children in place, and a reload forgets", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await page.locator('[data-plan-row="1"] button').click();

    const open = await drawn(page);
    /** ⚠⚠ IN PLACE — between the phase and the next top-level row, in order.
     *  Asserting only that `1.2` exists would pass with the children appended at
     *  the bottom of the chart. */
    expect(open.map((r) => r.number)).toEqual(["1", "1.1", "1.2", "1.3", "2", "3"]);
    await expect(page.locator('[data-plan-row="1"] button')).toHaveAttribute("aria-expanded", "true");

    /** ⚠ Clicking again closes it. */
    await page.locator('[data-plan-row="1"] button').click();
    expect((await drawn(page)).map((r) => r.number)).toEqual(["1", "2", "3"]);

    /**
     * ⚠⚠⚠ IT REMEMBERS NOTHING, BY INSTRUCTION — Scott: *"Remember nothing —
     * collapsed on every load."* ⚠ So a reload after expanding comes back
     * collapsed, and this asserts that rather than trusting that no storage was
     * written.
     */
    await page.locator('[data-plan-row="1"] button').click();
    expect((await drawn(page)).length, "expanded before the reload").toBe(6);
    await page.reload({ waitUntil: "domcontentloaded" });
    expect((await drawn(page)).map((r) => r.number)).toEqual(["1", "2", "3"]);
  });
});

test.describe("E797 — the tooltip belongs to its own row", () => {
  test("every bar's tooltip names the row it sits in, children included", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await page.locator('[data-plan-row="1"] button').click();

    const rows = await drawn(page);
    expect(rows.length, "nothing drawn to check").toBeGreaterThan(4);
    /**
     * ⚠⚠⚠ THE DEFECT SCOTT SAW: hovering `3.3 Profile` showed *"3.2 Register"*.
     * ⚠ This asserts the ALIGNMENT — each bar's tooltip starts with the number of
     * the row it is inside — so an off-by-one anywhere in the list fails, not
     * only on the row he happened to hover.
     */
    const misaligned = rows
      .filter((r) => r.barTitle !== null)
      .filter((r) => !r.barTitle!.startsWith(`${r.number} `));
    expect(misaligned, `a bar's tooltip names another row: ${JSON.stringify(misaligned)}`).toEqual([]);
    /** ⚠ And the exact pair from the walk, named, so the regression is readable. */
    const profile = rows.find((r) => r.number === "1.2");
    expect(profile?.barTitle).toContain("Profile");
    expect(profile?.barTitle, "Register is the row above").not.toContain("Register");
  });
});

test.describe("E797 — a start with no end is an open bar", () => {
  test("it draws from its start to the right edge instead of 'not scheduled'", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const open = page.locator('[data-plan-row="2"] [data-plan-bar]');
    await expect(open).toHaveAttribute("data-plan-bar", "top-open");
    /** ⚠⚠ THE ONE DATE IT HAS IS NAMED, and the absence of the other is stated —
     *  a bar running to the edge must not read as "ends on the last day". */
    await expect(open).toHaveAttribute("title", /from 2026-12-01, no end date/);
    const row2 = page.locator('[data-plan-row="2"]');
    await expect(row2, "the row that HAS a date must not say it is unscheduled").not.toContainText(
      "not scheduled",
    );

    /** ⚠ It reaches the right-hand edge of its own track, within a pixel. */
    const geom = await page.evaluate(() => {
      const row = document.querySelector('[data-plan-row="2"]');
      const bar = row?.querySelector("[data-plan-bar]");
      const track = bar?.parentElement;
      if (!bar || !track) return null;
      const b = bar.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      return { gap: t.right - b.right, left: b.left - t.left, width: b.width };
    });
    expect(geom, "no bar to measure").not.toBeNull();
    expect(geom!.gap, "the bar must reach the right edge").toBeLessThanOrEqual(1.5);
    /** ⚠⚠ AND IT MUST START WHERE ITS DATE IS, NOT AT ZERO. A bar spanning the
     *  whole track would also pass the edge test above (ruling 12). */
    expect(geom!.left, "it starts at its own start date, not at the left edge").toBeGreaterThan(10);

    /**
     * ⚠⚠⚠ THE DISCRIMINATOR: a row with NEITHER date still says "not scheduled",
     * so this is a fix to one state and not a blanket removal of the words.
     */
    await expect(page.locator('[data-plan-row="3"]')).toContainText("not scheduled");
  });
});
