import { test, expect } from "@playwright/test";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Run 13 lane 1: the two roles carry their job title where a member picks or reads a role.
let f: R1Fixture | null = null;
test.beforeAll(async () => { f = await createFixture(); });
test.afterAll(async () => { await dropFixture(f); });

test("register roles step shows the long role names", async ({ page }) => {
  await signIn(page, f!.provider.email);
  await page.goto("/join/provider?step=roles");
  await expect(page.getByText("Application-Specific Roles (Functional Consultant)")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Technology-Specific Roles (Technical Consultant)")).toBeVisible();
  await expect(page.getByText("Operations-Specific Roles", { exact: true })).toBeVisible();
});
