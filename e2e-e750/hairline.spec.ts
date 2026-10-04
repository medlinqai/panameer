import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
/** `E751` — is the strip's `border-b border-line` actually rendering, and did it
 * render before the band? Read-only diagnostic. */
test("E751 hairline diagnostic", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/profile");
  const strip = page.getByTestId("page-tabs").first();
  await strip.waitFor({ state: "visible" });
  const info = await strip.evaluate((el) => {
    const cs = getComputedStyle(el);
    const root = getComputedStyle(document.documentElement);
    return {
      borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
      boxSizing: cs.boxSizing,
      rect: el.getBoundingClientRect().toJSON(),
      tokenLine: root.getPropertyValue("--line") || root.getPropertyValue("--color-line") || "(not a root var)",
      cls: el.className,
    };
  });
  console.log("\n===== E751 HAIRLINE =====\n" + JSON.stringify(info, null, 2) + "\n");
  expect(true).toBe(true);
});
