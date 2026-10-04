import { test } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
/** ⚠ `P2-A1.1-E745` lane 2 — the new format, measured and shot. */
for (const w of [1280, 768, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`usage AFTER — ${w} ${theme}`, async ({ browser }) => {
      const page = await browser.newPage({ viewport: { width: w, height: 1700 }, colorScheme: theme });
      await signIn(page);
      await page.goto("/usage", { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const tabs = document.querySelector('[data-testid="page-tabs"]');
        const g = document.querySelector(".pm-gauge");
        const cs = g ? getComputedStyle(g) : null;
        const labels = [...document.querySelectorAll(".pm-gauge")].flatMap((x) =>
          [...x.querySelectorAll("span,p,div")]
            .filter((e) => e.children.length === 0 && (e.textContent ?? "").trim().length > 2)
            .map((e) => {
              const r = e.getBoundingClientRect();
              const lh = parseFloat(getComputedStyle(e).lineHeight) || 16;
              return { t: (e.textContent ?? "").trim().slice(0, 28), lines: Math.round(r.height / lh) };
            })
        );
        const perRow = (() => {
          const ys = [...document.querySelectorAll(".pm-gauge")].map((x) => Math.round(x.getBoundingClientRect().y));
          const first = ys[0];
          return ys.filter((y) => Math.abs(y - first) < 6).length;
        })();
        return {
          tabsBg: tabs ? getComputedStyle(tabs).backgroundColor : null,
          gaugeBorder: cs?.borderTopWidth + "/" + cs?.borderRightWidth + "/" + cs?.borderBottomWidth,
          gaugeRadius: cs?.borderRadius,
          gaugeBg: cs?.backgroundColor,
          gaugesPerRow: perRow,
          wrapped: [...new Set(labels.filter((l) => l.lines > 1).map((l) => l.t))].slice(0, 8),
        };
      });
      console.log(`A ${w} ${theme}: ${JSON.stringify(m)}`);
      await page.screenshot({ path: `e2e-e744/shots/usage-after-${w}-${theme}.png`, fullPage: true });
      await page.close();
    });
  }
}
