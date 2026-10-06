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

// B-E002: a StratERP-like wordmark (navy text + thin light-blue bars on white, 5:1) yields both colors.
const near = (a: string, b: string, tol = 34) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Math.hypot(...p(a).map((v, i) => v - p(b)[i])) < tol;
};
const strateLike = () =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200">
    <rect width="1000" height="200" fill="#ffffff"/>
    <text x="40" y="120" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="110" fill="#1c2d40">StratERP</text>
    <rect x="40" y="148" width="560" height="9" fill="#8fb8de"/>
    <rect x="620" y="148" width="300" height="9" fill="#8fb8de"/>
    <text x="40" y="186" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#1c2d40">MORE CAPABILITY, LESS ADMINISTRATION</text>
  </svg>`);

test("B-E002 palette finds navy and light blue on a wide white logo", async ({ page }) => {
  await signIn(page, f!.people.admin.email);
  const scan = async (buf: Buffer, name: string, type: string) =>
    (await (await page.request.post("/api/company/theme", { multipart: { file: { name, mimeType: type, buffer: buf } } })).json()).palette as string[];
  const wide = await scan(strateLike(), "strat.svg", "image/svg+xml");
  expect(wide.some((c) => near(c, "#1c2d40")), `navy in ${wide}`).toBe(true);
  expect(wide.some((c) => near(c, "#8fb8de")), `light blue in ${wide}`).toBe(true);
  expect(wide.length, `no specks: ${wide}`).toBeLessThanOrEqual(3);
  // The 3-color block logo still gives exactly 3.
  const sharp = (await import("sharp")).default;
  const block = (c: string, w: number) => sharp({ create: { width: w, height: 120, channels: 3, background: c } }).png().toBuffer();
  const three = await sharp({ create: { width: 640, height: 200, channels: 3, background: "#ffffff" } })
    .composite([{ input: await block("#0f766e", 300), left: 20, top: 40 }, { input: await block("#d72cd6", 180), left: 330, top: 40 }, { input: await block("#f59e0b", 100), left: 520, top: 40 }])
    .png()
    .toBuffer();
  expect(await scan(three, "three.png", "image/png")).toHaveLength(3);
});
