import { expect, test, type Page } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";

// check:catalog-finder. Lane 1 reads the live catalog only; lanes 2–3 write throwaway rows only.
test.describe.configure({ mode: "serial" });
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
});
test.afterAll(async () => page.close());

test("L1 search + domain prune the tree, auto-expand, count, URL round-trip", async () => {
  await page.goto("/admin/skill-catalog", { waitUntil: "networkidle" });
  const total = Number((await page.locator("[data-finder-count]").innerText()).match(/of (\d+)/)![1]);
  expect(total).toBeGreaterThan(500);

  await page.locator("[data-finder-domain]").selectOption({ label: "Oracle Fusion Cloud" });
  const domId = await page.locator("[data-finder-domain]").inputValue();
  await page.locator("[data-finder-search]").fill("procure");

  const skills = page.getByTestId("catalog-skill");
  await expect(skills.first()).toBeVisible();
  const n = await skills.count();
  for (let i = 0; i < n; i++) expect((await skills.nth(i).innerText()).toLowerCase()).toContain("procure");
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.locator("[data-finder-count]")).toContainText(`${n} of ${total} skills`);

  const doms = page.getByTestId("catalog-domain");
  for (let i = 0; i < (await doms.count()); i++) {
    await expect(doms.nth(i)).toHaveAttribute("data-domain-id", domId);
    await expect(doms.nth(i).locator("button[aria-expanded]")).toHaveAttribute("aria-expanded", "true");
  }
  await expect(page.locator("[data-node-count]").filter({ hasText: "match" }).first()).toBeVisible();
  await expect(page.locator("[data-no-match]").first()).toBeVisible();
  await expect(page.locator("[data-finder-crumbs]")).toContainText("Oracle Fusion Cloud");
  await expect(page.locator("[data-finder-crumbs]")).toContainText("procure");

  await expect(page).toHaveURL(/q=procure/);
  await expect(page).toHaveURL(new RegExp(`domain=${domId}`));
  await page.screenshot({ path: "e2e-r1/.artifacts/catalog-finder-1440.png" });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("[data-finder-search]")).toHaveValue("procure");
  await expect(page.getByTestId("catalog-skill")).toHaveCount(n);

  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "e2e-r1/.artifacts/catalog-finder-390.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.locator("[data-finder-clear]").click();
  await expect(page).not.toHaveURL(/q=|domain=/);
  await expect(page.locator("[data-finder-count]")).toContainText(`${total} of ${total} skills`);
});

test("L1 status New shows only member skills; Export CSV downloads what's shown", async () => {
  await page.goto("/admin/skill-catalog?status=new", { waitUntil: "networkidle" });
  await expect(page.getByTestId("catalog-skill")).toHaveCount(0);
  const nNew = await page.getByTestId("catalog-new").count();
  expect(nNew).toBeGreaterThan(0);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("[data-finder-export]").click()]);
  const csv = await (await dl.createReadStream()).toArray().then((b) => Buffer.concat(b).toString());
  expect(csv.trim().split("\n")).toHaveLength(nNew + 1);
});
