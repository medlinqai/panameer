import { expect, test } from "@playwright/test";
import { createTestPlan, dropTestPlan, liveRowCount, planDb } from "./_plan-state";

/**
 * ── `E792` — THE BUILD LINE IS BACK, ABOVE THE PLAN'S TIMELINE ──────────────
 *
 * ⚠ Scott: keep the thin line — *"it is cleaner"* — and the Gantt under it,
 * lighter. ⚠⚠ The ORDER is the assertion that matters: line → timeline →
 * accordions, because the line is the one-glance answer.
 */
/**
 * ITS OWN PLAN (`P2-ALL-E804`). Scott: "no test may read or write the
 * panameer-build plan, ever again." These phase names are the ones the Build
 * Line asserts, so they are created here rather than borrowed from live data.
 */
let planId: string | null = null;
let liveBefore = 0;
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

test.beforeAll(async () => {
  liveBefore = await liveRowCount();
  planId = await createTestPlan();
  const build = await planDb.planRow.create({
    data: {
      plan_id: planId, parent_id: null, sort: 2, type: "phase", title: "Build",
      status: "In progress", start_date: d("2026-09-20"), end_date: d("2026-11-09"),
    },
    select: { id: true },
  });
  await planDb.planRow.createMany({
    data: [
      { plan_id: planId, parent_id: null, sort: 0, type: "phase", title: "Define", status: "Done", start_date: d("2026-08-15"), end_date: d("2026-08-22") },
      { plan_id: planId, parent_id: null, sort: 1, type: "phase", title: "Design", status: "Done", start_date: d("2026-08-22"), end_date: d("2026-09-20") },
      { plan_id: planId, parent_id: build.id, sort: 0, type: "task", title: "Register", status: "In progress", start_date: d("2026-09-20"), end_date: d("2026-10-24") },
      { plan_id: planId, parent_id: null, sort: 3, type: "phase", title: "Prove", status: "Planned", start_date: d("2026-11-10"), end_date: d("2026-11-14") },
      { plan_id: planId, parent_id: null, sort: 4, type: "milestone", title: "R1 — Public beta", status: "Planned", start_date: d("2026-11-15"), end_date: d("2026-11-15") },
    ],
  });
});

test.afterAll(async () => {
  await dropTestPlan();
  const after = await liveRowCount();
  if (after !== liveBefore) {
    throw new Error(`the live plan changed during this run: ${liveBefore} rows -> ${after}`);
  }
});

test("the order is Build Line → plan timeline → accordions", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });

  const line = page.locator('[aria-label="Build line"]');
  const gantt = page.locator('[aria-label="Plan timeline"]');
  const acc = page.getByRole("heading", { name: "See the Details", exact: true });
  for (const [name, loc] of [["Build line", line], ["Plan timeline", gantt], ["accordions", acc]] as const) {
    await expect(loc, `${name} missing`).toBeVisible();
  }
  const y = async (l: typeof line) => (await l.first().boundingBox())!.y;
  const [a, b, c] = [await y(line), await y(gantt), await y(acc as never)];
  expect(a, `Build line (${a}) must sit above the timeline (${b})`).toBeLessThan(b);
  expect(b, `timeline (${b}) must sit above the accordions (${c})`).toBeLessThan(c);
});

test("the Build Line is drawn from the plan, not the AIM phase dates", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  const line = page.locator('[aria-label="Build line"]');
  const text = await line.innerText();
  /** ⚠⚠ The plan's own phase names. The AIM catalog's six phases include
   *  `Panameer Build`, which the plan does not — so its ABSENCE is what proves
   *  the source changed. */
  for (const name of ["Define", "Design", "Build", "Prove"]) {
    expect(text, `${name} missing from the line`).toContain(name);
  }
  expect(text, "Panameer Build is an AIM stage and must not appear").not.toContain("Panameer Build");
});

test("the Gantt is lighter: 4px task bars, 6px top-level, rounded", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  /**
   * ⚠⚠⚠ A PHASE IS EXPANDED FIRST, OR THIS TEST STOPS SEEING TASK BARS AT ALL.
   * Since `E797` made phases collapse by default, a first load draws only
   * top-level bars — so the 4px half of the assertion would have gone vacuous
   * while staying green (`E776`'s failure, and ruling 9: a gate whose population
   * changed is a gate that moved).
   */
  /* `E803`: the chart shows top-level rows only, so there is nothing to expand
     and no `task` bar to measure here — the heights asserted below are the
     top-level ones and the milestone. */
  /** ⚠ `[data-plan-bar]` — a declared hook. Selecting `span[title]` matched the
   *  row label once it gained a tooltip, which is the same class of mistake as
   *  `E776`'s `.tabular-nums`. */
  const bars = await page.locator('[aria-label="Plan timeline"] [data-plan-bar]').evaluateAll((els) =>
    els.map((e) => {
      const cs = getComputedStyle(e);
      return {
        h: Math.round(parseFloat(cs.height)),
        r: cs.borderRadius,
        kind: e.getAttribute("data-plan-bar") ?? "",
      };
    }),
  );
  expect(bars.length, "no bars to measure").toBeGreaterThan(3);
  /** ⚠ 4px or 6px for a bar; the milestone diamond is 10px and is excluded by
   *  its own rotation class, so it is allowed through here. */
  /** ⚠ `E797` added the open-ended kinds `task-open` / `top-open`, which are the
   *  same two heights — the suffix says the END is unknown, not that the bar is
   *  a different weight. */
  const bad = bars.filter((b) =>
    b.kind === "milestone" ? b.h !== 10 : b.kind.startsWith("task") ? b.h !== 4 : b.h !== 6,
  );
  expect(bad, `task bars 4px · top-level 6px · diamonds 10px: ${JSON.stringify(bad)}`).toEqual([]);
  /** ⚠⚠ THE DIAMOND IS EXCLUDED, AND THAT IS NOT A LOOSENING. A milestone mark
   *  is a ROTATED SQUARE — `BuildLine`'s own flag is the same shape — so square
   *  corners are correct there and rounding it would make it a dot. ⚠ Only the
   *  BARS are asserted rounded. */
  /** ⚠ By KIND now, not by height — a diamond is excluded because it IS a
   *  diamond, not because it happens to be 10px. */
  const barsOnly = bars.filter((b) => b.kind !== "milestone" && b.kind !== "none");
  expect(barsOnly.length, "no 4/6px bars to check for rounding").toBeGreaterThan(2);
  expect(
    barsOnly.every((b) => b.r !== "0px"),
    `bars must have rounded ends like the Build Line: ${JSON.stringify(barsOnly.filter((b) => b.r === "0px"))}`,
  ).toBe(true);
});

/** Phone first, then desktop — the speed rule. */
for (const [w, h] of [[390, 1400], [1440, 1200]] as const) {
  for (const scheme of ["light", "dark"] as const) {
    test(`shot ${w} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[aria-label="Plan timeline"]')).toBeVisible();
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(o, `h-overflow at ${w}`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `e2e-plan/shots/e792-status-${w}-${scheme}.png`, fullPage: false });
    });
  }
}
