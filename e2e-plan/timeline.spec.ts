import { expect, test } from "@playwright/test";
import { createTestPlan, dropTestPlan, liveRowCount, planDb } from "./_plan-state";

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

/** The live plan is never read for its CONTENT — only counted, to prove a
 *  run left it alone (`E804`). */
let liveBefore = 0;
let planId: string | null = null;

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

test.beforeAll(async () => {
  liveBefore = await liveRowCount();
  /* Its OWN plan, created empty (`E804`). Never the live one. */
  planId = await createTestPlan();
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
      /* A third dated top-level row and a dated milestone, so the axis test has
         a population worth measuring — children are not drawn in the chart any
         more (`E803`), and two bars is too few to call an alignment check. */
      { plan_id: planId, parent_id: null, sort: 3, type: "phase", title: "Prove", status: "Planned", start_date: d("2026-11-10"), end_date: d("2026-11-14") },
      { plan_id: planId, parent_id: null, sort: 4, type: "milestone", title: "R1 — Public beta", status: "Planned", start_date: d("2026-11-15"), end_date: d("2026-11-15") },
    ],
  });
});

test.afterAll(async () => {
  await dropTestPlan();
  /* The one thing still asserted about the live plan: that this run did
     not change its row count. A count, never its contents. */
  const after = await liveRowCount();
  if (after !== liveBefore) {
    throw new Error(`the live plan changed during this run: ${liveBefore} rows -> ${after}`);
  }
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

test.describe("E803 — the chart shows top-level rows only", () => {
  test("no child rows in the timeline, and no expander in it", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "Plan timeline" })).toBeVisible();

    const rows = await drawn(page);
    /* Scott, 2026-10-03: the child rows live in the grid below, not the chart. */
    expect(rows.map((r) => r.number)).toEqual(["1", "2", "3", "4", "◆"]);
    expect(
      rows.filter((r) => r.number.includes(".")),
      "a numbered child row means children leaked back into the chart",
    ).toEqual([]);
    await expect(
      page.locator('[aria-label="Plan timeline"] button'),
      "the chart has no expander now — the grid owns that",
    ).toHaveCount(0);
  });

  test("the scrubber draws a line and a date, and a bar names itself", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const area = page.locator("[data-plan-scrubarea]");
    const box = await area.boundingBox();
    expect(box, "no scrub area").not.toBeNull();

    /* Nothing before the pointer arrives — the scrubber is an interaction, not
       a permanent mark (the Today line is the permanent one). */
    await expect(page.locator("[data-plan-scrub]")).toHaveCount(0);
    await expect(page.locator("[data-plan-today]")).toHaveCount(1);

    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height / 2);
    const scrub = page.locator("[data-plan-scrub]");
    await expect(scrub).toHaveCount(1);
    /* The date it reports is the date at that position, mid-span. */
    const at = await scrub.getAttribute("data-plan-scrub");
    expect(at, `mid-track date: ${at}`).toMatch(/^2026-(10|11)-\d{2}$/);
    await expect(page.locator("[data-plan-scrub-date]")).toBeVisible();

    /* Moving right advances the date, which is what makes it a scrubber. */
    await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height / 2);
    const later = await page.locator("[data-plan-scrub]").getAttribute("data-plan-scrub");
    expect(Date.parse(later!) > Date.parse(at!), `${at} → ${later}`).toBe(true);

    /* And the bar's own tooltip, in Scott's format. */
    const bar = page.locator('[data-plan-row="1"]');
    const title = await page
      .locator('[data-plan-bar="top"]')
      .first()
      .getAttribute("title");
    expect(title, `bar tooltip: ${title}`).toMatch(
      /^1 Build · \w{3} \d{1,2} – \w{3} \d{1,2} · In progress$/,
    );
    expect(await bar.count()).toBe(1);
  });
});

