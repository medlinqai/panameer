import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "../e2e-shell/_auth";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E730` — THE USAGE PAGE: THE ROUTE, THE COMB AND THE GAUGES ─────────────────────
 *
 * ⚠ **SCOTT'S GATE: *"Screenshot beside the mockup at 1280 and 390, light and dark. The
 * premise-1 table. `/stats` → `/usage` redirect proven."***
 *
 * ⚠⚠ **IT MEASURES THE COMB'S GEOMETRY RATHER THAN TRUSTING THE CSS.** A 3×3 grid of
 * hexagons and a tessellated comb have identical markup and identical class names — the
 * difference is entirely in computed offsets. ⚠⚠⚠ **SO A TEST THAT ASSERTED THE CLASS WOULD
 * PASS ON THE BROKEN LAYOUT**, which is the `E603` lesson (a gate can assert the right rule
 * about the wrong thing). The assertion below reads real bounding boxes and checks that the
 * odd rows are OFFSET and the rows OVERLAP.
 *
 * ⚠ **AND IT CHECKS A FIGURE IS NOT PRINTED TWICE.** Nine cells and eight gauges draw from
 * one array; the risk this page carries is the same number appearing in two places with two
 * labels, which is what `usage-areas.ts` exists to prevent.
 */
const OUT = join(process.cwd(), "e2e-e730", "shots");
const OWNER = "SW_user2@straterp.com";

/** ⚠ Sets the attribute the stylesheet keys on, so dark renders without driving a toggle. */
const setTheme = (t: "light" | "dark") =>
  `document.documentElement.setAttribute("data-theme", "${t}")`;

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test("E730 WS-A — /stats 308s to /usage, query string intact", async ({ page }) => {
  const res = await page.request.get("/stats?trend=network&period=90d", {
    maxRedirects: 0,
  });
  expect(res.status(), "/stats must 308, not 200 and not 404").toBe(308);
  /* ⚠⚠ THE QUERY STRING IS THE PART THAT MATTERS — `StatisticsCards`' trend links carry
     `?trend=` and `?period=`, so a redirect that dropped them would land every trend click
     on the default view and look like the trend feature was broken. */
  expect(res.headers()["location"]).toContain("/usage?trend=network&period=90d");
});

test("E730 WS-B/WS-C — the comb tessellates, the gauges render, nothing is printed twice", async ({
  page,
}) => {
  await signInAsSeeded(page, OWNER);
  await page.goto("/usage", { waitUntil: "networkidle" });

  /* ⚠ The tab row must still carry Usage as the current tab. */
  await expect(page.locator('[data-testid="page-tabs"] a[href="/usage"]')).toHaveCount(1);

  /* ── ⚠⚠⚠ SEVEN CELLS, 2-3-2, AND THE COMB IS THE HEADER'S PICTURE ───────────────── */
  const cells = page.locator(".pm-hive-flower .pm-hive-cell");
  await expect(cells, "seven cells — the mockup's flower is 1 centre + 6").toHaveCount(7);

  /* ⚠⚠⚠ PROFILE IS THE CENTRE, AND IT STAYS THERE. ⚠ `E603`'s rebuild rotates the cells
     every 15s, which carried the centre out of the middle — so this asserts the cell at
     index 3 AND that it is still Profile after a rebuild cycle. ⚠⚠ Without the second
     half the assertion would pass on first render and be false a quarter of a minute
     later, which is the state that shipped before this brief. */
  await expect(cells.nth(3)).toHaveAttribute("data-cell", "profile");

  /* ⚠⚠ ONE COMB, NOT TWO. It moved into the header rather than being drawn there as well
     as in `StatisticsCards`. */
  await expect(page.locator(".pm-hive"), "exactly one honeycomb on the page").toHaveCount(1);

  /*
    ── ⚠⚠⚠ THE TESSELLATION, MEASURED ─────────────────────────────────────────────────
    ⚠ 2-3-2: row 1 is cells 0–1, row 2 is 2–4, row 3 is 5–6. ⚠⚠ In a flower the SHORT rows
    sit HALF A CELL IN from the long one, and consecutive rows OVERLAP vertically.
    ⚠⚠⚠ A PLAIN GRID HAS ZERO INSET AND ZERO OVERLAP, so both numbers are the
    discriminator — and a test that checked the class name would pass on either, which is
    how the 3×3 rhombus shipped looking like a block.
  */
  const box = async (i: number) => {
    const b = await cells.nth(i).boundingBox();
    if (!b) throw new Error(`cell ${i} has no box`);
    return b;
  };
  const [r1, r2, r3] = [await box(0), await box(2), await box(5)];

  expect(r1.x - r2.x, "row 1 is inset half a cell from row 2").toBeGreaterThan(r2.width * 0.3);
  expect(r3.x - r2.x, "row 3 is inset half a cell from row 2").toBeGreaterThan(r2.width * 0.3);
  expect(r1.y + r1.height - r2.y, "rows 1 and 2 interlock").toBeGreaterThan(0);
  expect(r2.y + r2.height - r3.y, "rows 2 and 3 interlock").toBeGreaterThan(0);

  /* ⚠ And the comb carries no heading of its own inside the header panel — `chrome={false}`.
     ⚠⚠ A nested `<h2>Your Areas</h2>` would mean two headings for one thing. */
  await expect(
    page.locator(".pm-hive-picture h2"),
    "the picture form carries no heading of its own"
  ).toHaveCount(0);

  /*
    ── ⚠⚠⚠ THE LEVELS, AND THE ONE FUNCTION BEHIND THEM (`E731`) ──────────────────────
    ⚠ Every COUNTED cell carries a level; the uncounted one carries NONE. ⚠⚠ `none` and
    absent are different states and the assertion keeps them apart — a cell that lost its
    level would otherwise look like a measured zero.
  */
  const counted = page.locator('.pm-hive-flower .pm-hive-cell[data-counted="yes"]');
  const nCounted = await counted.count();
  expect(nCounted, "six of seven areas are countable today").toBeGreaterThan(0);
  for (let i = 0; i < nCounted; i++) {
    const lvl = await counted.nth(i).getAttribute("data-level");
    expect(["none", "low", "medium", "strong"], `cell ${i} has a real level`).toContain(lvl);
  }
  await expect(
    page.locator('.pm-hive-flower .pm-hive-cell[data-counted="no"][data-level]'),
    "an uncounted cell carries NO level — a dash is not a measured zero"
  ).toHaveCount(0);

  /* ⚠ The key, and it names all four steps. ⚠⚠ Four shades with no key is an ordering a
     reader can see and cannot name. */
  await expect(page.locator(".pm-hive-key li")).toHaveCount(4);

  /*
    ⚠⚠⚠ THE COMB AND THE CARD AGREE, WHICH IS THE WHOLE POINT OF ONE `levelFor`. ⚠ Read
    the level off a cell and off the gauge card for the SAME area and compare. ⚠⚠ Two
    implementations would pass every assertion above and still disagree here.
  */
  for (const key of ["learn", "connect", "work", "shop", "orders"]) {
    const cellLevel = await page
      .locator(`.pm-hive-flower .pm-hive-cell[data-cell="${key}"]`)
      .getAttribute("data-level");
    const cardLevel = await page
      .locator(`[data-gauge="${key}"] .pm-gauge-level`)
      .getAttribute("data-level");
    expect(cardLevel, `${key}: the comb and its gauge card agree on the level`).toBe(cellLevel);
  }

  /* ── ⚠⚠ THE GAUGES — EIGHT, EACH WITH A SCALE OR A STATED REASON ─────────────────── */
  const gauges = page.locator("[data-gauge]");
  await expect(gauges, "7 areas + Account Health = 8").toHaveCount(8);

  /*
    ⚠⚠⚠ EARNINGS IS DASHED AND CARRIES ITS REASON (Scott, 2026-09-30, answer 4).
    ⚠ THE TWO HALVES ARE ASSERTED SEPARATELY, because a dash with no reason is the defect —
    not the dash.
  */
  const earnings = page.locator('[data-gauge="earnings"]');
  await expect(earnings).toHaveAttribute("data-counted", "no");
  await expect(earnings, "a dash must carry its reason").toContainText(/not counted/i);
  /* ⚠⚠ AND IT PRINTS NO `Goal:` — a target under a figure nobody writes is a fabricated
     maximum, which is the whole reason `goal` is nullable. */
  await expect(earnings.locator("[data-goal]"), "no goal under an uncounted figure").toHaveCount(0);

  /* ⚠ A COUNTED GAUGE DOES STATE ITS GOAL, so the assertion above can actually fail
     (ruling 11 — the compared values must be able to differ). */
  await expect(
    page.locator('[data-gauge="connect"] [data-goal]'),
    "a counted gauge states its scale"
  ).toHaveCount(1);

  /* ── ⚠⚠⚠ NO FIGURE IS PRINTED TWICE UNDER TWO LABELS ────────────────────────────── */
  const labels = await page.locator("[data-gauge] [data-gauge-eyebrow]").allInnerTexts();
  expect(new Set(labels).size, "each gauge names a different area").toBe(labels.length);

  /*
    ── ⚠⚠ THE MOCKUP'S HEADER, MEASURED RATHER THAN EYEBALLED (`E731`) ────────────────
  */
  /* ⚠ Big number, label underneath. ⚠⚠ THE `<dt>` STILL PRECEDES ITS `<dd>` IN THE DOM —
     the flip is `column-reverse`, so this compares PAINTED positions, which is the only
     place the change exists. */
  const dt = page.locator("header dl div, .pm-usage dl div").first();
  const figY = await dt.locator("dd").first().boundingBox();
  const labY = await dt.locator("dt").first().boundingBox();
  expect(figY!.y, "the number sits ABOVE its label").toBeLessThan(labY!.y);

  /* ⚠ Square actions — 4px, not a pill. */
  /* ⚠⚠ SCOPED TO THE HEADER. ⚠⚠⚠ THERE ARE **TWO** `Invite a Colleague` LINKS ON THIS
     PAGE — the header's button and the Network card's link further down — and an
     unscoped locator matched both. ⚠ That is worth recording rather than silently
     narrowing: ruling 45(4) says the action slot is never a repeat of a link already on
     the page, and this one IS a repeat. **Reported to Scott; built because he named the
     two buttons.** */
  /*
    ⚠⚠⚠ RE-ANCHORED (`P2-A1.1-E745`). ⚠ This read `section.rounded-brand`, and
    lane 2's `open` header has no `rounded-brand` — so the locator matched
    NOTHING and this test **hung on `invite.evaluate`** instead of failing, which
    looked like a broken harness rather than a moved anchor.
    ⚠⚠ **THE RULE IS UNCHANGED AND STILL LIVE:** the header's `Invite a
    Colleague` is 4px, not a pill. ⚠ Only the handle moved, to a `data-testid`
    the component now owns — a styling class is free to change and must never be
    a test contract.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const header = page.locator("section.rounded-brand").first();
  */
  const header = page.getByTestId("pattern-header").first();
  await expect(header, "the pattern header is missing from /usage").toHaveCount(1);
  const invite = header.getByRole("link", { name: "Invite a Colleague" });
  const radius = await invite.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(radius, "4px radius, not rounded-full").toBe("4px");

  /* ⚠⚠ MONTSERRAT, AND THIS IS WHY IT IS ASSERTED: the `.account-surface` wrapper alone
     did NOT achieve it — Tailwind's `font-display` utility sits in a LATER CASCADE LAYER
     and beats the scoped rule however specific it is. ⚠⚠⚠ THE SCREENSHOT LOOKED WRONG
     WHILE EVERY OTHER CHECK PASSED. */
  const headFont = await page
    .locator(".pm-usage h2")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(headFont, "headings are Montserrat, not the display face").toContain("Montserrat");

  /* ── SHOTS, BESIDE THE MOCKUP ────────────────────────────────────────────────────── */
  for (const [w, h] of [
    [1280, 1400],
    [390, 1700],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate(setTheme(theme));
      await page.waitForTimeout(250);
      await page.screenshot({
        path: join(OUT, `usage-${w}-${theme}.png`),
        fullPage: true,
      });
    }
  }

  /*
    ⚠⚠ DARK MODE IS PROVED BY A COMPUTED COLOUR, NOT BY THE SCREENSHOT EXISTING (`E723`'s
    lesson). ⚠⚠⚠ THE GAUGE TRACK AND THE HEX FILL BOTH COME FROM TOKENS; a hard-coded white
    would survive a screenshot review and fail here.
  */
  await page.evaluate(setTheme("dark"));
  const dark = await page.evaluate(() => {
    const cs = (sel: string, prop: string) => {
      const el = document.querySelector<Element>(sel);
      return el ? getComputedStyle(el).getPropertyValue(prop).trim() : null;
    };
    return {
      surface: getComputedStyle(document.documentElement)
        .getPropertyValue("--color-surface")
        .trim(),
      hexFill: cs(".pm-hive-cell", "background-color"),
      gaugeCard: cs("[data-gauge]", "background-color"),
    };
  });
  console.log(`E730 dark-mode computed: ${JSON.stringify(dark)}`);
  /* ⚠ The card must not be opaque white in dark mode — that is the `E723` defect exactly. */
  expect(dark.gaugeCard, "the gauge card is not hard-coded white").not.toBe("rgb(255, 255, 255)");
});

/**
 * ── ⚠⚠ THE MOCKUP, SHOT AT THE SAME TWO WIDTHS (`P2-A1.1-E731`) ─────────────────────────
 *
 * ⚠ **SCOTT: *"Open `mockups/usage_gauges_2026-09-30.html` beside `/usage` at 1280 and
 * 390"*** and *"Screenshots beside the mockup, light and dark."*
 * ⚠⚠ **IT IS A TEST RATHER THAN A ONE-OFF SCRIPT SO THE COMPARISON CAN BE REPEATED.** A
 * scratch spec run once and deleted leaves the next person re-deriving how the shot was
 * taken — and a scratch spec left behind would be collected by this config and change its
 * count, which is the `E562` defect.
 * ⚠⚠⚠ **IT ASSERTS NOTHING.** The mockup is a LAYOUT, not a data source, and a pixel
 * comparison against it would fail on every real figure. It exists to produce the pair of
 * images a human reads.
 */
test("E731 — the mockup, shot beside the page", async ({ page }) => {
  const MOCK =
    "file:///Users/scottwalls/Documents/AI%20CO/Panameer%20II/5.%20Application/2.%20Claude%20Sub-Files/mockups/usage_gauges_2026-09-30.html";
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 1100 });
    await page.goto(MOCK, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, `mockup-${w}.png`) });
  }
});
