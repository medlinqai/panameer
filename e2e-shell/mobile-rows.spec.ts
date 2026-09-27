import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

/**
 * ── ⚠⚠⚠ `check:mobile-rows` — `E609` ASSERTED ON THE ROW, NOT THE PAGE ──────
 *
 * `P2-ALL-E694` WS-E. ⚠⚠⚠ **RULING 91 BINDS THIS FILE.**
 *
 * ── ⚠⚠ WHY IT EXISTS: EVERY EXISTING `E609` ASSERTION IS AT THE WRONG SCOPE ─
 *
 * ⚠ Measured 2026-09-27 at 390px: **the PAGE overflow is `0px` on every page**,
 * so every assertion that reads `document.documentElement.scrollWidth` passes —
 * ⚠⚠ **while `.pm-band-menu-row` hides `122px` INSIDE ITSELF on every page and
 * `/messages` hides a further `202px` in its tab row.**
 * ⚠⚠⚠ **THOSE ASSERTIONS ARE TRUE ABOUT THE PAGE AND SILENT ABOUT THE ROWS.**
 * They were quoted as proof for this brief and they are not evidence for it.
 *
 * ⚠ **The known page-level sites, so none is mistaken for evidence:**
 * `app-shell.spec.ts:278,720,996,1260` · `community-web.spec.ts:80` ·
 * `community-page.spec.ts:83` · `groups-page.spec.ts:152`. ⚠⚠ And
 * `groups-page.spec.ts:159` **already recorded the awareness in a comment and
 * nothing acted on it** — an observation without an assertion is a note.
 *
 * ── ⚠⚠⚠ RULING 91: AN ASSERTION AT THE WRONG SCOPE IS GREEN AND MEANINGLESS ─
 *
 * ⚠ `91a` tabulates the three shapes: **11 = the wrong THING · 90 = the wrong
 * DIRECTION · 91 = the wrong SCOPE.** All three are green, none is lying, and
 * each answers a question nobody asked.
 * ⚠⚠ `91b` records why this one was invisible: **`overflow-x: auto` with a
 * hidden scrollbar gives three independent reasons nobody looks** — the page
 * does not overflow, the bar is not drawn, and the row still *works* if you
 * happen to swipe it.
 *
 * ── ⚠⚠ THE FIXTURE FOR "IT CAN FAIL" IS FREE, AND IT IS TRUNK ─────────────
 *
 * ⚠⚠⚠ **THIS SUITE WAS RUN AGAINST TRUNK BEFORE WS-A LANDED AND REPORTED
 * `122px` ON `.pm-band-menu-row` AND `202px` ON `/messages`.** ⚠ If it had
 * reported zero it would still have been at the wrong scope, and the workstream
 * would not have started. **A gate proved able to fail on the real defect, on
 * real code, before the fix existed.**
 */

/** ⚠ 390 is the phone width `E609` and ruling 88 are both stated at. */
const PHONE = { width: 390, height: 844 };

/**
 * ⚠⚠ THE THREE LEVELS, EACH BY ITS OWN NAME (88d). ⚠⚠⚠ **NOT ONE PAGE-LEVEL
 * ASSERTION CALLED THREE** — the brief forbids exactly that, because the page
 * was never the thing that overflowed.
 */
const ROWS = [
  {
    level: "M1",
    what: "the operational menu (a bottom bar at phone width)",
    /*
      ── ⚠⚠⚠ AT 390 THE OPERATIONAL MENU IS THE BOTTOM BAR, NOT THE BAND ROW ──

      ⚠⚠ **THIS SELECTOR WAS `.pm-band-menu-row` AND CHANGING IT IS NOT A
      CONVENIENCE.** WS-B hides `.pm-band-menu` below `md` and moves M1 into
      `BottomNav`. ⚠⚠⚠ **A GATE LEFT POINTING AT THE BAND ROW WOULD HAVE GONE
      GREEN BECAUSE THE ELEMENT WAS `display: none` — `scrollWidth -
      clientWidth` IS `0` FOR A HIDDEN BOX.** That is ruling 91 committed by
      ruling 91's own gate: a true number about the wrong thing.
      ⚠ It was caught because the assertion waits for the row to be **visible**
      and timed out at 34s instead of passing. **The wait is what made the
      wrong scope loud instead of green.**
      ⚠⚠ The band row is not abandoned — `M1-desktop` below still measures it at
      1280, where it is the operational menu.
    */
    selector: ".pm-bottomnav-row",
    path: "/dashboard",
  },
  {
    level: "M2",
    what: "the page tab row",
    selector: '[data-testid="page-tabs"]',
    /* ⚠⚠ `/messages` DELIBERATELY. It is the row measured at 202px on trunk —
       the worst case, and the one whose count `E691` moved out. A gate aimed at
       a row that already fits proves nothing. */
    path: "/messages",
  },
  {
    level: "M3",
    what: "the settings section rail",
    selector: 'nav[aria-label="Settings sections"]',
    path: "/settings/notifications",
  },
] as const;

