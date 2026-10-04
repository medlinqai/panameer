import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/**
 * `P2-A1.1-E750` / `E751` premise measurement. READ-ONLY — nothing is asserted
 * as a pass/fail here; every number is printed so the premise can be confirmed
 * by measurement rather than by reading (the brief's own instruction).
 */

const PAGES = ["/profile", "/usage", "/community"];

/** Effective background at a viewport point: walk up until a non-transparent bg. */
const PROBE = `(x, y) => {
  let el = document.elementFromPoint(x, y);
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return { color: bg, tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 60) };
    }
    el = el.parentElement;
  }
  return { color: "NONE", tag: "-", cls: "-" };
}`;

for (const scheme of ["light", "dark"] as const) {
  test(`E751 premise — computed backgrounds, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);

    const lines: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      const strip = page.getByTestId("page-tabs").first();
      await strip.waitFor({ state: "visible", timeout: 30_000 });
      const box = (await strip.boundingBox())!;

      // The band is the strip's PARENT (the `relative` wrapper) and whatever is
      // behind it. Probe: 6px above the strip's top; 6px left of its left edge;
      // 4px inside its right edge (where the fade paints).
      const above = await page.evaluate(
        ([fn, x, y]) => (eval(fn as string) as (a: number, b: number) => unknown)(x as number, y as number),
        [PROBE, Math.round(box.x + box.width / 2), Math.round(box.y - 6)] as const,
      );
      const left = await page.evaluate(
        ([fn, x, y]) => (eval(fn as string) as (a: number, b: number) => unknown)(x as number, y as number),
        [PROBE, Math.max(1, Math.round(box.x - 6)), Math.round(box.y + box.height / 2)] as const,
      );
      const right = await page.evaluate(
        ([fn, x, y]) => (eval(fn as string) as (a: number, b: number) => unknown)(x as number, y as number),
        [PROBE, Math.round(box.x + box.width - 4), Math.round(box.y + box.height / 2)] as const,
      );

      const stripBg = await strip.evaluate((el) => getComputedStyle(el).backgroundColor);
      const wrapper = await strip.evaluate((el) => {
        const p = el.parentElement!;
        return { bg: getComputedStyle(p).backgroundColor, cls: p.className.toString().slice(0, 50) };
      });
      const fade = await page.evaluate(() => {
        const f = document.querySelector('[data-testid="page-tabs"]')?.parentElement
          ?.querySelector("div[aria-hidden].pointer-events-none");
        return f ? getComputedStyle(f).backgroundImage.slice(0, 110) : "NOT FOUND";
      });

      lines.push(
        `\n── ${path} (${scheme})` +
          `\n   strip box      : x=${Math.round(box.x)} w=${Math.round(box.width)} y=${Math.round(box.y)} h=${Math.round(box.height)}` +
          `\n   strip own bg   : ${stripBg}` +
          `\n   wrapper bg     : ${(wrapper as { bg: string }).bg}   [${(wrapper as { cls: string }).cls}]` +
          `\n   ABOVE strip    : ${JSON.stringify(above)}` +
          `\n   LEFT gutter    : ${JSON.stringify(left)}` +
          `\n   RIGHT end      : ${JSON.stringify(right)}` +
          `\n   fade gradient  : ${fade}`,
      );
    }
    console.log(`\n===== E751 PREMISE (${scheme}) =====${lines.join("")}\n`);
    expect(lines.length).toBe(PAGES.length);
  });
}

test("E750 premise — the live lead line on /profile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/profile");
  const hits = await page.evaluate(() =>
    Array.from(document.querySelectorAll("p, span, div"))
      .map((e) => (e.textContent || "").trim())
      .filter((t) => t.includes("Search Score, free") && t.length < 200),
  );
  console.log(`\n===== E750 PREMISE =====\nrendered claim strings: ${JSON.stringify([...new Set(hits)], null, 2)}\n`);
  expect(hits.length).toBeGreaterThan(0);
});
