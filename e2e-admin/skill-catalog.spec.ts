import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";

// R-C1: Skill Catalog thin-line tree. Adds and removes its own throwaway skill only.
test("skill catalog: thin-line tree, add → hidden → show, then clean up", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/admin/skill-catalog", { waitUntil: "domcontentloaded" });

  const role = page.getByTestId("catalog-role").first();
  await expect(role).toBeVisible();
  expect(await role.evaluate((e) => getComputedStyle(e).borderRadius)).toBe("0px");
  await expect(page.getByText("(Functional Consultant)")).toBeVisible();
  await page.screenshot({ path: "e2e-admin/.artifacts/skill-catalog-1280.png", fullPage: false });

  const name = `zz e2e skill ${Date.now()}`;
  const domain = page.getByTestId("catalog-domain").first();
  await domain.getByRole("button", { name: "+ Add skill" }).click();
  await domain.getByRole("textbox").fill(name);
  await domain.getByRole("button", { name: "Add", exact: true }).click();

  const row = page.getByTestId("catalog-skill").filter({ hasText: name });
  try {
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("HIDDEN")).toBeVisible();
    await expect(row.getByText("ADDED")).toBeVisible();
    await row.getByRole("button", { name: "Show" }).click();
    await expect(row.getByText("HIDDEN")).toHaveCount(0, { timeout: 20_000 });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: "e2e-admin/.artifacts/skill-catalog-390.png", fullPage: false });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(390);
  } finally {
    const id = await row.getAttribute("data-id").catch(() => null);
    if (id) {
      const r = await page.request.post("/api/admin/catalog", { data: { action: "delete", table: "skill", id } });
      expect((await r.json()).ok).toBe(true);
    }
  }
});
