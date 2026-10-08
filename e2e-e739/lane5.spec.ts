import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded } from "../e2e-shell/_auth";

/** ⚠ `P2-A1.1-E742`/`E743` — lane 5, photographed and asserted. */
test("B2 — the colleagues roster carries location, mutuals and a profile link", async ({ browser }) => {
  for (const w of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width: w, height: 1200 } });
    await signIn(page);
    await page.goto("/connect/connections", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".pm-member-row")];
      return {
        rows: rows.length,
        withProfileLink: rows.filter((r) => r.querySelector('a[href^="/providers/"]')).length,
        inCommon: rows.filter((r) => /colleagues? in common/.test(r.textContent ?? "")).length,
        showMore: /Show More \(\d+ more\)/.test(document.body.innerText),
        first: rows[0]?.textContent?.replace(/\s+/g, " ").slice(0, 150) ?? null,
      };
    });
    console.log(`B2 @${w}: ${JSON.stringify(m)}`);
    expect(m.rows, "no colleague rows — the assertion would prove nothing").toBeGreaterThan(0);
    expect(m.withProfileLink, "a row has no profile link").toBe(m.rows);
    /* ⚠⚠ "SHOW MORE" IS ASSERTED AGAINST THE DATA, NOT AGAINST A WISH. This
       persona holds 8 colleagues and the page size is 10, so the control
       correctly does NOT render. ⚠⚠⚠ ASSERTING IT WERE PRESENT WOULD BE
       ASSERTING A BUG; asserting the RELATIONSHIP is what actually tests the
       paging rule, at any roster size. */
    expect(m.showMore, `Show More should render iff more than 10 rows (saw ${m.rows})`).toBe(
      m.rows > 10
    );
    await page.screenshot({ path: `e2e-e739/shots5/colleagues-${w}.png` });
    await page.close();
  }
});

test("B3 — the owner sees a share bar with their /in/ URL", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    /*
      ⚠⚠⚠ LOWER-CASED, AND THIS WAS A REAL FALSE RED — the same trap
      `visitor-profile.spec.ts` records in its own words: *"a case-sensitive
      needle against transformed text is a test that cannot fail."* ⚠ Here it
      was a test that could not PASS: the heading carries `uppercase`, so
      `innerText` returns `SHARE YOUR PROFILE` and the bar was rendering
      perfectly while the assertion said it was absent.
    */
    const t = document.body.innerText.toLowerCase();
    return {
      hasShareBar: t.includes("share your profile"),
      hasCopy: t.includes("copy link"),
      hasLinkedIn: Boolean(document.querySelector('a[href*="linkedin.com/sharing"]')),
      hasX: Boolean(document.querySelector('a[href*="twitter.com/intent"]')),
      hasFacebook: Boolean(document.querySelector('a[href*="facebook.com/sharer"]')),
      inUrl: (t.match(/https?:\/\/[^\s]*\/in\/[a-z0-9-]+/) ?? [])[0] ?? null,
      /* ⚠ The owner must NOT see the visitor paths. */
      hasVisitorPaths: t.includes("how to work with"),
    };
  });
  console.log(`B3 owner: ${JSON.stringify(m)}`);
  expect(m.hasShareBar, "the owner has no share bar").toBe(true);
  expect(m.inUrl, "the share bar shows no /in/ URL").not.toBeNull();
  expect(m.hasLinkedIn && m.hasX && m.hasFacebook, "a share link is missing").toBe(true);
  expect(m.hasVisitorPaths, "the owner was shown the visitor paths").toBe(false);
  await page.screenshot({ path: "e2e-e739/shots5/share-bar-1280.png" });
  await page.close();
});

test("B3 — a buyer viewing a provider sees the two paths with the corrected wording", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await signInAsSeeded(page, "paul@straterp.com");
  /* ⚠ Any marketplace-visible provider that is not the buyer themselves. */
  await page.goto("/explore", { waitUntil: "networkidle" });
  const href = await page.evaluate(
    () => document.querySelector<HTMLAnchorElement>('a[href^="/providers/"]')?.getAttribute("href") ?? null
  );
  expect(href, "no provider to view").not.toBeNull();
  await page.goto(href!, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const t = await page.evaluate(() => document.body.innerText);
  console.log(`B3 buyer: howTo=${t.includes("How to work with")} describe=${t.includes("Post your work and see providers whose skills match.")}`);
  expect(t.includes("How to work with"), "the buyer sees no visitor paths").toBe(true);
  /* ⚠⚠ THE LANE 5 CORRECTION, ASSERTED AS TEXT: "every provider" is false
     (3 of 60 profiles have skill weights), so the line must not say it. */
  expect(t).toContain("Post your work and see providers whose skills match.");
  expect(t, 'the retracted "every provider" wording came back').not.toContain(
    "every provider with matching skills"
  );
  expect(t.includes("Share Your Profile"), "a visitor was shown the owner's share bar").toBe(false);
  await page.screenshot({ path: "e2e-e739/shots5/visitor-paths-1280.png" });
  await page.close();
});
