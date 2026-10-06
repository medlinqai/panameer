import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:logo-palette: a 3-color logo yields those 3 swatches; clicking one makes it the brand color and
// updates the preview; contrast marks are right; the palette is saved with the company.
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

const COLORS = ["#0f766e", "#d72cd6", "#f59e0b"];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])) < 24;
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
  test(`palette ${vp.width}`, async ({ browser }) => {
    // Three blocks on a white background (white must be ignored), largest first.
    const block = (c: string, w: number) => sharp({ create: { width: w, height: 120, channels: 3, background: c } }).png().toBuffer();
    const png = await sharp({ create: { width: 640, height: 200, channels: 3, background: "#ffffff" } })
      .composite([
        { input: await block(COLORS[0], 300), left: 20, top: 40 },
        { input: await block(COLORS[1], 180), left: 330, top: 40 },
        { input: await block(COLORS[2], 100), left: 520, top: 40 },
      ])
      .png()
      .toBuffer();
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await signIn(page, f!.people.admin.email);
    await page.goto("/company/branding", { waitUntil: "networkidle" });
    await page.locator("[data-scan-input]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    const sw = page.locator("[data-logo-palette] [data-swatch]");
    await expect(sw).toHaveCount(3, { timeout: 20_000 });
    const got = await sw.evaluateAll((els) => els.map((e) => e.getAttribute("data-swatch")!));
    COLORS.forEach((c, i) => expect(near(got[i], c), `${got[i]} ≈ ${c}`).toBe(true));
    // Contrast marks match the real ratios.
    for (let i = 0; i < 3; i++) {
      const s = sw.nth(i);
      expect(await s.locator("[data-contrast-white]").getAttribute("data-contrast-white")).toBe(String(ratio(got[i], "#ffffff") >= 4.5));
      expect(await s.locator("[data-contrast-ink]").getAttribute("data-contrast-ink")).toBe(String(ratio(got[i], "#1f2937") >= 4.5));
    }
    // Click the second color: it's marked In use, the hex field and the preview's button take it.
    await sw.nth(1).click();
    await expect(sw.nth(1)).toHaveAttribute("data-in-use", "true");
    await expect(sw.nth(1)).toContainText("In use");
    await expect(page.locator('input[name="hex"]')).toHaveValue(got[1]);
    const btnBg = await page.locator("[data-theme-preview] span", { hasText: "Primary Action" }).evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(btnBg).toBe(`rgb(${rgb(got[1]).join(", ")})`);
    // Saved with the company: a reload shows the same swatches.
    const saved = await db().company.findUniqueOrThrow({ where: { id: f!.companyId }, select: { logo_palette: true } });
    expect((saved.logo_palette as string[]).length).toBe(3);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("[data-logo-palette] [data-swatch]")).toHaveCount(3);
    await page.locator("[data-logo-palette]").screenshot({ path: `e2e-r1/.artifacts/logo-palette-${vp.width}.png` });
    await ctx.close();
  });
