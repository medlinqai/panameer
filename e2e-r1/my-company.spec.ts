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
