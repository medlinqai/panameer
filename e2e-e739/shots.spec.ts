import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded } from "../e2e-shell/_auth";

/**
 * ── ⚠ `P2-A1.1-E739` — SCOTT'S 2026-10-01 PHONE WALK, PHOTOGRAPHED ─────────
 *
 * ⚠ *"Check the same line on the other four sections at 390 and 1280, light and
 * dark, and send screenshots."*
 * ⚠⚠ **FOUR SECTIONS, NOT FIVE.** Shop's line was never shipped (`E737`: `/shop`
 * is still a `ComingSoon` stub and the rule is *"only lines that are true today
 * ship"*). Stated so the missing fifth is not read as an omission here.
 * ⚠⚠⚠ **HIRE NEEDS A BUYER.** The gate persona is a provider and `/hire`
 * redirects it to `/dashboard?noaccess=1`, so that one section signs in as a
 * seeded buyer — otherwise the shot would photograph a redirect and prove
 * nothing.
 */
const WIDTHS = [
  { name: "390", width: 390, height: 1400 },
  { name: "1280", width: 1280, height: 1100 },
];
const THEMES = ["light", "dark"] as const;

/** ⚠ The one invariant Scott asked for, asserted rather than eyeballed. */
async function assertLeadAligned(page: import("@playwright/test").Page, label: string) {
  const m = await page.evaluate(() => {
    const lead = [...document.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("Free as of")
    );
    if (!lead) return { found: false } as const;
    const r = lead.getBoundingClientRect();
    /*
      ── ⚠⚠⚠ THE TEST IS "NO EXTRA INDENT", AND IT IS MEASURED AGAINST THE
            LINE'S OWN PARENT CONTENT BOX ───────────────────────────────────

      ⚠⚠ **TWO EARLIER VERSIONS OF THIS ASSERTION WERE BOTH WRONG, AND IN
      OPPOSITE DIRECTIONS.** The first compared against `.pm-cp3` or a guessed
      descendant and failed on `/learn`, where it selected a FULL-BLEED element
      at x=0 while nothing was misaligned. The second compared against the
      line's next sibling and reported *"no lead line"* on `/profile`, where the
      wrapper holds the line and nothing else — ⚠⚠⚠ **A MISSING REFERENCE
      REPORTED AS A MISSING LINE, WHICH IS THE WORST KIND OF FALSE PASS: IT
      LOOKED LIKE A PAGE WITHOUT THE FEATURE.**

      ⚠ **SCOTT'S ACTUAL COMPLAINT WAS "INDENTED PAST THE PAGE GUTTER", SO THAT
      IS WHAT IS MEASURED:** the line's left edge against its parent's CONTENT
      box — the parent's border box plus its own left padding. ⚠⚠ Equal means
      the line adds no indent of its own, which holds on every page without this
      assertion needing to know any page's layout.
    */
    const parent = lead.parentElement;
    if (!parent) return { found: true, measured: false } as const;
    const pr = parent.getBoundingClientRect();
    const ps = getComputedStyle(parent);
    const contentLeft = pr.x + parseFloat(ps.paddingLeft || "0");
    return {
      found: true,
      measured: true,
      leadX: +r.x.toFixed(1),
      refX: +contentLeft.toFixed(1),
    } as const;
  });

  /* ⚠⚠ A PAGE THAT SHOULD CARRY THE LINE AND DOES NOT IS A FAILURE, NOT A SKIP
     — otherwise deleting the component would make this suite greener (ruling
     12: an assertion its own mutation cannot fail is not an assertion). */
  expect(m.found, `${label}: the lead line is missing from this page`).toBe(true);
  expect(m.measured, `${label}: the lead line has no parent to measure against`).toBe(true);
  if (!m.measured) return;
  console.log(`  ${label}: lead x=${m.leadX} · content gutter x=${m.refX}`);
  /* ⚠⚠ ONE PIXEL OF TOLERANCE, NOT TEN. The defect was 16px, and a loose
     tolerance would let it come back halfway. */
  expect(
    Math.abs(m.leadX - m.refX),
    `${label}: the lead line is ${Math.abs(m.leadX - m.refX)}px past its own gutter`
  ).toBeLessThanOrEqual(1);
}

for (const theme of THEMES) {
  for (const w of WIDTHS) {
    test(`E739 — lead line, ${w.name}, ${theme}`, async ({ browser }) => {
      const page = await browser.newPage({
        viewport: { width: w.width, height: w.height },
        colorScheme: theme,
      });
      await signIn(page);
      for (const [name, url] of [
        ["profile", "/profile"],
        ["community", "/connect/community"],
        ["learn", "/learn"],
      ] as const) {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        await assertLeadAligned(page, `${name} ${w.name} ${theme}`);
        await page.screenshot({
          path: `e2e-e739/shots/${name}-${w.name}-${theme}.png`,
          fullPage: false,
        });
      }
      await page.close();

      /* ⚠ Hire, as a buyer — see the header note. */
      const buyer = await browser.newPage({
        viewport: { width: w.width, height: w.height },
        colorScheme: theme,
      });
      await signInAsSeeded(buyer, "paul@straterp.com");
      await buyer.goto("/hire", { waitUntil: "networkidle" });
      await buyer.waitForTimeout(400);
      await assertLeadAligned(buyer, `hire ${w.name} ${theme}`);
      await buyer.screenshot({
        path: `e2e-e739/shots/hire-${w.name}-${theme}.png`,
        fullPage: false,
      });
      await buyer.close();
    });
  }
}