test.describe("E797 — the tooltip belongs to its own row", () => {
  test("every bar's tooltip names the row it sits in, children included", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const rows = await drawn(page);
    expect(rows.length, "nothing drawn to check").toBeGreaterThan(2);
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
    /* The pair from the walk now lives in the grid; here the top-level rows
       must each name themselves. */
    const build = rows.find((r) => r.number === "1");
    expect(build?.barTitle).toContain("Build");
    expect(build?.barTitle, "Operate is the row below").not.toContain("Operate");
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
    await expect(open).toHaveAttribute("title", /from Dec 1, no end date/);
    await expect(open).toHaveAttribute("data-plan-start", "2026-12-01");
    await expect(open).toHaveAttribute("data-plan-end", "");
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
            /* The declared hook, not the tooltip: the tooltip formats dates
               for a reader and parsing it tied this test to a copy decision. */
            const start = bar.getAttribute("data-plan-start") || null;
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
      expect(bars.length, "no dated bars to measure").toBeGreaterThan(2);

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

/**
 * ── THE PLAN GRID (`P2-ALL-E803`) ───────────────────────────────────────────
 *
 * Scott, 2026-10-03: columns # · Name · Owner · Start · End · Status, each phase
 * expanding to its child rows, Build open by default, working at 390.
 */
test.describe("E803 — the collapsible grid", () => {
  test("six columns, Build open by default, others collapsed", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const grid = page.locator("section", { has: page.getByRole("heading", { name: "See the Details", exact: true }) });
    await expect(grid).toBeVisible();
    /* `E822` (R-E015) — Owner left the PUBLIC grid; the admin editor keeps it. */
    for (const col of ["#", "Name", "Start", "End", "Status"]) {
      await expect(grid.getByText(col, { exact: true }).first()).toBeVisible();
    }

    /* Build is the In progress row in the fixture, so it opens on load and its
       children are already on screen; the others are shut. */
    const numbers = await grid
      .locator("[data-plan-grid-row]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-plan-grid-row")));
    expect(numbers).toEqual(["1", "1.1", "1.2", "1.3", "2", "3", "4", "◆"]);
    await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(1);

    /* Collapsing it removes exactly its children. */
    await grid.locator("button").first().click();
    const shut = await grid
      .locator("[data-plan-grid-row]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-plan-grid-row")));
    expect(shut).toEqual(["1", "2", "3", "4", "◆"]);

    /* A leaf has no expander — an arrow promising rows that do not exist. */
    await expect(grid.locator("button")).toHaveCount(1);
  });

  test("the dates are readable at 390, not dropped", async ({ page }) => {
    test.skip(planId === null, "no plan to render");
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const grid = page.locator("section", { has: page.getByRole("heading", { name: "See the Details", exact: true }) });
    /* The six-column header drops to three at phone width and the data moves
       under the name — dropping it entirely would hide it. */
    const row = grid.locator('[data-plan-grid-row="1"]');
    await expect(row).toContainText("Build");
/* `E809`'s table keeps a Start column at phone width — the dash-joined pair
       belonged to the card layout it replaced. */
    await expect(row, "the dates must still be on screen").toContainText(/\w{3} \d{1,2}/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "no sideways scroll at 390").toBeLessThanOrEqual(1);

    /* 44px rows, the shell's touch standard. */
    const short = await grid
      .locator("[data-plan-grid-row]")
      .evaluateAll((els) =>
        els
          .map((e) => ({ n: e.getAttribute("data-plan-grid-row"), h: Math.round(e.getBoundingClientRect().height) }))
          .filter((x) => x.h < 44),
      );
    expect(short, `rows under 44px: ${JSON.stringify(short)}`).toEqual([]);
  });
});

/**
 * ── THREE LEVELS: release → phase → task (`P2-ALL-E807`) ────────────────────
 *
 * Scott, 2026-10-03: a new top-level release containing phases, each release
 * heading showing its own % and due date, the grid expanding release → phase →
 * task, and the chart showing releases as the top band.
 */
