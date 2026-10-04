import { test, expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db } from "../e2e-shell/_db";

// R-E006/R-E001: the Register review looks like My Profile. Throwaway user only.
const EMAIL = "run10.review@example.seed";
const PASSWORD = "Panameer123";

async function teardown() {
  const prisma = db();
  const u = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, person: { select: { id: true } } } });
  if (u?.person) await prisma.person.delete({ where: { id: u.person.id } });
  if (u) await prisma.user.delete({ where: { id: u.id } });
}

async function persona() {
  await teardown();
  const prisma = db();
  const host = await prisma.person.findFirst({
    where: { company_id: { not: undefined } },
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  if (!host) throw new Error("no Person to borrow a company/site from");
  const user = await prisma.user.create({
    data: { email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 10), email_verified: new Date(), first_name: "Review", last_name: "Walk" },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: { user_id: user.id, first_name: "Review", last_name: "Walk", is_service_provider: true, company_id: host.company_id, site_id: host.site_id, title: "Oracle Procurement Consultant" },
    select: { id: true },
  });
  await prisma.providerProfile.create({ data: { person_id: person.id, status: "ACTIVE", currency: "USD", work_method: "SERVICES", onsite_rate_cents: 15000, remote_rate_cents: 12000 } });
}

async function signIn(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1200);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 }).catch(() => {});
}

test.afterAll(teardown);

test("register review: thin-line sections, square ink buttons", async ({ page }) => {
  await persona();
  await signIn(page);
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/join/provider?step=finish", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Looking good/)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `e2e-run10/.artifacts/register-review-${w}.png`, fullPage: true });
    const sec = page.locator("details.pm-clean-sec").first();
    await expect(sec).toBeVisible();
    const pills = await page.locator("button.rounded-full.bg-magenta").count();
    expect(pills).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  }
});
