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

/**
 * ── ⚠⚠⚠ THE AXIS AND THE BARS SHARE ONE COORDINATE SPACE (`P2-ALL-E798`) ────
 *
 * ⚠ **SCOTT, MINUTES AFTER `E797` DEPLOYED:** the date axis was laid out across
 * the full width — label column included — while the bars and the Today line
 * used only the track to the right of the labels. ⚠⚠ Every bar therefore read
 * about **four weeks late**: `Define`, which ran Aug 15–22, sat under *"Sep 12"*.
 *
 * ⚠⚠⚠ **IT DERIVES THE SCALE FROM THE AXIS'S OWN TICKS AND THEN ASKS WHERE EACH
 * BAR LANDS.** It does not recompute the component's maths — that would agree
 * with itself whatever the layout did, which is exactly how this shipped.
 */
test.describe("E798 — a bar's left edge lines up with its start date", () => {
  for (const width of [390, 1280] as const) {
    test(`the axis and the bars agree at ${width}px`, async ({ page }) => {
      test.skip(planId === null, "no plan to render");
      await page.setViewportSize({ width, height: 1200 });
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      /** ⚠ Expanded, so CHILD bars are measured too — they sit in the same
       *  track and a per-row offset bug would show up there first. */
      await page.locator('[data-plan-row="1"] button').click();

      const m = await page.evaluate(() => {
        const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
        /**
         * ⚠⚠ CLAMPED TICKS ARE DISCARDED. `weekTicks` rounds up, so the last
         * label can sit past the span's end and be pinned at 100% — deriving the
         * scale from a pinned tick would bake the error into the expectation.
         */
        const ticks = [...document.querySelectorAll("[data-plan-tick]")]
          .map((e) => {
            const pctStr = parseFloat((e as HTMLElement).style.left);
            const r = e.getBoundingClientRect();
            return {
              iso: e.getAttribute("data-plan-tick") ?? "",
              x: r.left + r.width / 2,
              pct: pctStr,
              shown: r.width > 0,
            };
          })
          /**
           * ⚠⚠⚠ VISIBLE TICKS ONLY, AND THIS COST A RED RUN. `E798` thins the
           * axis to every third label below `sm`; a `display: none` element
           * reports a ZERO rect at the origin, so a hidden tick contributed
           * `x = 0` and the derived scale came out at **0.00 px/day** — every
           * bar then "expected" x = 0 and the whole test failed at 390px.
           * ⚠ A gate that reads a hidden element is measuring the wrong page.
           */
          .filter((t) => t.iso && t.shown && t.pct > 0.01 && t.pct < 99.99);
        if (ticks.length < 2) return { error: "fewer than two usable ticks", ticks: ticks.length };

        const a = ticks[0];
        const b = ticks[ticks.length - 1];
        const scale = (b.x - a.x) / (ms(b.iso) - ms(a.iso));
        const xFor = (iso: string) => a.x + (ms(iso) - ms(a.iso)) * scale;

        const bars = [...document.querySelectorAll("[data-plan-row]")]
          .map((li) => {
            const bar = li.querySelector("[data-plan-bar]");
            if (!bar) return null;
            const kind = bar.getAttribute("data-plan-bar") ?? "";
            if (kind === "none") return null;
            const title = bar.getAttribute("title") ?? "";
            const start = title.match(/\d{4}-\d{2}-\d{2}/)?.[0];
            if (!start) return null;
            const r = bar.getBoundingClientRect();
            /** ⚠ A milestone is a rotated square CENTRED on its date; a bar
             *  BEGINS on its date. Measuring both from `left` would fail the
             *  diamond by half its own width — a false red (ruling 10). */
            const at = kind === "milestone" ? r.left + r.width / 2 : r.left;
            return {
              number: li.getAttribute("data-plan-row") ?? "",
              kind,
              start,
              at: Math.round(at * 10) / 10,
              expected: Math.round(xFor(start) * 10) / 10,
              off: Math.round((at - xFor(start)) * 10) / 10,
            };
          })
          .filter(Boolean);
        return { bars, span: { from: a.iso, to: b.iso }, pxPerDay: scale * 86_400_000 };
      });

      expect(m.error, `${m.error} — the axis must carry usable ticks`).toBeUndefined();
      const bars = (m.bars ?? []) as { number: string; off: number; start: string; kind: string }[];
      expect(bars.length, "no dated bars to measure").toBeGreaterThan(3);

      /**
       * ⚠⚠ 2px, NOT A PERCENTAGE. Sub-pixel rounding and the border on a dashed
       * `Planned` bar are each worth under a pixel. ⚠⚠⚠ THE BUG THIS CATCHES WAS
       * ~28 DAYS WIDE — at this fixture's scale that is well over 100px, so the
       * tolerance is nowhere near the failure.
       */
      const off = bars.filter((b) => Math.abs(b.off) > 2);
      expect(
        off,
        `these bars do not start on their own date: ${JSON.stringify(off)} (${m.pxPerDay?.toFixed(2)} px/day)`,
      ).toEqual([]);
    });
  }

  test("the Today line sits in the track, not over the labels", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    /**
     * ⚠⚠ THE SAME DEFECT WOULD HAVE MOVED THE TODAY LINE TOO, and it is the one
     * mark a reader trusts without checking. ⚠ Today is 2026-10-03 against a
     * fixture running Oct 1 → Dec 1, so it belongs just inside the LEFT end of
     * the track — and the old full-width layout would have drawn it left of the
     * track entirely, over the row labels.
     */
    const geom = await page.evaluate(() => {
      const line = document.querySelector('[aria-label="Plan timeline"] .bg-magenta');
      const track = document.querySelector('[data-plan-row="1"] [data-plan-bar]')?.parentElement;
      if (!line || !track) return null;
      const l = line.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      return { intoTrack: l.left - t.left, trackWidth: t.width };
    });
    expect(geom, "no Today line or no track to measure").not.toBeNull();
    expect(geom!.intoTrack, "the Today line must start at or after the track's left edge").toBeGreaterThanOrEqual(-1);
    expect(geom!.intoTrack, "and inside it, not off the right end").toBeLessThan(geom!.trackWidth);
  });
});
