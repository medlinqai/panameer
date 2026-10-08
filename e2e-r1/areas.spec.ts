import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// Account areas (my-company lane 1): avatar menu, tab rows, old URLs, Connect actions.
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

const menuRows = async (page: Page) => {
  await page.getByRole("button", { name: "Account menu" }).first().click();
  const items = page.getByRole("menu").getByRole("menuitem");
  await expect(items.first()).toBeVisible();
  return (await items.allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
};
const tabs = async (page: Page) =>
  (await page.getByTestId("page-tabs").first().locator("a").allTextContents()).map((t) => t.trim());

for (const w of [1440, 390])
  test(`areas @${w}`, async ({ browser }) => {
    for (const who of ["admin", "member", "loner"] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await signIn(page, f!.people[who].email);
      await page.goto("/profile", { waitUntil: "networkidle" });
      await expect(page.getByTestId("page-tabs").first()).toContainText("PROFILE");
      const rows = await menuRows(page);
      const want = who === "loner" ? ["Profile", "Account", "Support"] : ["Profile", "Company", "Account", "Support"];
      for (const r of want) expect(rows.some((x) => x === r), `${who} menu has ${r}: ${rows.join(" | ")}`).toBe(true);
      if (who === "loner") expect(rows.some((x) => x === "Company")).toBe(false);
      expect(rows.some((x) => /Invite a Colleague|Request a Recommendation/.test(x))).toBe(false);
      await page.keyboard.press("Escape");

      if (who !== "loner") {
        await page.goto("/company", { waitUntil: "domcontentloaded" });
        expect(await tabs(page)).toEqual(who === "admin" ? ["Overview", "People", "Legal, Tax & Banking 🔒", "Branding"] : ["Overview", "People"]);
        await expect(page.getByTestId("page-tabs").first()).toContainText("COMPANY");
        await page.goto("/company/terms", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/company\/legal(#legal-tax)?$/);
        await page.goto("/company/teams", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/company\/people$/);
      }
      await page.goto("/settings", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/settings\/notifications$/);
      expect(await tabs(page)).toEqual(["Notifications", "Security", "Membership", "Payouts", "Tax", "Preferences"]);
      await page.goto("/settings/identity", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("page-tabs").first().locator('[aria-current="page"]')).toHaveText("Security");
      await page.goto("/support/tickets", { waitUntil: "domcontentloaded" });
      expect(await tabs(page)).toEqual(["Tickets", "Report a Problem", "Help"]);
      await page.goto("/connect/connections", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: "Request a Recommendation" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Invite a Colleague" }).first()).toBeVisible();
      await page.screenshot({ path: `e2e-r1/.artifacts/areas-${who}-${w}.png` });
      await ctx.close();
    }
  });
