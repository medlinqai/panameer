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
  /*
    ── ⚠⚠⚠ THE OWNER'S PAGE IS `/profile` (`P2-A2-E598` WS-B) ────────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   ["/connect (owner)", "/connect"],
    ⚠⚠ THIS IS THE `E586` FAILURE MODE THAT DOES **NOT** ANNOUNCE ITSELF. The
    profile moved to `/profile` and `/connect` began redirecting to
    `/community` — so this case kept measuring something, kept passing, and
    silently reported COMMUNITY's height under the owner profile's name.
    ⚠⚠⚠ MEASURED: both rows read an identical 3,642px, which is the tell. A
    gate with no inputs fails loudly; a gate pointed at the WRONG inputs does
    not, and that is worse.
    ⚠ Caught because `E598` WS-C's whole target is the owner profile's height,
    and two rows agreeing to the pixel is not a coincidence.
  */
  ["/profile (owner)", "/profile"],
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
      /*
        ── ⚠⚠⚠ CONTENT HEIGHT, NOT PAGE TOTAL (`P2-A2-E598` WS-C ruling) ─────

        ⚠ SCOTT, 2026-09-22: *"change `check:profile-height` to measure profile
        content height, not the page total, since the fixed 1,361px footer makes
        3,500 unreachable. The target is the like-for-like mockup figure
        (~3,435px)."*
        ⚠⚠ MEASURED: the app footer is **1,361px at 390px** and is IDENTICAL on
        both sides of every change — it is shared chrome this brief does not
        touch. Counting it made the page total move for reasons the profile had
        nothing to do with.
        ⚠⚠⚠ THE MOCKUP HAS NO APP SHELL AND NO FOOTER, so its ~3,435px was never
        comparable to a page total. This is what makes the comparison honest.
        ⚠ The shell's own `<main>` is the content region — band, crumb and
        footer all sit outside it — so its height is the number, and it works on
        all three routes rather than only where `.pm-cp2` exists.
      */
      content: Math.round(
        document.querySelector("main")?.getBoundingClientRect().height ??
          document.documentElement.scrollHeight
      ),
      footer: Math.round(
        document.querySelector("footer")?.getBoundingClientRect().height ?? 0
      ),
      viewport: window.innerHeight,
      /* ⚠ `section.rounded-brand` IS WHAT A CARD ACTUALLY IS on these two
         pages. ⚠⚠ THE FIRST VERSION GUESSED `.pm-cp-card`, WHICH DOES NOT
         EXIST, and printed "0 cards" on a page full of them — a number that
         was wrong rather than absent, beside a scrollHeight that was right. */
      cards: document.querySelectorAll("section.rounded-brand, .pm-cm-card, .pm-cm-panel").length,
    }));
    console.log(
      `E593/HEIGHT  ${label.padEnd(24)} 390px → content ${m.content}px ` +
        `(${(m.content / m.viewport).toFixed(1)} screens, ${m.cards} cards) ` +
        `· page ${m.scroll}px incl. ${m.footer}px footer`
    );
    /*
      ── ⚠⚠ THE TARGET, ASSERTED ON THE OWNER'S PROFILE (`E598` WS-C) ────────

      ⚠ SUPERSEDED, quoted not deleted (`E164`) — the brief's own target, and
      why it could never be met as written. Line comments per rule 12:
      //   Target: check:profile-height at or below ~3,500px
      //   (the mockup measures ~3,435px; today is 5,131px)
      //   — measured against document.documentElement.scrollHeight, the PAGE
      //     TOTAL, which carries a fixed 1,361px app footer the mockup has no
      //     equivalent of. 2,658px of profile + 1,361px of footer = 4,019px
      //     before the band and crumb, so 3,500 was unreachable by construction.

      ⚠⚠ ONLY THE OWNER'S PROFILE IS HELD TO IT. `/community` and the visitor
      page are REPORTED, not gated — they are different pages with different
      jobs, and `E593` added them to answer *"is the phone version heavy"*, not
      to pin them to this brief's number.
      ⚠⚠⚠ IT IS A CEILING, NOT AN EQUALITY. A profile with more work history is
      legitimately taller; this fails when the LAYOUT regresses, which is what
      the mockup's figure describes.
    */
    if (label === "/profile (owner)") {
      expect(
        m.content,
        `the owner profile's CONTENT height is ${m.content}px, above the mockup's ~3,435px ` +
          `(page total ${m.scroll}px, of which ${m.footer}px is the shared app footer)`
      ).toBeLessThanOrEqual(3435);
    }
    await page.screenshot({
      path: `e2e-shell/.artifacts/e593-phone-${label.replace(/[^a-z]/gi, "") || "x"}.png`,
      fullPage: false,
    });
    await page.close();
  });
}