test.describe("E807 — releases are the third level", () => {
  let relPlan: string | null = null;

  test.beforeAll(async () => {
    relPlan = await createTestPlan();
    const rel = await planDb.planRow.create({
      data: {
        plan_id: relPlan, parent_id: null, sort: 0, type: "release", title: "R9 — Test beta",
        status: "In progress", start_date: d("2026-10-01"), end_date: d("2026-11-15"),
      },
      select: { id: true },
    });
    const phase = await planDb.planRow.create({
      data: {
        plan_id: relPlan, parent_id: rel.id, sort: 0, type: "phase", title: "Build",
        status: "In progress", start_date: d("2026-10-01"), end_date: d("2026-11-09"),
      },
      select: { id: true },
    });
    await planDb.planRow.createMany({
      data: [
        /* Two Done, one In progress, one Planned → (2 + ½) / 4 = 63%. Every
           fixture value differs so no two can agree by accident. */
        { plan_id: relPlan, parent_id: phase.id, sort: 0, type: "task", title: "Alpha", status: "Done", start_date: d("2026-10-01"), end_date: d("2026-10-10") },
        { plan_id: relPlan, parent_id: phase.id, sort: 1, type: "task", title: "Beta", status: "Done", start_date: d("2026-10-11"), end_date: d("2026-10-20") },
        { plan_id: relPlan, parent_id: phase.id, sort: 2, type: "task", title: "Gamma", status: "In progress", start_date: d("2026-10-21"), end_date: d("2026-10-31") },
        { plan_id: relPlan, parent_id: phase.id, sort: 3, type: "task", title: "Delta", status: "Planned", start_date: d("2026-11-01"), end_date: d("2026-11-09") },
        { plan_id: relPlan, parent_id: rel.id, sort: 1, type: "milestone", title: "Launch", status: "Planned", start_date: d("2026-11-15"), end_date: d("2026-11-15") },
        { plan_id: relPlan, parent_id: null, sort: 1, type: "phase", title: "Operate", status: "Planned", start_date: d("2026-12-01"), end_date: null },
      ],
    });
  });

  test("the grid nests three deep, with the release open on arrival", async ({ page }) => {
    test.skip(relPlan === null, "no plan");
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const rows = await page
      .locator("[data-plan-grid-row]")
      .evaluateAll((els) =>
        els.map((e) => ({
          n: e.getAttribute("data-plan-grid-row"),
          d: Number(e.getAttribute("data-plan-grid-level")) - 1,
        })),
      );
    /* The release and its In-progress phase are both open by default, so all
       three levels are on screen: release → 1 Build → 1.1..1.4. */
/* `E809` outline numbering: the release is 1, its stage 1.1, its tasks
       1.1.1…, the milestone prints ◆, and Operate is 2. */
    expect(rows.map((r) => r.n)).toEqual([
      "1", "1.1", "1.1.1", "1.1.2", "1.1.3", "1.1.4", "◆", "2",
    ]);
    expect(rows.map((r) => r.d)).toEqual([0, 1, 2, 2, 2, 2, 1, 0]);

    /* A PHASE INSIDE A RELEASE IS STILL NUMBERED 1, not 1.1 — the release takes
       no number, which is what makes Scott's outline read as he wrote it. */
    expect(rows.find((r) => r.n === "1")?.d).toBe(0);

    /* The release heading carries its own percentage: (2 Done + ½ × 1) of 4. */
    await expect(page.locator("[data-plan-release-pct]")).toHaveAttribute("data-plan-release-pct", "63");
    /* And the hero is the SAME number, not a second computation. */
    await expect(page.locator("[data-hero-figure]")).toHaveText("63");

    /* Collapsing the release hides everything under it, Operate excepted. */
    await page.locator('[data-plan-grid-row="1"] button').first().click();
    const shut = await page
      .locator("[data-plan-grid-row]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-plan-grid-row")));
    expect(shut).toEqual(["1", "2"]);
  });

  test("the chart draws releases as the top band, phases under, no tasks", async ({ page }) => {
    test.skip(relPlan === null, "no plan");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });

    const chart = await page
      .locator('[aria-label="Plan timeline"] [data-plan-row]')
      .evaluateAll((els) =>
        els.map((e) => ({ n: e.getAttribute("data-plan-row"), band: e.getAttribute("data-plan-band") })),
      );
    expect(chart.map((c) => c.n)).toEqual(["1", "1.1", "◆", "2"]);
    expect(chart[0].band, "the release is the band").toBe("release");
    expect(chart[1].band, "a phase is not").toBeNull();
    /* Tasks stay out of the chart — they are the grid's job. */
    /* A STAGE is "1.1" and belongs here; only a TASK ("1.1.1") does not. The
       dot test was written before outline numbering gave stages a dot too. */
    expect(
      chart.filter((c) => (c.n ?? "").split(".").length > 2),
      "no task rows in the chart",
    ).toEqual([]);
  });

  test.afterAll(async () => {
    await dropTestPlan();
  });
});
