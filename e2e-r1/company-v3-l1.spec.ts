import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";
import { db } from "../e2e-shell/_db";

// Company v3 lane 1: Overview = 4 buyer-facing fields + "before paid" box; People order; legal fields moved. Throwaway company.
const SHOTS = "test-results/company-v3";
let f: CoFixture | null = null;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  f = await createCompanyFixture();
  const prisma = db();
  await prisma.company.update({ where: { id: f.companyId }, data: { legal_name: "Keep Legal LLC", country: "United States" } });
  await prisma.companyMembership.updateMany({ where: { company_id: f.companyId, status: "PENDING" }, data: { matched_on: `website:${f.tag}.example` } });
});
test.afterAll(async () => dropCompanyFixture(f));

async function as(browser: import("@playwright/test").Browser, who: "admin" | "member", width = 1440): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
  await signIn(page, f!.people[who].email);
  return page;
}

for (const width of [1440, 390])
  test(`Overview: 4 fields, nothing private, before-paid box @${width}`, async ({ browser }) => {
    const page = await as(browser, "admin", width);
    await page.goto("/company", { waitUntil: "networkidle" });
    const details = page.locator('[data-co-section="details"]');
    await expect(details.locator("dt")).toHaveText(["Website", "Company name", "Industry", "Description"]);
    const main = await page.locator("main").last().innerText();
    for (const banned of ["EIN", "Legal name", "Business type", "Email domain", "State of filing", f!.tin]) expect(main).not.toContain(banned);
    await expect(page.locator("[data-see-as-buyer]")).toBeVisible();
    await expect(page.locator("[data-pay-box]")).toContainText("2 OF 3 LEFT");
    await expect(page.locator("[data-pay-box] a")).toHaveAttribute("href", "/company/legal");
    await expect(page.locator("[data-join-instead]")).toContainText("Join yours instead");
    await expect(page.getByRole("link", { name: /Legal, Tax & Banking/ }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `${SHOTS}/l1-overview-${width}.png`, fullPage: true });
    await page.context().close();
  });

test("Overview edit form has exactly 4 fields and keeps legal values", async ({ browser }) => {
  const page = await as(browser, "admin");
  await page.goto("/company?edit=details", { waitUntil: "networkidle" });
  const ed = page.locator("[data-details-editor]");
  await expect(ed).toHaveAttribute("data-fields", "website,name,industryId,description");
  await expect(ed.locator("input[name], select[name], textarea[name]")).toHaveCount(4);
  expect(await page.content()).not.toContain(f!.tin);
  await ed.locator('textarea[name="description"]').fill("Throwaway company for the v3 Overview.");
  await ed.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-details-editor]")).toHaveCount(0, { timeout: 20_000 });
  const co = await db().company.findUnique({ where: { id: f!.companyId } });
  expect(co!.description).toBe("Throwaway company for the v3 Overview.");
  expect(co!.tin).toBe(f!.tin);
  expect(co!.legal_name).toBe("Keep Legal LLC");
  expect(co!.email_domain).toBe(`${f!.tag}.example`);
  await page.context().close();
});

for (const width of [1440, 390])
  test(`People: Asking → Members → How People Join; email domain edits here @${width}`, async ({ browser }) => {
    const page = await as(browser, "admin", width);
    await page.goto("/company/people", { waitUntil: "networkidle" });
    const ys = await Promise.all(["asking", "members", "how-people-join"].map(async (id) => (await page.locator(`[data-co-section="${id}"]`).boundingBox())!.y));
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
    await expect(page.locator("[data-join-request] [data-matched]")).toContainText(`${f!.tag}.example`);
    await expect(page.locator('[data-member="MEMBER"] [data-member-actions]')).toContainText("Make Admin");
    await expect(page.locator('[data-member="ADMIN"] [data-member-actions]')).toHaveCount(0);
    await expect(page.locator("[data-email-domain]")).toContainText(`@${f!.tag}.example`);
    await expect(page.locator("[data-edit-email-domain]")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `${SHOTS}/l1-people-${width}.png`, fullPage: true });
    await page.context().close();
  });

test("Legal page: admin edits legal fields, tax ID never in the HTML; member gets 404", async ({ browser }) => {
  const page = await as(browser, "admin");
  await page.goto("/company/legal?edit=legal", { waitUntil: "networkidle" });
  const ed = page.locator("[data-details-editor]");
  await expect(ed).toHaveAttribute("data-fields", "legalName,taxType,country,stateOfFiling,ein");
  await ed.locator('input[name="stateOfFiling"]').fill("FL");
  await ed.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-details-editor]")).toHaveCount(0, { timeout: 20_000 });
  expect(await page.content()).not.toContain(f!.tin.replace(/\D/g, ""));
  await expect(page.locator("[data-tax-id-masked]")).toContainText(f!.tin.replace(/\D/g, "").slice(-4));
  const co = await db().company.findUnique({ where: { id: f!.companyId } });
  expect(co!.state_of_filing).toBe("FL");
  expect(co!.tin).toBe(f!.tin);
  await page.goto("/company", { waitUntil: "networkidle" });
  await expect(page.locator("[data-pay-box]")).toContainText("1 OF 3 LEFT");
  await page.context().close();

  const mp = await as(browser, "member");
  const r = await mp.goto("/company/legal");
  expect(r!.status()).toBe(404);
  await mp.goto("/company", { waitUntil: "networkidle" });
  await expect(mp.locator("[data-pay-box]")).toHaveCount(0);
  await expect(mp.getByRole("link", { name: /Legal, Tax & Banking/ })).toHaveCount(0);
  await mp.context().close();
});

test("Make Admin promotes a member", async ({ browser }) => {
  const page = await as(browser, "admin");
  await page.goto("/company/people", { waitUntil: "networkidle" });
  await page.locator('[data-member="MEMBER"]').getByRole("button", { name: "Make Admin" }).click();
  await expect(page.locator('[data-member="ADMIN"]')).toHaveCount(2, { timeout: 20_000 });
  await page.context().close();
});
