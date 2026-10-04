import { expect, test } from "@playwright/test";
import { createTestPlan, dropTestPlan, liveRowCount, planDb } from "./_plan-state";

/**
 * ── `E785` — THE PLAN ON `/status`, SIGNED OUT ──────────────────────────────
 *
 * ⚠⚠ Rows are written straight to the database rather than typed through the
 * editor: this suite is about what a STRANGER sees, and driving the admin UI to
 * get there would make an editor failure look like a public-page failure.
 *
 * ⚠⚠⚠ **THE LEAK TEST PLANTS A REAL ADMIN NOTE AND LOOKS FOR IT EVERYWHERE** —
 * the rendered page and the public API. ⚠ A guard that only checks a field name
 * is absent proves nothing; this checks the VALUE cannot be found.
 */

/** ⚠ Distinctive enough that a match cannot be a coincidence. */
const SECRET = "ADMIN-ONLY-E785-do-not-publish-7Q4";
/** The live plan is never read for its CONTENT — only counted, to prove a
 *  run left it alone (`E804`). */
let liveBefore = 0;
let planId: string;

test.beforeAll(async () => {
  liveBefore = await liveRowCount();
  /* Its OWN plan, created empty (`E804`). Never the live one. */
  planId = await createTestPlan();

  const build = await planDb.planRow.create({
    data: {
      plan_id: planId, parent_id: null, sort: 0, type: "phase", title: "Build",
      start_date: new Date("2026-09-20T00:00:00Z"), end_date: new Date("2026-11-01T00:00:00Z"),
      status: "In progress",
      public_note: "Eight journeys land before the beta.",
      admin_note: SECRET,
    },
    select: { id: true },
  });
  await planDb.planRow.createMany({
    data: [
      { plan_id: planId, parent_id: build.id, sort: 0, type: "task", title: "Public",
        start_date: new Date("2026-09-20T00:00:00Z"), end_date: new Date("2026-09-30T00:00:00Z"),
        status: "Done", owner: "Scott" },
      { plan_id: planId, parent_id: build.id, sort: 1, type: "task", title: "Register",
        status: "Planned", admin_note: SECRET },
      /** ⚠ A row with an end date in the past and no Done — the `Past due` case. */
      { plan_id: planId, parent_id: build.id, sort: 2, type: "task", title: "Profile",
        start_date: new Date("2026-09-20T00:00:00Z"), end_date: new Date("2026-09-25T00:00:00Z"),
        status: "In progress" },
    ],
  });
  await planDb.planRow.create({
    data: { plan_id: planId, parent_id: null, sort: 1, type: "milestone", title: "R1 — Public beta",
      start_date: new Date("2026-11-15T00:00:00Z"), end_date: new Date("2026-11-15T00:00:00Z"),
      status: "Planned" },
  });
  /** ⚠ An unscheduled phase — it must read "Not scheduled", never a guessed bar. */
  await planDb.planRow.create({
    data: { plan_id: planId, parent_id: null, sort: 2, type: "phase", title: "Operate", status: "Planned" },
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

test("a signed-out visitor sees the plan: timeline, caption and accordions", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Plan timeline" })).toBeVisible();
  /** ⚠ Scott's caption, verbatim — it is the reason the plan is public. */
  await expect(page.getByText("The same plan tool you'll use on your work orders.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "See the Details", exact: true })).toBeVisible();
  /*
    `E803` replaced the `<details>` accordions with the grid. Scoped to the
    grid's own rows: "Build" also appears in the Build Line and the chart above,
    and the milestone appears again in the Releases section below.
  */
  const grid = page.locator("[data-plan-grid-row]");
  await expect(grid.filter({ hasText: "Build" }).first()).toBeVisible();
  await expect(grid.filter({ hasText: "R1 — Public beta" }).first()).toBeVisible();
});

test("the AIM journey grid and stage list are gone from the page", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  /** ⚠⚠ The sections the plan replaced. `/api/status` still CARRIES the AIM
   *  keys — the AIM checklist is a live admin surface — so this asserts the
   *  PAGE, which is what changed. */
  await expect(page.getByText("Ten parts of one platform.")).toHaveCount(0);
  /** ⚠ And the sections that stayed are still there, or this test would pass on
   *  a blank page (ruling 11). */
  /*
    `E810` replaced "What changed, day by day" with "Take a Look", and the
    support block is hidden until a Deploy ◆ is Done. The discriminator is now
    the section that DID stay, so this still cannot pass on a blank page.
  */
  await expect(page.getByRole("heading", { name: "Take a Look" })).toBeVisible();
});

test("the in-progress phase is open by default and its children are visible", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  /* `E803`: the grid, not `<details>`. Build is the In progress phase, so it is
     the one row expanded on load — derived from the data, not a hard-coded
     title. */
  const expanded = page.locator('button[aria-expanded="true"]');
  await expect(expanded).toHaveCount(1);
  /* The button holds only the caret; the title is its own cell, so the row is
     what carries the name. */
  await expect(
    page.locator("[data-plan-grid-row]").filter({ hasText: "Build" }).first(),
  ).toBeVisible();
  /* Its tasks are therefore readable without a click. */
  /* The fixture's Build is the only In-progress row, so it is the one expanded;
     its children are 1.1 and 1.2 under `E809`'s outline numbering. */
  await expect(page.locator('[data-plan-grid-row="1.1"]')).toContainText("Public");
  await expect(page.locator('[data-plan-grid-row="1.2"]')).toContainText("Register");
});

test("an unscheduled row says so, and a past-due row is marked", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  /** ⚠⚠ "Not scheduled" and a real date must not look the same — `E769`'s rule:
   *  a dash carries its reason and a bar is never guessed. */
  await expect(page.getByText("Not scheduled").first()).toBeVisible();
  await expect(page.getByText("Past due").first()).toBeVisible();
});

test("the overall figure is the plan's, counted from leaf rows", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    plan: { progress: { done: number; moving: number; total: number; percent: number } };
  };
  /**
   * ⚠⚠ Three leaves (Public, Register, Profile) plus Operate, which is an empty
   * phase and therefore work. `Build` is a container and the milestone is a
   * date, so neither counts.
   * ⚠⚠⚠ **ONE Done AND ONE In progress → (1 + ½) of 4 = 38%** (`E797`, half
   * credit). ⚠ The old Done-only rule read **25%** on this same fixture, so this
   * number fails if the weighting is removed.
   * ⚠ SUPERSEDED, quoted not deleted (`E164`):
   * //   One is Done -> 1 of 4 = 25%.
   */
  expect(body.plan.progress, JSON.stringify(body.plan.progress)).toMatchObject({
    done: 1,
    moving: 1,
    total: 4,
    percent: 38,
  });
});

