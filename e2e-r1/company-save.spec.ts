import { test, expect } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:company-save: each invalid field shows its own message under the field; a valid form saves.
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
  test(`field errors and a valid save @${vp.width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await signIn(page, f!.people.admin.email);
    const cases: [string, string, RegExp][] = [
      ["name", "S", /company name/],
      ["website", "not a website", /website like/],
      ["ein", "12", /tax ID/],
    ];
    for (const [field, value, msg] of cases) {
      await page.goto("/company?edit=details", { waitUntil: "networkidle" });
      const ed = page.locator("[data-details-editor]");
      await ed.locator(`input[name="${field}"]`).fill(value);
      await ed.getByRole("button", { name: "Save" }).click();
      const err = ed.locator(`[data-field-error="${field}"]`);
      await expect(err, field).toHaveText(msg, { timeout: 15_000 });
      await expect(ed.locator(`input[name="${field}"]`), "entries kept").toHaveValue(value);
      await expect(ed.locator("[data-field-error]")).toHaveCount(1);
    }
    await page.screenshot({ path: `e2e-r1/.artifacts/company-save-error-${vp.width}.png`, fullPage: true });
    // A valid form saves (Scott's values, with a valid website).
    await page.goto("/company?edit=details", { waitUntil: "networkidle" });
    const ed = page.locator("[data-details-editor]");
    await ed.locator('input[name="name"]').fill(`Save Test ${vp.width}`);
    await ed.locator('input[name="website"]').fill(`www.save-test-${vp.width}-${Date.now()}.example`);
    await ed.locator('input[name="country"]').fill("United States");
    await ed.locator('input[name="stateOfFiling"]').fill("FL");
    await ed.locator('input[name="ein"]').fill("");
    await ed.getByRole("button", { name: "Save" }).click();
    await expect(ed).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Save Test ${vp.width}`);
    await ctx.close();
  });
