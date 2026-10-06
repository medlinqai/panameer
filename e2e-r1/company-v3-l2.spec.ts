import { test, expect, type Browser, type Page } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";
import { db } from "../e2e-shell/_db";

// Company v3 lane 2: Legal, Tax & Banking — strip, Who Gets Paid, masked tax ID, company payout account. Throwaway company.
const SHOTS = "test-results/company-v3";
let f: CoFixture | null = null;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => { f = await createCompanyFixture(); });
test.afterAll(async () => dropCompanyFixture(f));

async function as(browser: Browser, who: "admin" | "member", width = 1440): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
  await signIn(page, f!.people[who].email);
  return page;
}
const digits = () => f!.tin.replace(/\D/g, "");

for (const width of [1440, 390])
  test(`Legal page: strip, private note, sole proprietor disabled with 2 members, tax ID masked in HTML @${width}`, async ({ browser }) => {
    const page = await as(browser, "admin", width);
    const res = await page.goto("/company/legal", { waitUntil: "networkidle" });
    expect((await res!.text()).includes(digits())).toBe(false);
    expect(await page.content()).not.toContain(digits());
    await expect(page.locator("[data-private-note]")).toContainText("admins only");
    await expect(page.locator("[data-pay-strip] li")).toHaveCount(3);
    await expect(page.locator('[data-payee="SOLE_PROPRIETOR"]')).toBeDisabled();
    await expect(page.locator('[data-payee="COMPANY"]')).toBeChecked();
    await expect(page.locator("[data-tax-id-masked]")).toHaveText(`•••••${digits().slice(-4)}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `${SHOTS}/l2-legal-${width}.png`, fullPage: true });
    const ed = await page.goto("/company/legal?edit=legal", { waitUntil: "networkidle" });
    expect((await ed!.text()).includes(digits())).toBe(false);
    await page.context().close();
  });

test("Non-admin gets 404; member's Withdrawals says who is paid", async ({ browser }) => {
  const mp = await as(browser, "member");
  expect((await mp.goto("/company/legal"))!.status()).toBe(404);
  await mp.goto("/settings/withdrawals", { waitUntil: "networkidle" });
  await expect(mp.locator('[data-paid-to="member"]')).toContainText(`Your work is paid to ${(await db().company.findUnique({ where: { id: f!.companyId } }))!.name}`);
  await mp.context().close();
});

test("Payout account change notifies and emails every admin", async ({ browser }) => {
  const prisma = db();
  await prisma.companyMembership.updateMany({ where: { company_id: f!.companyId, person_id: f!.people.member.personId }, data: { role: "ADMIN" } });
  const page = await as(browser, "admin");
  await page.goto("/company/legal#payout", { waitUntil: "networkidle" });
  await page.locator("[data-add-payout-open]").click();
  const form = page.locator("[data-add-payout]");
  await form.locator('input[name="label"]').fill("Ops account");
  await form.locator('input[name="last4"]').fill("4321");
  await form.getByRole("button", { name: "Save Payout Account" }).click();
  await expect(page.locator("[data-payout]")).toContainText("ending 4321", { timeout: 20_000 });
  const pm = await prisma.payoutMethod.findFirst({ where: { company_id: f!.companyId } });
  expect(pm?.last4).toBe("4321");
  const admins = [f!.people.admin.personId, f!.people.member.personId];
  await expect
    .poll(async () => prisma.notification.count({ where: { person_id: { in: admins }, event_key: "company.payout_changed" } }), { timeout: 15_000 })
    .toBe(2);
  const rows = await prisma.notification.findMany({ where: { person_id: { in: admins }, event_key: "company.payout_changed" } });
  for (const r of rows) expect(!!r.email_sent_at || r.suppressed_reason === "email_refused", `email attempted for ${r.person_id}: ${r.suppressed_reason}`).toBe(true);
  await page.screenshot({ path: `${SHOTS}/l2-payout-1440.png`, fullPage: true });
  await page.locator("[data-payout]").getByRole("button", { name: "Remove" }).click();
  await page.locator("[data-payout]").getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("[data-payout]")).toHaveCount(0, { timeout: 20_000 });
  expect(await prisma.notification.count({ where: { person_id: { in: admins }, event_key: "company.payout_changed" } })).toBe(4);
  await prisma.companyMembership.updateMany({ where: { company_id: f!.companyId, person_id: f!.people.member.personId }, data: { role: "MEMBER" } });
  await page.context().close();
});

test("One person: allowed when alone; a second member prompts admins, never switches", async ({ browser }) => {
  const prisma = db();
  await prisma.companyMembership.updateMany({ where: { company_id: f!.companyId, person_id: f!.people.member.personId }, data: { status: "REJECTED" } });
  const page = await as(browser, "admin");
  await page.goto("/company/legal", { waitUntil: "networkidle" });
  await page.locator('[data-payee="SOLE_PROPRIETOR"]').check();
  await expect.poll(async () => (await prisma.company.findUnique({ where: { id: f!.companyId } }))!.payee_type).toBe("SOLE_PROPRIETOR");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('[data-co-section="legal-tax"]')).toContainText("SSN or ITIN");
  await page.goto("/company/people", { waitUntil: "networkidle" });
  await page.locator("[data-join-request]").getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("[data-member]")).toHaveCount(2, { timeout: 20_000 });
  expect((await prisma.company.findUnique({ where: { id: f!.companyId } }))!.payee_type).toBe("SOLE_PROPRIETOR");
  expect(await prisma.notification.count({ where: { person_id: f!.people.admin.personId, event_key: "company.payee_switch_needed" } })).toBe(1);
  await page.context().close();
});
