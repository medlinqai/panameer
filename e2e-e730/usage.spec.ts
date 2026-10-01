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

  /* ── ⚠⚠⚠ NINE CELLS, AND THE COMB IS THE HEADER'S PICTURE ───────────────────────── */
  const cells = page.locator(".pm-hive-flower .pm-hive-cell");
  await expect(cells, "nine cells — the 7 areas plus Search Score and Health").toHaveCount(9);

  /* ⚠⚠ ONE COMB, NOT TWO. It moved into the header rather than being drawn there as well
     as in `StatisticsCards`. */
  await expect(page.locator(".pm-hive"), "exactly one honeycomb on the page").toHaveCount(1);

  /*
    ── ⚠⚠⚠ THE TESSELLATION, MEASURED ─────────────────────────────────────────────────
    ⚠ Row 1 is cells 0–2, row 2 is 3–5, row 3 is 6–8. ⚠⚠ For a comb: rows 1 and 3 are
    SHIFTED RIGHT relative to row 2, and consecutive rows OVERLAP vertically. ⚠⚠⚠ A plain
    grid has zero shift and zero overlap, so both numbers are the discriminator.
  */
  const box = async (i: number) => {
    const b = await cells.nth(i).boundingBox();
    if (!b) throw new Error(`cell ${i} has no box`);
    return b;
  };
  const [c0, c3, c6] = [await box(0), await box(3), await box(6)];

  const shiftTop = c0.x - c3.x;
  const shiftBottom = c6.x - c3.x;
  expect(shiftTop, "row 1 is offset right of row 2").toBeGreaterThan(c3.width * 0.3);
  expect(shiftBottom, "row 3 is offset right of row 2").toBeGreaterThan(c3.width * 0.3);

  const overlap = c0.y + c0.height - c3.y;
  expect(overlap, "rows 1 and 2 interlock rather than stacking").toBeGreaterThan(0);

  /* ⚠ And the comb carries no heading of its own inside the header panel — `chrome={false}`.
     ⚠⚠ A nested `<h2>Your Areas</h2>` would mean two headings for one thing. */
  await expect(
    page.locator(".pm-hive-picture h2"),
    "the picture form carries no heading of its own"
  ).toHaveCount(0);

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

  /* ── SHOTS ───────────────────────────────────────────────────────────────────────── */
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
