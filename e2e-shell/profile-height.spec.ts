import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";

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
