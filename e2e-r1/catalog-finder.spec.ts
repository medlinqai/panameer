import { expect, test, type Page } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { db } from "../e2e-shell/_db";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

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

// ── Lane 2: throwaway catalog rows + two providers in a throwaway company. Removes only what it made.

const Z = `Zq${Date.now() % 1_000_000}`;
type Fx = { co: CoFixture; persons: string[]; profiles: string[]; skills: Record<string, string>; specs: Record<string, string> };
let fx: Fx | null = null;

async function makeFx(): Promise<Fx> {
  const prisma = db();
  const dom = await prisma.skill.findFirst({ where: { pillar: { name: "Oracle Fusion Cloud" }, status: "ACTIVE" }, select: { catalog_id: true, role_type_id: true, pillar_id: true } });
  if (!dom) throw new Error("no Fusion domain");
  const co = await createCompanyFixture();
  const out: Fx = { co, persons: [], profiles: [], skills: {}, specs: {} };
  fx = out; // so afterAll cleans up even if setup fails part-way
  for (const who of [co.people.admin, co.people.member]) {
    const pp = await prisma.providerProfile.upsert({ where: { person_id: who.personId }, update: {}, create: { person_id: who.personId, status: "ACTIVE", currency: "USD", work_method: "SERVICES" }, select: { id: true } });
    out.persons.push(who.personId); out.profiles.push(pp.id);
  }
  const mk = async (key: string, name: string, placed: boolean) =>
    (out.skills[key] = (await prisma.skill.create({
      data: { catalog_id: dom.catalog_id, role_type_id: dom.role_type_id, pillar_id: placed ? dom.pillar_id : null, name, origin: placed ? "ADMIN" : "PROVIDER", is_custom: !placed, visible_to_members: !placed ? true : false },
      select: { id: true },
    })).id);
  await mk("T", `Purchasing ${Z}`, true);
  await mk("N1", `Purchase Orders ${Z}`, false);
  await mk("N2", `Widget Calibration ${Z}`, false);
  await mk("N3", `Purchase Order ${Z}`, false);
  const [A, B] = out.profiles;
  for (const [pp, k] of [[A, "T"], [A, "N1"], [B, "N1"], [A, "N2"], [A, "N3"]] as const)
    await prisma.providerSkill.create({ data: { provider_profile_id: pp, skill_id: out.skills[k], source: "SELF_ADDED", weight: 1 } });
  out.specs.ST = (await prisma.specialization.create({ data: { catalog_id: dom.catalog_id, name: `Integration Cloud ${Z}`, status: "ACTIVE", origin: "ADMIN" }, select: { id: true } })).id;
  out.specs.S1 = (await prisma.specialization.create({ data: { catalog_id: dom.catalog_id, name: `Integration Clouds ${Z}`, status: "SUGGESTED", origin: "PROVIDER", is_custom: true }, select: { id: true } })).id;
  await prisma.providerProfileSpecialization.create({ data: { provider_profile_id: A, specialization_id: out.specs.S1 } });
  return out;
}

async function dropFx(f: Fx | null) {
  if (!f) return;
  const prisma = db();
  const ids = [...Object.values(f.skills), ...Object.values(f.specs)];
  await prisma.adminAudit.deleteMany({ where: { target_id: { in: ids } } });
  await prisma.notification.deleteMany({ where: { person_id: { in: f.persons } } });
  await prisma.providerSkill.deleteMany({ where: { provider_profile_id: { in: f.profiles } } });
  await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: { in: f.profiles } } });
  await prisma.skill.deleteMany({ where: { id: { in: Object.values(f.skills) } } });
  await prisma.specialization.deleteMany({ where: { id: { in: Object.values(f.specs) } } });
  await prisma.providerProfile.deleteMany({ where: { id: { in: f.profiles } } });
  await dropCompanyFixture(f.co);
}