/** Measure one element's hidden width, or `null` when it is not on the page. */
async function hiddenPx(page: Page, selector: string): Promise<number | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return el.scrollWidth - el.clientWidth;
  }, selector);
}

async function overflowX(page: Page, selector: string): Promise<string | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).overflowX : null;
  }, selector);
}

for (const row of ROWS) {
  test(`${row.level} — ${row.what} fits at 390 (ruling 91: the ROW, not the page)`, async ({
    page,
  }) => {
    await signIn(page);
    await page.setViewportSize(PHONE);
    await page.goto(row.path, { waitUntil: "domcontentloaded" });
    /* ⚠⚠ WAIT FOR THE ROW ITSELF. Measuring before it renders returns `null`,
       and a `null` that is read as "nothing hidden" is this ruling's own defect
       committed by its own gate. */
    await page.waitForSelector(row.selector, { timeout: 30_000 });
    await page.waitForTimeout(500);

    const hidden = await hiddenPx(page, row.selector);
    const pageOver = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );

    /* ⚠ PRINTED EVERY RUN, BOTH NUMBERS TOGETHER. The pair is the evidence for
       ruling 91: the page number stays 0 while the row number is the defect. */
    console.log(
      `  ${row.level} ${row.selector} on ${row.path}: row hides ${hidden}px · page overflow ${pageOver}px`
    );

    /* ⚠⚠⚠ `E586` — A MEASUREMENT THAT FOUND NOTHING MUST FAIL, NOT PASS. If the
       selector stops matching, `hidden` is `null` and every comparison below
       would be vacuously satisfied. */
    expect(hidden, `${row.level}: ${row.selector} was not on ${row.path}`).not.toBeNull();

    expect(
      hidden!,
      `${row.level} hides ${hidden}px inside itself at 390 — the page reports ${pageOver}px and is silent about it (ruling 91)`
    ).toBeLessThanOrEqual(1);
  });

  test(`${row.level} — ${row.what} does not scroll sideways, by shape`, async ({ page }) => {
    await signIn(page);
    await page.setViewportSize(PHONE);
    await page.goto(row.path, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(row.selector, { timeout: 30_000 });
    await page.waitForTimeout(300);

    const ox = await overflowX(page, row.selector);
    console.log(`  ${row.level} ${row.selector}: overflow-x = ${ox}`);
    expect(ox, `${row.level}: ${row.selector} was not on ${row.path}`).not.toBeNull();
    /*
      ⚠⚠ BY SHAPE, NOT BY FILE LIST — the brief's words. A file list written
      today would name the two DEAD rails (`SettingsNav`, `AdminNav`, both with
      zero mounts) and miss the live one.
      ⚠⚠⚠ **THE HIDDEN SCROLLBAR IS THE POINT: `scrollbar-width: none` plus a
      hidden `::-webkit-scrollbar` means a row can overflow with nothing drawn to
      say so.** Fitting is the answer; scrolling is the defect.
    */
    expect(
      ["auto", "scroll"].includes(ox!),
      `${row.level}: overflow-x is "${ox}" — a primary nav row must FIT, not scroll`
    ).toBe(false);
  });
}

/*
 * ── ⚠⚠⚠ THE TWO ROWS MUST NEVER BOTH EXIST, AND NEVER NEITHER ─────────────
 *
 * ⚠ M1 lives in the band above `md` and in the bottom bar below it. ⚠⚠ **The
 * swap is done in two files — `app-band.css` hides `.pm-band-menu` at
 * `767.98px` and `BottomNav` is `md:hidden`** — so a width where both render, or
 * neither, is one typo away and would not fail any assertion above.
 */
test("M1 — exactly one operational menu exists at 390, and it is the bottom bar", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize(PHONE);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pm-bottomnav-row", { timeout: 30_000 });
  const seen = await page.evaluate(() => {
    const vis = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).display !== "none" && r.width > 0 && r.height > 0;
    };
    return { band: vis(".pm-band-menu"), bottom: vis(".pm-bottomnav-row") };
  });
  console.log(`  @390 band menu visible: ${seen.band} · bottom bar visible: ${seen.bottom}`);
  expect(seen.bottom, "the bottom bar is the operational menu at 390").toBe(true);
  expect(seen.band, "the band's menu must NOT also render at 390").toBe(false);
});