test("LEAK TEST: an admin note never reaches the page or the public API", async ({ page, request }) => {
  const res = await request.get("/api/status");
  const raw = await res.text();
  expect(raw, "the admin note must not be in the public payload").not.toContain(SECRET);
  expect(raw, "nor the field name").not.toContain("admin_note");
  /** ⚠ The public note SHOULD be there — otherwise this test would pass against
   *  a payload carrying no notes at all (ruling 11). */
  expect(raw).toContain("Eight journeys land before the beta.");

  await page.goto("/status", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  expect(html, "the admin note must not be in the rendered page").not.toContain(SECRET);
  await expect(page.getByText("Eight journeys land before the beta.")).toBeVisible();
});

test("LEAK TEST: the needle is real — it IS in the database on two rows", async () => {
  /** ⚠⚠⚠ WITHOUT THIS, THE LEAK TEST PASSES IF THE SEED NEVER WROTE THE NOTE.
   *  An assertion whose subject does not exist is not an assertion (`E586`). */
  const n = await planDb.planRow.count({ where: { plan_id: planId, admin_note: SECRET } });
  expect(n, "the leak test needs its needle planted").toBe(2);
});

test("the public API still carries the AIM keys — its data was not discarded", async ({ request }) => {
  const res = await request.get("/api/status");
  const body = (await res.json()) as Record<string, unknown>;
  /** ⚠ The AIM checklist stays a live admin surface, so its payload stays too.
   *  ⚠⚠ This is the guard against "the plan replaced it" being read as "the
   *  tracker was deleted". */
  for (const key of ["phases", "gates", "currentPhaseStages", "journeys", "shipped", "support", "plan"]) {
    expect(body[key], `${key} missing from /api/status`).toBeDefined();
  }
});

test("no sideways scroll on /status at 390 or 1100", async ({ page }) => {
  for (const width of [390, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
  }
});

test("the timeline's week labels never overlap — E777's rule, new geometry", async ({ page }) => {
  /**
   * ⚠⚠ **THE RULE OUTLIVED ITS GATE.** `E777` asserted that the Build Line's
   * phase labels do not collide; `E785` replaced that section, so the DOM half
   * of `e2e-sr7/e777-buildline.spec.ts` is retired (`E164`) and its pure
   * `assignRows` unit test is kept. ⚠ This is the same rule on the surface that
   * replaced it: the plan timeline thins its ticks to at most ~12, and the
   * thinning is what this proves.
   * ⚠ Ruling 14 — when the code a rule names goes away, the rule may not.
   */
  const visible: Record<number, number> = {};
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    /**
     * ⚠⚠⚠ VISIBLE TICKS ONLY (`E798`). `E798` thins the axis to every third
     * label below `sm`, and a `display: none` element reports a ZERO-SIZED rect
     * at the origin — so including the hidden ones made the comparison pass
     * trivially on them while saying nothing about what a reader sees.
     * ⚠ SUPERSEDED, quoted not deleted (`E164`):
     * //   els.map((el) => el.getBoundingClientRect()).map(...)  — every tick
     */
    const boxes = await page.locator("[data-plan-tick]").evaluateAll((els) =>
      els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0)
        .map((r) => ({ left: r.left, right: r.right }))
        .sort((a, b) => a.left - b.left),
    );
    /** ⚠ Count > 0 (`E586`): a no-overlap check over no labels proves nothing. */
    expect(boxes.length, `no week ticks rendered at ${width}`).toBeGreaterThan(1);
    visible[width] = boxes.length;
    for (let i = 1; i < boxes.length; i++) {
      expect(
        boxes[i].left,
        `tick ${i} overlaps tick ${i - 1} at ${width}px`,
      ).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5);
    }
  }
  /**
   * ⚠⚠ AND THE THINNING ITSELF IS ASSERTED, not only its consequence. A
   * component that rendered ONE label would satisfy every overlap check above —
   * the no-collision rule passes most easily by showing nothing (ruling 12).
   */
  /*
    `E819`: thinning is ADAPTIVE now. `weekTicks` already thins by span, and a
    SHORT plan has few enough labels that hiding more would leave one or two —
    a label nobody can see is not a label. So the rule is "never MORE on a
    phone", plus the no-overlap check above, which is the thing that actually
    matters.
    Superseded, quoted not deleted:
    //   expect(visible[390]).toBeLessThan(visible[1440]);
    //   expect(visible[390], "but still more than a couple").toBeGreaterThan(2);
  */
  expect(
    visible[390],
    `a phone must not show MORE labels than a desktop: ${JSON.stringify(visible)}`,
  ).toBeLessThanOrEqual(visible[1440]);
  expect(visible[390], "and at least two, or the axis says nothing").toBeGreaterThanOrEqual(2);
});
