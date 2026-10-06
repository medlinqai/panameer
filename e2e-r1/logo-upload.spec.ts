import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// Logo upload in one step (company-match lane 0): pick → uploaded as-is; Crop to Square optional; Undo restores.
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));
const logoUrl = async () => (await db().company.findUniqueOrThrow({ where: { id: f!.companyId }, select: { logo_url: true } })).logo_url;
const ratio = (p: Page) => p.locator("[data-logo-img]").first().evaluate((i) => (i as HTMLImageElement).naturalWidth / (i as HTMLImageElement).naturalHeight);

for (const [path, vp] of [["/company", { width: 1440, height: 900 }], ["/company/branding", { width: 390, height: 844 }]] as const)
  test(`one-step upload on ${path} @${vp.width}`, async ({ browser }) => {
    await db().company.update({ where: { id: f!.companyId }, data: { logo_url: null } });
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await signIn(page, f!.people.admin.email);
    await page.goto(path, { waitUntil: "networkidle" });
    const wide = await sharp({ create: { width: 400, height: 100, channels: 3, background: "#1d4ed8" } }).png().toBuffer();
    // Pick → uploaded, no second click.
    await page.locator("[data-logo-input]").first().setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: wide });
    await expect(page.locator("[data-logo-done]")).toContainText("Logo updated", { timeout: 30_000 });
    const first = await logoUrl();
    expect(first).toBeTruthy();
    await expect.poll(() => ratio(page), { timeout: 15_000 }).toBeCloseTo(4, 1);
    await page.screenshot({ path: `e2e-r1/.artifacts/logo-upload${path.replace(/\//g, "_")}-${vp.width}.png` });
    // Crop to Square → square.
    await page.locator("[data-logo-done]").getByRole("button", { name: "Crop to Square" }).click();
    await expect(page.locator("[data-logo-done]")).toContainText("Cropped to square", { timeout: 30_000 });
    await expect.poll(() => ratio(page), { timeout: 15_000 }).toBeCloseTo(1, 1);
    // Undo → back to the logo before this upload (none).
    await page.locator("[data-logo-done]").getByRole("button", { name: "Undo" }).click();
    await expect.poll(logoUrl, { timeout: 15_000 }).toBeNull();
    await ctx.close();
  });

test("undo refuses another company's file", async ({ page }) => {
  await signIn(page, f!.people.admin.email);
  const r = await page.request.put("/api/company/logo", { data: { companyId: f!.companyId, logoUrl: "https://x.supabase.co/storage/v1/object/public/company-logos/someone-else/a.png" } });
  expect(r.status()).toBe(400);
});
