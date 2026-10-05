import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// check:usage-counts (P-E004): profile section-header counts == /usage All Time counts, for a throwaway provider.
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
  const pp = await db().providerProfile.update({
    where: { person_id: f.provider.personId },
    data: { onboarding_completed_at: new Date() },
    select: { id: true },
  });
  const roles = await db().roleType.findMany({ select: { id: true }, take: 2, orderBy: { name: "asc" } });
  await db().providerProfileRole.create({ data: { provider_profile_id: pp.id, role_type_id: roles[0].id } });
  // Three skills in the member's role plus one outside it: the profile hides the outsider, so must Usage.
  const inRole = await db().skill.findMany({ where: { role_type_id: roles[0].id }, select: { id: true }, take: 3 });
  const outRole = await db().skill.findFirst({ where: { role_type_id: roles[1].id }, select: { id: true } });
  for (const s of [...inRole, ...(outRole ? [outRole] : [])])
    await db().providerSkill.create({ data: { provider_profile_id: pp.id, skill_id: s.id } });
  const specs = await db().specialization.findMany({ select: { id: true }, take: 2 });
  for (const s of specs) await db().providerProfileSpecialization.create({ data: { provider_profile_id: pp.id, specialization_id: s.id } });
  await db().certification.create({ data: { user_id: f.provider.userId, provider_profile_id: pp.id, name: "Usage-counts test cert" } });
});
test.afterAll(async () => dropFixture(f));

for (const w of [1440, 390])
  test(`profile counts == usage all-time @${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, f!.provider.email);
    await page.goto("/profile", { waitUntil: "networkidle" });
    const header = async (id: string) => Number(((await page.locator(`details#${id} [data-count]`).first().textContent()) ?? "").replace(/\D/g, ""));
    const prof = { skills: await header("skills"), specs: await header("specializations"), certs: await header("certifications") };
    expect(prof).toEqual({ skills: 3, specs: 2, certs: 1 });
    await page.goto("/usage", { waitUntil: "networkidle" });
    const act = page.getByTestId("usage-activity");
    await expect(act.locator('[aria-current="true"]')).toHaveText("All Time");
    const val = async (label: string) => Number(await act.locator(`[data-metric="${label}"] b`).textContent());
    expect({ skills: await val("Skills Added"), specs: await val("Specializations"), certs: await val("Certifications") }).toEqual(prof);
    // This Month: everything here was added today, so the same numbers, labelled as added this month.
    await act.getByRole("link", { name: "This Month" }).click();
    await expect(page.getByTestId("usage-activity").locator('[aria-current="true"]')).toHaveText("This Month");
    await expect(page.getByTestId("usage-activity").locator('[data-metric="Skills Added"]')).toContainText("Added this month");
    await expect(page.getByTestId("usage-activity").locator('[data-metric="Search Score"]')).toContainText("Now");
    await page.screenshot({ path: `e2e-r1/.artifacts/usage-counts-${w}.png`, fullPage: true });
    await ctx.close();
  });
