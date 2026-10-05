import { test, expect } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// My Company page (lanes 2–3): read view per the mockup, admin vs member controls, readiness.
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

for (const scheme of ["light", "dark"] as const)
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
    test(`overview ${vp.width} ${scheme}`, async ({ browser }) => {
      for (const who of ["admin", "member"] as const) {
        const ctx = await browser.newContext({ colorScheme: scheme, viewport: vp });
        const page = await ctx.newPage();
        await signIn(page, f!.people[who].email);
        await page.goto("/company", { waitUntil: "networkidle" });
        await expect(page.locator(`[data-company-page="${who}"]`)).toBeVisible();
        // name, legal name, type, EIN filled → 4 of 10.
        await expect(page.locator("[data-readiness]")).toHaveAttribute("data-readiness", "40");
        await expect(page.getByText("6 things to finish")).toBeVisible();
        for (const id of ["details", "verification"]) await expect(page.locator(`[data-co-section="${id}"]`)).toBeVisible();
        // Lane 2: no Invite button, no user-terms block; company terms live in Verification.
        await expect(page.getByText(/Invite Someone to/)).toHaveCount(0);
        await expect(page.getByText("Your Terms of Service")).toHaveCount(0);
        await expect(page.locator('[data-co-section="verification"] [data-company-terms]')).toBeVisible();
        if (who === "admin") await expect(page.locator('[data-co-section="verification"]').getByRole("button", { name: /Accept/ })).toBeVisible();
        await expect(page.locator('[data-co-section="details"]')).toContainText("12-3456789");
        const edits = page.locator("main").getByRole("link", { name: "Edit", exact: true });
        if (who === "admin") await expect(edits.first()).toBeVisible();
        else await expect(edits).toHaveCount(0);
        await expect(page.getByRole("switch", { name: /company name/ })).toBeEnabled({ enabled: who === "admin" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
        await page.screenshot({ path: `e2e-r1/.artifacts/company-${who}-${vp.width}-${scheme}.png`, fullPage: true });
        await page.goto("/company/people", { waitUntil: "networkidle" });
        await expect(page.locator("[data-member]")).toHaveCount(2);
        if (who === "admin") await expect(page.getByText("Asking to join (1)")).toBeVisible();
        else await expect(page.getByText(/Asking to join/)).toHaveCount(0);
        await ctx.close();
      }
    });

test("admin edits in place, approves, branding + terms", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, f!.people.admin.email);
  await page.goto("/company?edit=details", { waitUntil: "networkidle" });
  const ed = page.locator("[data-details-editor]");
  await expect(ed).toBeVisible();
  await ed.locator('input[name="country"]').fill("United States");
  await ed.locator('input[name="stateOfFiling"]').fill("Delaware");
  await ed.locator('input[name="website"]').fill("example.com");
  await ed.locator('textarea[name="description"]').fill("Throwaway test company for the My Company page.");
  const ind = ed.locator('select[name="industryId"] option').nth(1);
  const hasIndustry = (await ind.count()) > 0;
  if (hasIndustry) await ed.locator('select[name="industryId"]').selectOption(await ind.getAttribute("value"));
  await page.screenshot({ path: "e2e-r1/.artifacts/company-edit-1440.png", fullPage: true });
  await ed.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-details-editor]")).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("[data-readiness]")).toHaveAttribute("data-readiness", hasIndustry ? "90" : "80");
  await expect(page.locator("[data-company-description]")).toHaveText("Throwaway test company for the My Company page.");
  // Edit logo uploads in place (no navigation): a 300×200 PNG comes back square.
  const png = Buffer.from(await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 300; c.height = 200;
    const x = c.getContext("2d")!; x.fillStyle = "#d72cd6"; x.fillRect(0, 0, 300, 200);
    const b: Blob = await new Promise((r) => c.toBlob((v) => r(v!), "image/png"));
    return Array.from(new Uint8Array(await b.arrayBuffer()));
  }));
  await page.locator("[data-logo-input]").first().setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await expect(page.locator('img[alt$="logo"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/company(#details)?$/);
  // People: approve the asker.
  await page.goto("/company/people", { waitUntil: "networkidle" });
  await page.locator("[data-join-request]").getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("[data-member]")).toHaveCount(3, { timeout: 20_000 });
  await page.screenshot({ path: "e2e-r1/.artifacts/company-people-1440.png", fullPage: true });
  await page.goto("/company/branding", { waitUntil: "networkidle" });
  await expect(page.locator('[data-co-section="branding"]')).toBeVisible();
  await page.goto("/company/terms", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/company(#verification)?$/);
  await ctx.close();
  // A member cannot reach the editor, Branding or Terms.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await signIn(mp, f!.people.member.email);
  await mp.goto("/company?edit=details", { waitUntil: "networkidle" });
  await expect(mp.locator("[data-details-editor]")).toHaveCount(0);
  await mp.goto("/company/branding", { waitUntil: "networkidle" });
  await expect(mp).toHaveURL(/\/company$/);
  await m.close();
});
