import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:company-match: same website domain / email domain / tax ID = same company.
let A: CoFixture | null = null;
let B: CoFixture | null = null;
let aName = "";
const tag = `cm${Date.now()}`;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  A = await createCompanyFixture();
  B = await createCompanyFixture();
  // Legacy-style values (no normalized columns) — the match must normalize them on the fly.
  const a = await db().company.update({
    where: { id: A.companyId },
    data: { website: `https://www.match-${tag}.example/about`, tin: "98-7654321", website_domain: null, tin_digits: null },
    select: { name: true, email_domain: true },
  });
  aName = a.name;
});
test.afterAll(async () => {
  await dropCompanyFixture(B);
  await dropCompanyFixture(A);
});

const patch = (page: import("@playwright/test").Page, data: Record<string, unknown>) => page.request.patch("/api/company", { data });

test("API: domain, www/https, tax ID punctuation, email domain, no match", async ({ page }) => {
  await signIn(page, B!.people.admin.email);
  for (const website of [`match-${tag}.example`, `https://WWW.Match-${tag}.example/`, `www.match-${tag}.example`]) {
    const r = await patch(page, { website });
    expect(r.status(), website).toBe(409);
    expect((await r.json()).match).toEqual({ kind: "website", name: aName });
  }
  const t = await patch(page, { ein: "987-654-321" });
  expect(t.status()).toBe(409);
  const body = await t.text();
  expect(JSON.parse(body).match).toEqual({ kind: "tin", name: null });
  expect(body.includes(aName), "a tax-ID match never names the company").toBe(false);
  const aEmail = (await db().company.findUniqueOrThrow({ where: { id: A!.companyId }, select: { email_domain: true } })).email_domain!;
  const e = await patch(page, { website: aEmail });
  expect(e.status(), "email-domain match").toBe(409);
  const ok = await patch(page, { website: `https://www.unique-${tag}.example` });
  expect(ok.status()).toBe(200);
  const saved = await db().company.findUniqueOrThrow({ where: { id: B!.companyId }, select: { website: true, website_domain: true } });
  expect(saved).toEqual({ website: `unique-${tag}.example`, website_domain: `unique-${tag}.example` });
});

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
  test(`UI: Ask to Join and This Isn't Us @${vp.width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await signIn(page, B!.people.admin.email);
    const before = await db().company.findUniqueOrThrow({ where: { id: B!.companyId }, select: { name: true, website: true } });
    // Tax-ID match → no name shown; Ask to Join → pending request to A, B unchanged.
    await page.goto("/company/legal?edit=legal", { waitUntil: "networkidle" });
    let ed = page.locator("[data-details-editor]");
    await ed.locator('input[name="ein"]').fill("98 765 4321");
    await ed.getByRole("button", { name: "Save" }).click();
    const box = ed.locator('[data-company-match="tin"]');
    await expect(box).toContainText("This tax ID is already registered");
    await expect(box).not.toContainText(aName);
    await page.screenshot({ path: `e2e-r1/.artifacts/company-match-tin-${vp.width}.png`, fullPage: true });
    await box.getByRole("button", { name: "Ask to Join" }).click();
    await expect(ed.locator("[data-join-sent]")).toBeVisible({ timeout: 15_000 });
    const req = await db().companyMembership.findFirst({ where: { person_id: B!.people.admin.personId, company_id: A!.companyId }, select: { status: true } });
    expect(req?.status).toBe("PENDING");
    expect(await db().company.findUniqueOrThrow({ where: { id: B!.companyId }, select: { name: true, website: true } })).toEqual(before);
    await db().companyMembership.deleteMany({ where: { person_id: B!.people.admin.personId, company_id: A!.companyId } });
    // Website match → names the company; This Isn't Us saves and flags.
    await page.goto("/company?edit=details", { waitUntil: "networkidle" });
    ed = page.locator("[data-details-editor]");
    await ed.locator('input[name="website"]').fill(`www.match-${tag}.example`);
    await ed.getByRole("button", { name: "Save" }).click();
    const wbox = ed.locator('[data-company-match="website"]');
    await expect(wbox).toContainText(`${aName} is already on Panameer`);
    await wbox.getByRole("button", { name: "This Isn't Us" }).click();
    await expect(page.locator("[data-details-editor]")).toHaveCount(0, { timeout: 15_000 });
    const flagged = await db().company.findUniqueOrThrow({ where: { id: B!.companyId }, select: { duplicate_note: true, website_domain: true } });
    expect(flagged.duplicate_note).toMatch(/website match/);
    expect(flagged.website_domain).toBe(`match-${tag}.example`);
    await db().company.update({ where: { id: B!.companyId }, data: { website: before.website, website_domain: null, duplicate_note: null, tin: B!.tin, tin_digits: null } });
    await ctx.close();
  });
