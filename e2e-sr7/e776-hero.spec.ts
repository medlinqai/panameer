/**
 * ── ⚠⚠⚠ RETIRED BY `P2-ALL-E785`, QUOTED NOT DELETED (`E164`) ───────────────
 *
 * ⚠⚠ **ITS PRECONDITION LEFT THE PAGE.** Every test here measures the hero
 * against a rendered FIGURE — `measure()` finds `.tabular-nums` and overwrites
 * its text with "84" or "100". `E785` made the figure come from the PLAN, and an
 * empty plan renders *"Scope being set"* instead, so there is no figure to find.
 *
 * ⚠⚠⚠ **AND THE IMPORTANT PART: FOUR OF ITS FIVE TESTS HAD ALREADY STARTED
 * PASSING VACUOUSLY.** The `one line at {w}` cases assert only `lines === 1`,
 * which is true of the sentence as well — so they went green while measuring
 * nothing the rule was about. Only the RELATIONSHIP test failed, and it failed
 * because `three.column < two.column` compared a column that both runs had
 * measured identically. ⚠ A gate that cannot see the thing it names is not
 * guarding it (`decisions_2026-09-23.md` §9), and one that passes with its
 * subject absent is `E586`'s family.
 *
 * ⚠⚠ **THE RULE IS NOT DROPPED — IT MOVED TO WHERE ITS PRECONDITION CAN BE
 * CREATED:** `e2e-plan/hero.spec.ts`, which owns plan state and seeds a row
 * tagged to R1 so a real figure renders. ⚠ Same assertions, including the
 * 52px ceiling and the column relationship.
 *
 * ⚠ The body below is the whole original file, as LINE comments — a nested block
 * comment would end this one early (load-bearing rule 12).
 */

// import { test, expect } from "@playwright/test";
// 
// /**
//  * ── ⚠⚠ THE HERO HEADLINE HOLDS ONE LINE (`P2-ALL-E776`) ────────────────────
//  *
//  * ⚠⚠⚠ **THE COLUMN DOES NOT GROW WITH THE VIEWPORT, AND THAT IS THE FINDING.**
//  * Measured before the fix: the copy column is **686px at 1280, at 1440 and at
//  * 1600** — the hero grid is capped at `max-w-[1040px]`, as all three containers
//  * on the page are. ⚠ A viewport-based `clamp()` would have changed nothing above
//  * ~1080px, which is where the brief expected the room to come from. The headline
//  * is sized against the COLUMN instead.
//  */
// test.describe("P2-ALL-E776 — the hero headline", () => {
//   /** ⚠ Reads the rendered line count, the font size and the column width. */
//   async function measure(page: import("@playwright/test").Page, figure: string) {
//     return page.evaluate((v) => {
//       const fig = document.querySelector("h1")?.closest("section")?.querySelector(".tabular-nums");
//       if (fig) fig.textContent = v;
//       const el = document.querySelector("h1")!;
//       const b = el.getBoundingClientRect();
//       const cs = getComputedStyle(el);
//       const lh = parseFloat(cs.lineHeight) || b.height;
//       return {
//         lines: Math.round(b.height / lh),
//         fontSize: Math.round(parseFloat(cs.fontSize)),
//         column: Math.round((el.parentElement as HTMLElement).getBoundingClientRect().width),
//       };
//     }, figure);
//   }
// 
//   /**
//    * ⚠⚠⚠ THE BRIEF'S ACCEPTANCE CRITERION, AND THE HARD ONE: a THREE-DIGIT figure
//    * at 1280. That is the narrowest the column ever gets (558px) while still being
//    * a two-column hero.
//    */
//   for (const w of [1024, 1280, 1440, 1600]) {
//     test(`⚠⚠ one line at ${w}, with a two- and a three-digit figure`, async ({ page }) => {
//       await page.setViewportSize({ width: w, height: 1000 });
//       await page.goto("/status", { waitUntil: "domcontentloaded" });
//       for (const figure of ["84", "100"]) {
//         const m = await measure(page, figure);
//         console.log(`  ${w}px "${figure}" -> ${m.lines} line(s), ${m.fontSize}px, column ${m.column}px`);
//         expect(m.lines, `"${figure}" at ${w} wraps`).toBe(1);
//       }
//     });
//   }
// 
//   /**
//    * ⚠⚠ THE TYPE SCALES WITH THE COLUMN — asserted as a RELATIONSHIP, not as two
//    * magic numbers, so it survives a copy change. A three-digit figure takes room
//    * from the column, so the headline must be strictly smaller there.
//    */
//   test("⚠⚠ a wider column gets bigger type, and 52px is the ceiling", async ({ page }) => {
//     await page.setViewportSize({ width: 1440, height: 1000 });
//     await page.goto("/status", { waitUntil: "domcontentloaded" });
//     const two = await measure(page, "84");
//     await page.goto("/status", { waitUntil: "domcontentloaded" });
//     const three = await measure(page, "100");
//     expect(three.column, "a 3-digit figure narrows the column").toBeLessThan(two.column);
//     expect(three.fontSize, "and the headline steps down with it").toBeLessThan(two.fontSize);
//     expect(two.fontSize, "52px is the ceiling, never exceeded").toBeLessThanOrEqual(52);
//   });
// 
//   /** ⚠ Phone: one column, the floor applies, and wrapping there is correct. */
//   test("⚠ phone still fits its width", async ({ page }) => {
//     await page.setViewportSize({ width: 390, height: 900 });
//     await page.goto("/status", { waitUntil: "domcontentloaded" });
//     const o = await page.evaluate(() => ({
//       s: document.documentElement.scrollWidth,
//       c: document.documentElement.clientWidth,
//     }));
//     expect(o.s).toBeLessThanOrEqual(o.c);
//   });
// });
