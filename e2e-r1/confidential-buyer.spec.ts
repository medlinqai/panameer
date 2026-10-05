import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:confidential-buyer: a confidential request's company name never reaches /explore (HTML, RSC payload,
// meta), signed out or signed in as a non-party. A public request's company still shows.
let pub: CoFixture | null = null;
let conf: CoFixture | null = null;
const tag = `cb${Date.now()}`;
test.beforeAll(async () => {
  pub = await createCompanyFixture();
  conf = await createCompanyFixture();
  for (const [f, vis] of [[pub, "PUBLIC"], [conf, "CONFIDENTIAL"]] as const)
    await db().workRequest.create({
      data: {
        buyer_person_id: f.people.admin.personId, p_account_id: f.pAccountId, title: `${tag} ${vis.toLowerCase()} request`,
        status: "POSTED", posted_at: new Date(), proposal_access: "OPEN", company_visibility: vis, location_country: "United States",
      },
    });
});
test.afterAll(async () => {
  for (const f of [pub, conf]) if (f) await db().workRequest.deleteMany({ where: { buyer_person_id: f.people.admin.personId } });
  await dropCompanyFixture(pub);
  await dropCompanyFixture(conf);
});

const companyName = async (f: CoFixture) => (await db().company.findUniqueOrThrow({ where: { id: f.companyId }, select: { name: true } })).name;

for (const who of ["signed out", "non-party"] as const)
  test(`explore hides a confidential buyer (${who})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    if (who === "non-party") await signIn(page, pub!.people.member.email);
    const res = await page.goto(`/explore?mode=work&q=${tag}`, { waitUntil: "networkidle" });
    const body = await res!.text();
    const secret = await companyName(conf!);
    expect(body.includes(secret), "confidential company in the HTML/RSC payload").toBe(false);
    expect(await page.locator("head").innerHTML()).not.toContain(secret);
    await expect(page.getByText(`${tag} confidential request`)).toBeVisible();
    await expect(page.locator("[data-explore-buyer]").filter({ hasText: "Confidential buyer" })).toHaveCount(1);
    // The public buyer still shows — plain text signed out, a /companies link signed in.
    const open = page.locator("[data-explore-buyer]").filter({ hasText: await companyName(pub!) });
    await expect(open).toHaveCount(1);
    await expect(open.locator("a[data-company-link]")).toHaveCount(who === "signed out" ? 0 : 1);
    await page.screenshot({ path: `e2e-r1/.artifacts/explore-${who.replace(" ", "-")}.png` });
    await ctx.close();
  });