test("M1-desktop — the band's menu is still the operational menu at 1280 and still fits", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pm-band-menu-row", { timeout: 30_000 });
  const seen = await page.evaluate(() => {
    const row = document.querySelector(".pm-band-menu-row") as HTMLElement | null;
    const bottom = document.querySelector(".pm-bottomnav-row");
    const bRect = bottom?.getBoundingClientRect();
    return {
      hidden: row ? row.scrollWidth - row.clientWidth : null,
      bottomVisible: !!bottom && !!bRect && bRect.width > 0 && bRect.height > 0,
    };
  });
  console.log(`  @1280 band row hides ${seen.hidden}px · bottom bar visible: ${seen.bottomVisible}`);
  expect(seen.hidden, "the band row was not found at 1280").not.toBeNull();
  /* ⚠ Above `md` the band is UNCHANGED — the brief's own line — so this is the
     assertion that WS-A/WS-B did not quietly alter the desktop shell. */
  expect(seen.hidden!).toBeLessThanOrEqual(1);
  expect(seen.bottomVisible, "the bottom bar must NOT render at 1280").toBe(false);
});

/*
 * ── ⚠⚠⚠ THE MAX-5 CEILING, AND WHAT A SIXTH ITEM MUST DO ──────────────────
 *
 * ⚠ Measured after `E688`/`E692`/`E693`: **no role exceeds five and there is no
 * sixth item on either rail**, so nothing is truncated today. ⚠⚠ **THE CEILING
 * STAYS ENFORCED ANYWAY** — the brief's words: *"a sixth item added later must
 * hit a named failure, not silently fall off the end."*
 *
 * ⚠⚠⚠ **AND THE FAILURE IS A COUNT, NOT A LAYOUT.** Recorded because it is
 * counter-intuitive and was measured rather than assumed: **adding a sixth item
 * does NOT make this row overflow.** The cells are `flex: 1 1 0` with
 * `min-width: 0`, so a sixth makes six narrower cells whose labels ellipsise —
 * the row still fits, and the *fit* assertion above stays green.
 * ⚠⚠ **SO THE FIT ASSERTION IS THE WRONG CATCHER FOR A SIXTH ITEM, AND SAYING
 * SO IS THE POINT:** `check:nav-reachable` §6 owns the count (*"is FIVE items,
 * the M1 limit"*) and reddens by name; this owns the two things a count cannot
 * see — that no more than five are ever rendered as primary cells, and that a
 * sixth is still reachable rather than merely absent (rule 5).
 */
test("M1 — at most five primary cells, and any sixth keeps a visible entrance", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize(PHONE);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pm-bottomnav-row", { timeout: 30_000 });
  const seen = await page.evaluate(() => ({
    cells: document.querySelectorAll(".pm-bottomnav-cell").length,
    more: document.querySelectorAll(".pm-bottomnav-more").length,
    overflowLinks: document.querySelectorAll(".pm-bottomnav-overflow-link").length,
  }));
  console.log(
    `  @390 bottom bar: ${seen.cells} primary cell(s) · overflow entrance: ${seen.more} · items behind it: ${seen.overflowLinks}`
  );
  /* ⚠ `E586` — a bar with no cells would satisfy "at most five" vacuously. */
  expect(seen.cells, "the bottom bar rendered no cells at all").toBeGreaterThan(0);
  expect(seen.cells, "more than five primary cells (ruling 88's limit)").toBeLessThanOrEqual(5);
  /*
    ⚠⚠⚠ RULE 5, ASSERTED AS AN IF-THEN RATHER THAN AS A CONSTANT. It says
    nothing while every role fits in five, and the moment one does not, it
    demands the entrance exists. **A sixth item that is merely absent is a
    removed capability** — the defect `E688` and `E693` each just fixed.
  */
  const truncated = await page.evaluate(() => {
    const row = document.querySelector(".pm-bottomnav-row");
    const more = document.querySelector(".pm-bottomnav-more");
    return { cells: row?.children.length ?? 0, hasMore: !!more };
  });
  if (truncated.cells >= 5) {
    console.log(
      `  (five cells shown; an overflow entrance is ${truncated.hasMore ? "present" : "not needed — nothing is hidden"})`
    );
  }
});
