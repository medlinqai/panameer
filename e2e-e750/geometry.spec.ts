import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** `E751` — what exactly sits between the top band and the tab strip, and how wide
 * the strip is against the viewport. Read-only; prints geometry. */
test("E751 geometry — the gap above the strip, and the gutters", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/profile");
  const strip = page.getByTestId("page-tabs").first();
  await strip.waitFor({ state: "visible", timeout: 30_000 });

  const geo = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="page-tabs"]') as HTMLElement;
    const wrap = s.parentElement as HTMLElement;
    const out: Record<string, unknown> = {};
    out.viewport = { w: window.innerWidth, scrollbar: window.innerWidth - document.documentElement.clientWidth };
    out.strip = s.getBoundingClientRect().toJSON();
    out.wrapper = { ...wrap.getBoundingClientRect().toJSON(), cls: wrap.className };
    // walk up from the wrapper, printing each ancestor box + its padding, to see
    // which element creates the 28px gutter and what sits above.
    const chain: unknown[] = [];
    let el: HTMLElement | null = wrap;
    for (let i = 0; i < 7 && el; i++) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      chain.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className.toString().slice(0, 70),
        x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y),
        padL: cs.paddingLeft, padT: cs.paddingTop, bg: cs.backgroundColor,
      });
      el = el.parentElement;
    }
    out.ancestors = chain;
    // the nearest thing rendered ABOVE the wrapper, inside the same parent
    const prev = wrap.previousElementSibling as HTMLElement | null;
    out.prevSibling = prev
      ? { tag: prev.tagName.toLowerCase(), cls: prev.className.toString().slice(0, 70), rect: prev.getBoundingClientRect().toJSON() }
      : null;
    return out;
  });
  console.log("\n===== E751 GEOMETRY =====\n" + JSON.stringify(geo, null, 2) + "\n");
  await page.screenshot({ path: "e2e-e750/shots/profile-before-1280-light.png", clip: { x: 0, y: 0, width: 1280, height: 420 } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  await strip.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: "e2e-e750/shots/profile-before-390-light.png", clip: { x: 0, y: 0, width: 390, height: 460 } });
  expect(true).toBe(true);
});
