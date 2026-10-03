import { test, expect } from "@playwright/test";
import { assignRows, MIN_GAP_PCT } from "../src/components/status/BuildLine";

/**
 * ── ⚠⚠ THE BUILD LINE'S LABELS NEVER COLLIDE (`P2-ALL-E777`) ───────────────
 *
 * ⚠⚠⚠ **WHAT SCOTT SAW IS CROWDING, NOT OVERLAP, AND THE DIFFERENCE IS WORTH
 * STATING.** Measured at 1440: the three markers occupy 232–307, 393–452 and
 * 1158–1208 — gaps of **86px and 706px, and ZERO overlaps**. `E769`'s shared
 * marker had already removed the collision. Three labels sit inside the leftmost
 * 220px of a 976px axis because that is where the dates are; the axis is
 * date-proportional and honest.
 *
 * ⚠⚠ **SO THE MECHANISM DOES NOT FIRE ON TODAY'S DATA, AND THE UNIT TEST IS WHAT
 * MAKES THIS GATE MEAN ANYTHING.** A test that only read the rendered page would
 * assert "one row" forever and never exercise the rule it exists to guard.
 */
test.describe("P2-ALL-E777 — Build Line labels", () => {
  test("⚠⚠⚠ the rule staggers close markers and leaves distant ones alone", () => {
    /* ⚠ Today's live positions: 0%, ~18%, ~95% — nothing crowds. */
    expect(assignRows([0, 18, 95]), "today's dates need no stagger").toEqual([0, 0, 0]);
    /* ⚠ Two phases a few days apart on a long axis — the case this exists for. */
    expect(assignRows([0, 4, 60]), "a close pair drops to the second row").toEqual([0, 1, 0]);
    /* ⚠ Three in a row: the third is clear of row 0's last (0) by 10 < 12, and of
       row 1's last (4) by 6 < 12 — it falls back to row 0, which is the documented
       greedy behaviour rather than an invented third row. */
    expect(assignRows([0, 4, 10])).toEqual([0, 1, 0]);
    /* ⚠ Exactly at the threshold counts as clear. */
    expect(assignRows([0, MIN_GAP_PCT])).toEqual([0, 0]);
    expect(assignRows([0, MIN_GAP_PCT - 0.1])).toEqual([0, 1]);
  });


  /*
    ── ⚠⚠ THE DOM TESTS ARE RETIRED BY `P2-ALL-E785` (`E164`) ────────────────

    ⚠ They measured the Build Line's phase labels on `/status`. `E785` replaced
    that section with the plan's own timeline, so `BuildLine` renders on no page
    — the component and its exports are untouched on disk.
    ⚠⚠ **THE UNIT TEST ABOVE IS DELIBERATELY KEPT AND STILL PASSES.** It is pure
    (`assignRows` over numbers), it encodes the actual RULE, and ruling 14 says
    that when the code a rule names goes away, the rule may not.
    ⚠⚠⚠ **AND THE RULE IS GUARDED ON THE NEW SURFACE TOO** — the plan timeline
    thins its week ticks, and `e2e-plan/status.spec.ts` asserts those labels do
    not overlap. Same rule, new geometry.

    ⚠⚠⚠ **THE QUOTED BODY'S OWN INNER COMMENT DELIMITERS ARE PARAPHRASED, NOT
    COPIED** — `/**` reads `NOTE:` and the closing pair is dropped. ⚠ Copying
    them verbatim ended this comment early and broke the parse, which is the
    trap load-bearing rule 12 names and the reason it says to paraphrase an
    inner comment rather than quote it.
    //     NOTE: ⚠⚠ And on the real page: no two labels on the same row may overlap. 
    //     for (const w of [1440, 1280, 1024]) {
    //       test(`⚠⚠ nothing overlaps at ${w}`, async ({ page }) => {
    //         await page.setViewportSize({ width: w, height: 1000 });
    //         await page.goto("/status", { waitUntil: "domcontentloaded" });
    //         const r = await page.evaluate(() => {
    //           const sec = document.querySelector('section[aria-label="Build line"]')!;
    //           const axis = [...sec.querySelectorAll(":scope > div.relative")].find((d) =>
    //             d.className.includes("mt-3"),
    //           );
    //           if (!axis) return null;
    //           const spans = [...axis.querySelectorAll(":scope > span")].map((s) => {
    //             const b = s.getBoundingClientRect();
    //             return { t: (s.textContent || "").trim().slice(0, 20), l: b.left, r: b.right, y: Math.round(b.top) };
    //           });
    //           const over: string[] = [];
    //           for (let i = 0; i < spans.length; i++)
    //             for (let j = i + 1; j < spans.length; j++)
    //               if (Math.abs(spans[i].y - spans[j].y) < 6 && spans[i].l < spans[j].r && spans[j].l < spans[i].r)
    //                 over.push(`${spans[i].t} ↔ ${spans[j].t}`);
    //           return { over, rows: new Set(spans.map((s) => s.y)).size, n: spans.length };
    //         });
    //         expect(r, "the label row exists").not.toBeNull();
    //         console.log(`  ${w}px — ${r!.n} labels on ${r!.rows} row(s), ${r!.over.length} overlaps`);
    //         expect(r!.over, `labels overlap at ${w}`).toEqual([]);
    //       });
    //     }
    //   
    //     NOTE: ⚠ Phone keeps the stacked list (Scott's ruling), not the axis. 
    //     test("⚠ phone keeps the stacked list", async ({ page }) => {
    //       await page.setViewportSize({ width: 390, height: 900 });
    //       await page.goto("/status", { waitUntil: "domcontentloaded" });
    //       const li = await page.locator('section[aria-label="Build line"] li').count();
    //       expect(li, "the phone list renders one row per marker").toBeGreaterThan(0);
    //       const axisVisible = await page
    //         .locator('section[aria-label="Build line"] div.relative.mt-3')
    //         .isVisible()
    //         .catch(() => false);
    //       expect(axisVisible, "the positioned axis is hidden on phone").toBe(false);
    //     });
  */
});
