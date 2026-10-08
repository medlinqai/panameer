import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:company-links (lane 5): every rendered company name is a link to /companies/<id>; Visibility hides it.
let f: CoFixture | null = null;
let wrId = "";
test.beforeAll(async () => {
  f = await createCompanyFixture();
  // admin ↔ loner are colleagues, so the loner sees the admin (and the admin's company) on their roster.
  await db().connection.create({ data: { from_user_id: f.people.admin.userId, to_user_id: f.people.loner.userId, kind: "COLLEAGUE", status: "ACCEPTED", responded_at: new Date() } });
  const wr = await db().workRequest.create({
    data: { buyer_person_id: f.people.admin.personId, p_account_id: f.pAccountId, title: "Company-links test request", status: "POSTED", posted_at: new Date(), proposal_access: "OPEN" },
    select: { id: true },
  });
  wrId = wr.id;
});
test.afterAll(async () => {
  if (f) {
    await db().workRequest.deleteMany({ where: { buyer_person_id: f.people.admin.personId } });
    await db().connection.deleteMany({ where: { from_user_id: f.people.admin.userId } });
  }
  await dropCompanyFixture(f);
});

test("no company name renders as plain text in the member surfaces", () => {
  const plain = [
    ["src/components/community/ColleagueRoster.tsx", /\[(r|m)\.title, \1\.company\]\.filter\(Boolean\)\.join/],
    ["src/components/community/MemberRow.tsx", /\[person\.title, person\.company\]\.filter\(Boolean\)\.join/],
    ["src/components/community/ColleagueCards.tsx", />\{c\.company\}</],
    ["src/components/work/WhoIsAsking.tsx", /^\s*\{companyLabel \?\? "—"\}\s*$/m],
    ["src/app/(app)/dashboard/page.tsx", />\s*\{person\.company\.name\}\s*</],
    ["src/components/profile/EmployeeProfile.tsx", /` · \$\{person\.company\.name\}`/],
  ] as const;
  for (const [file, re] of plain) expect(re.test(readFileSync(file, "utf8")), file).toBe(false);
});

for (const w of [1440, 390])
  test(`company names link @${w}`, async ({ browser }) => {
    const href = `/companies/${f!.companyId}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, f!.people.loner.email);
    for (const path of ["/connect/connections", "/connect/community", `/find-work/${wrId}`]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const link = page.locator(`a[data-company-link][href="${href}"]`).first();
      await expect(link, path).toBeVisible();
      await expect(link).toHaveText(/MyCo Test/);
    }
    await page.locator(`a[data-company-link]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('[data-company-page="buyer"]')).toBeVisible();
    // Visibility off → the name leaves member cards.
    await db().company.update({ where: { id: f!.companyId }, data: { show_on_profiles: false } });
    await page.goto("/connect/connections", { waitUntil: "networkidle" });
    await expect(page.getByText(/MyCo Test/)).toHaveCount(0);
    await db().company.update({ where: { id: f!.companyId }, data: { show_on_profiles: true } });
    await ctx.close();
  });
