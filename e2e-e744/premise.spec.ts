import { test } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/**
 * ⚠ `P2-A1.1` SUPER RUN 4, PHASE 1 — MEASUREMENT ONLY. Changes nothing.
 * ⚠⚠ "Before" shots for lane 2 item 8, plus the two facts the brief asks about:
 * the tab strip's background and whether any gauge label wraps.
 */
for (const w of [1280, 768, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`usage BEFORE — ${w} ${theme}`, async ({ browser }) => {
      const page = await browser.newPage({
        viewport: { width: w, height: 1600 },
        colorScheme: theme,
      });
      await signIn(page);
      await page.goto("/usage", { waitUntil: "networkidle" });
      await page.waitForTimeout(700);

      const m = await page.evaluate(() => {
        const bg = (el: Element | null) =>
          el ? getComputedStyle(el).backgroundColor : null;
        const tabs = document.querySelector('[data-testid="page-tabs"]');
        /* ⚠ The strip itself is transparent; walk up for the painted ancestor. */
        let painted: Element | null = tabs;
        let paintedBg = "rgba(0, 0, 0, 0)";
        while (painted && paintedBg === "rgba(0, 0, 0, 0)") {
          paintedBg = getComputedStyle(painted).backgroundColor;
          if (paintedBg === "rgba(0, 0, 0, 0)") painted = painted.parentElement;
        }
        /* ⚠ Does any gauge label wrap? Compare line count to 1. */
        const labels = [...document.querySelectorAll(".pm-gauge, [data-gauge]")].flatMap((g) =>
          [...g.querySelectorAll("span,div,p")]
            .filter((e) => e.children.length === 0 && (e.textContent ?? "").trim().length > 2)
            .map((e) => {
              const r = e.getBoundingClientRect();
              const lh = parseFloat(getComputedStyle(e).lineHeight) || 16;
              return { t: (e.textContent ?? "").trim().slice(0, 30), lines: Math.round(r.height / lh) };
            })
        );
        const wrapped = labels.filter((l) => l.lines > 1).map((l) => l.t);
        return {
          tabsBg: bg(tabs),
          paintedAncestorBg: paintedBg,
          paintedAncestorCls: String(painted?.className ?? "").slice(0, 60),
          gauges: document.querySelectorAll(".pm-gauge, [data-gauge]").length,
          wrappedLabels: [...new Set(wrapped)].slice(0, 10),
          hasConfirmExperience: document.body.innerText.toLowerCase().includes("confirm your experience"),
          hasServiceProducts: document.body.innerText.toLowerCase().includes("service products"),
          hasTeaching: document.body.innerText.toLowerCase().includes("teaching"),
          hasFooterLine: document.body.innerText.toLowerCase().includes("something look wrong"),
        };
      });
      console.log(`USAGE ${w} ${theme}: ${JSON.stringify(m)}`);
      await page.screenshot({ path: `e2e-e744/shots/usage-before-${w}-${theme}.png`, fullPage: true });
      await page.close();
    });
  }
}
