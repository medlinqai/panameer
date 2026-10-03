import { expect, test } from "@playwright/test";
import { assertPlanRestored, planDb, restorePlan, snapshotPlan, type PlanSnapshot } from "./_plan-state";

/**
 * ── `E785` — THE HERO FIGURE COMES FROM THE PLAN ────────────────────────────
 *
 * ⚠⚠⚠ **THIS SUITE EXISTS BECAUSE THE FIRST VERSION PRINTED A BARE DASH.** The
 * "Scope being set" branch tested the AIM-derived `rel.percent` while the figure
 * below it came from the plan — two definitions of one number (`E585`) — so with
 * R1 carrying AIM task states and the plan empty, the page rendered `—` with no
 * reason. ⚠ A dash must carry its reason (`decisions_2026-09-23.md` §1), and
 * this is the page a stranger lands on.
 *
 * ⚠ It runs with the plan EMPTY, which is the live state until Scott builds his.
 */

const OWNER = "panameer-build";
let before: PlanSnapshot;
let planId: string | null = null;

test.beforeAll(async () => {
  before = await snapshotPlan(OWNER);
  const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
  planId = plan?.id ?? null;
  if (planId) await planDb.planRow.deleteMany({ where: { plan_id: planId } });
});

test.afterAll(async () => {
  await restorePlan(before);
  await assertPlanRestored(before);
});

test("an empty plan says why rather than printing a dash", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Scope being set")).toBeVisible();
  /**
   * ⚠⚠ AND THE FIGURE MUST NOT BE RENDERED AT ALL. Asserting only the presence
   * of the sentence would pass with both on screen.
   * ⚠⚠⚠ IT ASSERTS THE FIGURE ELEMENT, NOT "no em-dash in the hero" — my first
   * version did the latter and failed on legitimate copy: the hero carries
   * **"R1 — Public beta"**, so a text search for an em-dash matches the release
   * name. ⚠ A false red is worse than no check (ruling 10).
   */
  await expect(page.locator("[data-hero-figure]")).toHaveCount(0);
});

test("the plan section says the plan is being set up, not nothing", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("The plan is being set up", { exact: false })).toBeVisible();
  /** ⚠ And no timeline is drawn from no dates (`E769`). */
  await expect(page.getByRole("region", { name: "Plan timeline" })).toHaveCount(0);
});

test("a measured zero renders as 0%, in ink — not as a dash", async ({ page }) => {
  /**
   * ⚠⚠⚠ THE DISCRIMINATOR. Without this, the first test would pass for a page
   * that printed "Scope being set" for every state, including a plan with real
   * rows that simply are not done yet. ⚠ One Planned row is a MEASURED zero and
   * must print `0%` (ruling 11: the compared values have to differ).
   */
  test.skip(!planId, "no plan record exists to add a row to");
  /**
   * ⚠⚠⚠ THE ROW MUST BE TAGGED TO R1, AND LEARNING THAT IS THE POINT OF THIS
   * TEST. The hero shows the CURRENT RELEASE's readiness when a release exists
   * — Scott: *"that should differ based on MVP R1 and R2"* — so an untagged row
   * leaves R1 with no scope and the figure correctly stays uncountable.
   * ⚠ My first version added an untagged row and expected 0%; it got
   * "Scope being set", which was the code being RIGHT.
   */
  const r1 = await planDb.workTrackerRelease.findFirst({ where: { code: "R1" }, select: { id: true } });
  await planDb.planRow.create({
    data: {
      plan_id: planId!, parent_id: null, sort: 0, type: "phase", title: "Define",
      status: "Planned", release_id: r1?.id ?? null,
    },
  });
  try {
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Scope being set")).toHaveCount(0);
    await expect(page.locator("[data-hero-figure]")).toHaveText("0");
    /** ⚠ And the `%` sign is beside it — a bare `0` would be the same defect
     *  as a bare dash. */
    await expect(page.locator("[data-hero-figure]").locator("xpath=following-sibling::span")).toHaveText("%");
  } finally {
    await planDb.planRow.deleteMany({ where: { plan_id: planId! } });
  }
});

/**
 * ── ⚠⚠⚠ `E776`'s RULE, RE-HOMED HERE BY `E785` ──────────────────────────────
 *
 * ⚠ It lived in `e2e-sr7/e776-hero.spec.ts`, which is now retired (`E164`):
 * every test there measures the hero against a rendered FIGURE, and the figure
 * now comes from the plan — so an empty plan renders *"Scope being set"* and
 * there is nothing to measure.
 * ⚠⚠⚠ **FOUR OF ITS FIVE TESTS HAD ALREADY STARTED PASSING VACUOUSLY**, because
 * `lines === 1` is true of the sentence too. ⚠ It is here instead because this
 * file owns plan state and can create the precondition the rule needs.
 */
