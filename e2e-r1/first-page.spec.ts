import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// First page (E873): every rule row reproduced with a throwaway user, 1440 + 390, light + dark.
const yearsAgo = (n: number) => new Date(Date.now() - n * 365 * 864e5);
type Setup = { rule: number; who: "provider" | "buyer"; title: RegExp; prep: (f: R1Fixture) => Promise<void> };

const publish = async (f: R1Fixture) => {
  await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { onboarding_completed_at: new Date() } });
};
const projects = async (f: R1Fixture, n: number) => {
  const pp = await db().providerProfile.findUniqueOrThrow({ where: { person_id: f.provider.personId }, select: { id: true } });
  for (let i = 0; i < n; i++)
    await db().project.create({ data: { provider_profile_id: pp.id, name: `First-page test ${i}`, client_name: `Client ${i}`, start_date: yearsAgo(6), end_date: yearsAgo(1) } });
};
const colleague = async (f: R1Fixture) => {
  await db().connection.create({ data: { from_user_id: f.provider.userId, to_user_id: f.buyer.userId, kind: "COLLEAGUE", status: "ACCEPTED", responded_at: new Date() } });
};
const requester = async (f: R1Fixture) => {
  await db().requesterProfile.create({ data: { person_id: f.buyer.personId, completed_at: new Date() } });
};

const ROWS: Setup[] = [
  { rule: 1, who: "provider", title: /Finish your profile/, prep: async () => {} },
  { rule: 2, who: "provider", title: /Build your track record in Learn/, prep: publish },
  { rule: 3, who: "provider", title: /Connect with people you've worked with/, prep: async (f) => { await publish(f); await projects(f, 2); } },
  { rule: 4, who: "provider", title: /Find work/, prep: async (f) => { await publish(f); await projects(f, 2); await colleague(f); } },
  { rule: 5, who: "provider", title: /Search talent/, prep: async (f) => { await publish(f); await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { work_method: "RECRUITER" } }); } },
  {
    rule: 6, who: "buyer", title: /\d+ providers? match(es)? your request/,
    prep: async (f) => {
      await requester(f);
      const held = await db().providerSkill.findFirst({ select: { skill_id: true } });
      await db().workRequest.create({
        data: {
          buyer_person_id: f.buyer.personId, p_account_id: f.pAccountId, title: "First-page test request", status: "POSTED",
          posted_at: new Date(), proposal_access: "INVITE_ONLY", ...(held ? { skills: { create: [{ skill_id: held.skill_id }] } } : {}),
        },
      });
    },
  },
  { rule: 7, who: "buyer", title: /Post your first work request \(free\)/, prep: requester },
];

for (const row of ROWS)
  test(`rule ${row.rule}`, async ({ browser }) => {
    const f = await createFixture();
    try {
      await row.prep(f);
      const email = row.who === "provider" ? f.provider.email : f.buyer.email;
      for (const scheme of ["light", "dark"] as const)
        for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
          const ctx = await browser.newContext({ colorScheme: scheme, viewport: vp });
          const page = await ctx.newPage();
          await signIn(page, email);
          await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
          const card = page.getByTestId("next-step");
          await expect(card).toHaveAttribute("data-rule", String(row.rule), { timeout: 30_000 });
          await expect(card.locator("[data-next-title]")).toHaveText(row.title);
          await expect(card.locator("[data-next-why]")).toContainText("Why you landed here first");
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
          await page.screenshot({ path: `e2e-r1/.artifacts/first-rule${row.rule}-${vp.width}-${scheme}.png` });
          await ctx.close();
        }
      // The first visit has passed, so the greeting turns to Welcome back.
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await signIn(page, email);
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("next-step").locator("h1")).toHaveText(/^Welcome back, /, { timeout: 30_000 });
      await ctx.close();
    } finally {
      await db().connection.deleteMany({ where: { from_user_id: f.provider.userId } });
      await db().requesterProfile.deleteMany({ where: { person_id: f.buyer.personId } });
      await dropFixture(f);
    }
  });

test("login lands on /dashboard", async ({ page }) => {
  const f = await createFixture();
  try {
    await signIn(page, f.buyer.email);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  } finally {
    await dropFixture(f);
  }
});
