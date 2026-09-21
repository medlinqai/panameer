import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";
import { requireCompleteProvider } from "./_persona";

/**
 * ── ⚠⚠ THE PHONE SCROLL HEIGHT, AS A NUMBER (`P2-J3-E593` WS-B) ───────────
 *
 * ⚠⚠⚠ SCOTT'S OWN WORRY, AND THE BRIEF CALLS IT THE REAL RISK: *"So much on
 * here, I am a little afraid I put so much the mobile version might look heavy
 * — tough to find a balance there."*
 * ⚠ WS-B adds an Account Health card, a side Rates card and an edit affordance
 * on every centre card — and on a phone they all land in ONE column.
 * ⚠⚠ THE RULE: if phone scroll height grows by more than HALF, STOP AND REPORT
 * rather than shipping it. So the BEFORE is measured on the trunk, first.
 */
/**
 * ── ⚠⚠⚠ THE PRECONDITION. IT RUNS FIRST AND IT FAILS LOUDLY (`P0-E595` WS-B) ─
 *
 * ⚠ SCOTT, 2026-09-21: *"The gate must fail loudly if that persona isn't a
 * complete provider. A gate that passes on nothing isn't a gate (E586)."*
 *
 * ⚠⚠ `E586` IS `check:resume` REPORTING `0 passed, 0 failed, 16 skipped` WITH
 * EXIT CODE 0 because its fixtures did not exist, and it was quoted as green in
 * gate tables for weeks. ⚠⚠⚠ THE SAME HOLE OPENED HERE THE MOMENT THE `E595`
 * RESET EMPTIED THE SEED: the account every spec signs in as lost its provider
 * profile, and several assertions in this suite are ABSENCE checks — *"no rate
 * reaches the visitor"* — which a blank page satisfies perfectly.
 * ⚠ So the suite would have gone greener, not redder, on no data at all.
 *
 * ⚠ It asserts the persona as a BUYER sees them: on `/talent`, which only lists
 * providers who pass every clause of `providerMeetsRequired`.
 */
test("⚠⚠⚠ PRECONDITION — the gate persona is a complete, visible provider", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signIn(page);
  const href = await requireCompleteProvider(page);
  console.log(`E595/WS-B  gate persona OK — ${href}`);
  await page.close();
});

for (const [label, path] of [
  ["/connect (owner)", "/connect"],
  ["/community", "/community"],
  /*
    ⚠⚠ THE VISITOR PAGE IS MEASURED TOO (`E593` WS-C). It renders the SAME
    component as the owner's, so its height is the other half of the same
    question — and `visitor` is resolved from a real colleague card rather than
    a hardcoded id, which rots.
  */
  ["/providers/[id] (visitor)", "__visitor__"],
] as const) {
  test(`height ${label}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(page);
    let target = path as string;
    if (target === "__visitor__") {
      await page.goto("/community", { waitUntil: "networkidle" });
      const href = await page.locator(".pm-cm-card .pm-cm-open").first().getAttribute("href");
      expect(href, "no colleague card links to a profile").toBeTruthy();
      target = href!;
    }
    await page.goto(target, { waitUntil: "networkidle" });
    const m = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
      /* ⚠ `section.rounded-brand` IS WHAT A CARD ACTUALLY IS on these two
         pages. ⚠⚠ THE FIRST VERSION GUESSED `.pm-cp-card`, WHICH DOES NOT
         EXIST, and printed "0 cards" on a page full of them — a number that
         was wrong rather than absent, beside a scrollHeight that was right. */
      cards: document.querySelectorAll("section.rounded-brand, .pm-cm-card, .pm-cm-panel").length,
    }));
    console.log(
      `E593/HEIGHT  ${label.padEnd(18)} 390px → scrollHeight ${m.scroll}px ` +
        `(${(m.scroll / m.viewport).toFixed(1)} screens, ${m.cards} cards)`
    );
    await page.screenshot({
      path: `e2e-shell/.artifacts/e593-phone-${label.replace(/[^a-z]/gi, "") || "x"}.png`,
      fullPage: false,
    });
    await page.close();
  });
}