test.describe("E776 (re-homed) — the hero headline holds one line", () => {
  test.beforeAll(async () => {
    const r1 = await planDb.workTrackerRelease.findFirst({ where: { code: "R1" }, select: { id: true } });
    const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
    if (!plan) return;
    await planDb.planRow.deleteMany({ where: { plan_id: plan.id } });
    /** ⚠ Tagged to R1 and Done, so the hero shows a real, countable figure. */
    await planDb.planRow.create({
      data: {
        plan_id: plan.id, parent_id: null, sort: 0, type: "phase", title: "Define",
        status: "Done", release_id: r1?.id ?? null,
      },
    });
  });

  /** ⚠ Reads the rendered line count, the font size and the column width.
   *  ⚠⚠ It targets `[data-hero-figure]` — the declared hook — rather than
   *  `.tabular-nums`, which was a styling class and is why the old helper went
   *  silently blind when the markup changed. */
  async function measure(page: import("@playwright/test").Page, figure: string) {
    return page.evaluate((v) => {
      const fig = document.querySelector("[data-hero-figure]");
      if (fig) fig.textContent = v;
      const el = document.querySelector("h1")!;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || b.height;
      return {
        lines: Math.round(b.height / lh),
        fontSize: Math.round(parseFloat(cs.fontSize)),
        column: Math.round((el.parentElement as HTMLElement).getBoundingClientRect().width),
        hadFigure: fig !== null,
      };
    }, figure);
  }

  for (const w of [1024, 1280, 1440, 1600]) {
    test(`one line at ${w}, with a two- and a three-digit figure`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      for (const figure of ["84", "100"]) {
        const m = await measure(page, figure);
        /** ⚠⚠⚠ THE GUARD THAT THE OLD SUITE LACKED: without this the assertion
         *  below passes on a hero with no figure at all. */
        expect(m.hadFigure, `no hero figure rendered at ${w} — the test would pass vacuously`).toBe(true);
        expect(m.lines, `"${figure}" at ${w} wraps`).toBe(1);
      }
    });
  }

  test("a wider column gets bigger type, and 52px is the ceiling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const two = await measure(page, "84");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const three = await measure(page, "100");
    expect(two.hadFigure && three.hadFigure, "both runs need a figure").toBe(true);
    expect(three.column, "a 3-digit figure narrows the column").toBeLessThan(two.column);
    expect(three.fontSize, "and the headline steps down with it").toBeLessThan(two.fontSize);
    expect(two.fontSize, "52px is the ceiling, never exceeded").toBeLessThanOrEqual(52);
  });
});

/**
 * ── ⚠⚠⚠ EVERY FIGURE IN THE HERO COMES FROM THE PLAN (`P2-ALL-E790`) ────────
 *
 * ⚠⚠ **THIS GUARD EXISTS BECAUSE THE LIVE PAGE CONTRADICTED ITSELF MINUTES AFTER
 * `E785` DEPLOYED:** the hero read **0%** (R1's readiness, from the plan) while
 * the lines beneath read **"31% of the whole plan"** and **"66 done · 36
 * moving"** — counted from the AIM task states. ⚠ Two definitions of progress,
 * side by side, both labelled as the plan (`E585`), on the page a stranger lands
 * on.
 * ⚠⚠⚠ **IT ASSERTS THE NUMBERS AGAINST THE DATABASE**, not against each other:
 * agreement between two wrong numbers is what let this ship.
 */
test.describe("E790 — the hero's figures are the plan's", () => {
  let r1: string | null = null;

  test.beforeAll(async () => {
    const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
    if (!plan) return;
    const rel = await planDb.workTrackerRelease.findFirst({ where: { code: "R1" }, select: { id: true } });
    r1 = rel?.id ?? null;
    await planDb.planRow.deleteMany({ where: { plan_id: plan.id } });
    /**
     * ⚠ A fixture whose numbers DIFFER from each other, deliberately: R1 is
     * 1 of 2 = 50%, the whole plan is 1 of 3 = 33%, and 1 row is moving. ⚠⚠ If
     * the three agreed, a page that printed any one of them everywhere would
     * pass (ruling 11 — two zeros agree, two ones agree).
     */
    await planDb.planRow.createMany({
      data: [
        { plan_id: plan.id, parent_id: null, sort: 0, type: "phase", title: "Done one", status: "Done", release_id: r1 },
        { plan_id: plan.id, parent_id: null, sort: 1, type: "phase", title: "Moving one", status: "In progress", release_id: r1 },
        { plan_id: plan.id, parent_id: null, sort: 2, type: "phase", title: "Untagged", status: "Planned", release_id: null },
      ],
    });
  });

  test("the hero shows R1's percentage, the whole plan's, and the row counts", async ({ page }) => {
    test.skip(r1 === null, "no R1 release to tag rows to");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const hero = page.locator("section").first();

    /** R1: 1 Done of 2 tagged = 50%. */
    await expect(page.locator("[data-hero-figure]")).toHaveText("50");
    /** The whole plan: 1 Done of 3 countable = 33%. ⚠ A DIFFERENT number, which
     *  is what makes the previous assertion meaningful. */
    await expect(hero).toContainText("33% of the whole plan");
    /** And the counts, from the same `countableRows` rule as the percentages. */
    await expect(hero).toContainText("1 done · 1 moving · 3 rows");

    /** ⚠⚠ THE AIM FIGURES MUST NOT APPEAR. `t.doneCount` is in the sixties and
     *  `t.overallPercent` in the thirties on real data — asserting their ABSENCE
     *  by shape is what catches a reversion to the old source. */
    const text = await hero.innerText();
    expect(text, "a gates clause belongs to the AIM catalog, not a plan").not.toMatch(/of \d+ gates/);
  });
});
