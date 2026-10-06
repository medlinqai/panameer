import { test, expect, type Page } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:branding — the Branding tab agrees with itself and with the console.
let f: CoFixture | null = null;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

const colorsOnPage = (p: Page) =>
  p.evaluate(() => ({
    swatches: [...document.querySelectorAll("[data-brand-color]")].map((e) => e.getAttribute("data-brand-color")),
    hex: (document.querySelector('input[name="hex"]') as HTMLInputElement).value.toLowerCase(),
    preview: getComputedStyle([...document.querySelectorAll("[data-theme-preview] span")].find((e) => e.textContent === "Primary Action")!).backgroundColor,
  }));
const rgb = (h: string) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ")})`;

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
  test(`B-E001 one brand color @${vp.width}`, async ({ browser }) => {
    // Marelise's state: a saved color but no saved look.
    await db().company.update({ where: { id: f!.companyId }, data: { brand_hue: "#1c2d40", theme_recipe: null, logo_palette: ["#1c2d40", "#8fb8de"] } });
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await signIn(page, f!.people.admin.email);
    await page.goto("/company/branding", { waitUntil: "networkidle" });
    let c = await colorsOnPage(page);
    expect(new Set(c.swatches)).toEqual(new Set(["#1c2d40"]));
    expect(c.hex).toBe("#1c2d40");
    expect(c.preview).toBe(rgb("#1c2d40"));
    // Change once (click a logo color) → every place shows it.
    await page.locator('[data-swatch="#8fb8de"]').click();
    c = await colorsOnPage(page);
    expect(new Set(c.swatches)).toEqual(new Set(["#8fb8de"]));
    expect(c.hex).toBe("#8fb8de");
    await expect(page.locator('[data-swatch="#8fb8de"]')).toHaveAttribute("data-in-use", "true");
    await expect(page.locator("[data-unsaved]")).toBeVisible();
    await page.screenshot({ path: `e2e-r1/.artifacts/branding-one-color-${vp.width}.png`, fullPage: true });
    await ctx.close();
  });