test.describe("L2 Compare", () => {
  test.beforeAll(async () => { fx = await makeFx(); });
  test.afterAll(async () => dropFx(fx));

  test("new skill sits in the tree under its likely domain, tinted, with actions", async () => {
    await page.goto(`/admin/skill-catalog?q=${Z}`, { waitUntil: "networkidle" });
    const inline = page.getByTestId("catalog-domain").getByTestId("catalog-new").filter({ hasText: `Purchase Orders ${Z}` });
    await expect(inline).toBeVisible();
    await expect(inline.getByRole("button", { name: /^Merge into Purchasing/ })).toBeVisible();
    await expect(inline.getByRole("button", { name: "Add Here" })).toBeVisible();
  });

  test("one search filters both sides; closest matches highlight; look-alikes grouped", async () => {
    await page.goto(`/admin/skill-catalog?tab=compare&q=${Z}`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-compare-catalog]").getByTestId("catalog-skill")).toHaveCount(1);
    await expect(page.locator("[data-compare-new]").getByTestId("review-item")).toHaveCount(3);
    const grp = page.locator("[data-lookalike-group]");
    await expect(grp).toContainText(`Purchase Orders ${Z}`);
    await expect(grp).toContainText(`Purchase Order ${Z}`);

    await page.getByTestId("review-item").filter({ hasText: `Purchase Orders ${Z}` }).locator("button").first().click();
    const top = page.locator("[data-closest-match]").first();
    await expect(top).toContainText(`Purchasing ${Z}`);
    expect(Number(await top.getAttribute("data-closest-match"))).toBeGreaterThanOrEqual(50);
    await expect(page.locator(`[data-testid="catalog-skill"][data-id="${fx!.skills.T}"]`)).toHaveAttribute("data-closest", /\d+/);
    await page.screenshot({ path: "e2e-r1/.artifacts/catalog-compare-1440.png" });

    await page.setViewportSize({ width: 390, height: 900 });
    const [l, r] = await Promise.all([page.locator("[data-compare-catalog]").boundingBox(), page.locator("[data-compare-new]").boundingBox()]);
    expect(l!.y).toBeLessThan(r!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "e2e-r1/.artifacts/catalog-compare-390.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("Merge moves claims, adds the alias, audits", async () => {
    await page.locator("[data-closest-match]").first().locator("[data-review-merge]").click();
    await expect(page.locator("[data-review-confirm]")).toContainText("2 members' claims move");
    await page.locator("[data-review-confirm-go]").click();
    await expect(page.locator("[data-review-done]")).toContainText("Merged");
    const prisma = db();
    expect(await prisma.providerSkill.count({ where: { skill_id: fx!.skills.T } })).toBe(2);
    expect(await prisma.providerSkill.count({ where: { skill_id: fx!.skills.N1 } })).toBe(0);
    expect((await prisma.skill.findUnique({ where: { id: fx!.skills.T } }))!.aliases).toContain(`Purchase Orders ${Z}`);
    expect((await prisma.skill.findUnique({ where: { id: fx!.skills.N1 } }))!.merged_into_id).toBe(fx!.skills.T);
    expect(await prisma.adminAudit.count({ where: { action: "catalog.skill.merge", target_id: fx!.skills.N1 } })).toBe(1);
  });

  test("Add as New starts Hidden; Reject leaves the member's claim", async () => {
    await page.goto(`/admin/skill-catalog?tab=compare&q=${Z}`, { waitUntil: "networkidle" });
    await page.getByTestId("review-item").filter({ hasText: `Widget Calibration ${Z}` }).locator("button").first().click();
    await page.locator("[data-review-dest]").selectOption({ index: 1 });
    await expect(page.locator("[data-review-confirm]")).toContainText("starts Hidden");
    await page.locator("[data-review-confirm-go]").click();
    await expect(page.locator("[data-review-done]")).toContainText("Added");
    const prisma = db();
    const n2 = await prisma.skill.findUnique({ where: { id: fx!.skills.N2 } });
    expect(n2!.pillar_id).not.toBeNull();
    expect(n2!.visible_to_members).toBe(false);

    await page.getByTestId("review-item").filter({ hasText: `Purchase Order ${Z}` }).locator("button").first().click();
    await page.locator("[data-review-reject]").click();
    await expect(page.locator("[data-review-confirm]")).toContainText("keeps it on their profile");
    await page.locator("[data-review-confirm-go]").click();
    await expect(page.locator("[data-review-done]")).toContainText("Rejected");
    expect((await prisma.skill.findUnique({ where: { id: fx!.skills.N3 } }))!.rejected_at).not.toBeNull();
    expect(await prisma.providerSkill.count({ where: { skill_id: fx!.skills.N3 } })).toBe(1);
    await expect(page.getByTestId("review-item")).toHaveCount(0);
  });

  test("Specializations: merge a suggestion into a live one", async () => {
    await page.locator('[data-sub="specs"]').click();
    await page.getByTestId("review-item").filter({ hasText: `Integration Clouds ${Z}` }).locator("button").first().click();
    await expect(page.locator(`[data-testid="catalog-spec"][data-closest]`).filter({ hasText: `Integration Cloud ${Z}` })).toHaveCount(1);
    await expect(page.locator("[data-closest-match]").first()).toContainText(`Integration Cloud ${Z}`);
    await page.locator("[data-closest-match]").first().locator("[data-review-merge]").click();
    await page.locator("[data-review-confirm-go]").click();
    await expect(page.locator("[data-review-done]")).toContainText("Merged");
    const prisma = db();
    expect(await prisma.providerProfileSpecialization.count({ where: { specialization_id: fx!.specs.ST } })).toBe(1);
    expect((await prisma.specialization.findUnique({ where: { id: fx!.specs.ST } }))!.aliases).toContain(`Integration Clouds ${Z}`);
  });
});
