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

const CONNECT = ["/connect/community", "/connect/connections", "/connect/mentors", "/connect/community", "/connect/groups", "/invite-colleague"];
test("connect pages: shots", async ({ page }) => {
  await persona();
  await signIn(page);
  for (const path of CONNECT) {
    for (const w of [1280, 390]) {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `e2e-run10/.artifacts/connect${path.replace(/\//g, "_")}-${w}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(w);
    }
  }
});

// R-C3: every figure on Score and Health matches the rows it summarises.
test("score + health: counts reconcile", async ({ page }) => {
  await persona();
  await signIn(page);
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/score", { waitUntil: "domcontentloaded" });
    const kpis = page.getByTestId("score-kpis").locator("b");
    await expect(kpis.first()).toBeVisible({ timeout: 30_000 });
    const [total, completed, todo] = (await kpis.allInnerTexts()).map(Number);
    const doneRows = page.getByTestId("score-lines").locator('[data-line][data-done="true"]');
    const todoRows = page.getByTestId("score-lines").locator('[data-line][data-done="false"]');
    expect(await doneRows.count()).toBe(completed);
    expect(await todoRows.count()).toBe(todo);
    const pts = (await doneRows.locator("[data-points]").allInnerTexts()).map(Number);
    expect(pts.reduce((a, b) => a + b, 0)).toBe(total);
    await page.screenshot({ path: `e2e-run10/.artifacts/score-${w}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);

    await page.goto("/account-health", { waitUntil: "domcontentloaded" });
    const h = page.getByTestId("health-kpis").locator("b");
    await expect(h.first()).toBeVisible({ timeout: 30_000 });
    const [passing, failing] = (await h.allInnerTexts()).slice(0, 2).map(Number);
    expect(await page.getByTestId("health-checks").locator('[data-ok="true"]').count()).toBe(passing);
    expect(await page.getByTestId("health-checks").locator('[data-ok="false"]').count()).toBe(failing);
    await page.screenshot({ path: `e2e-run10/.artifacts/health-${w}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  }
});

// R-E002b: Register asks for exactly two rates and saves both, hourly kept in sync.
test("register rate step: Onsite + Offsite only, both saved", async ({ page }) => {
  await persona();
  const prisma = db();
  const u = await prisma.user.findUnique({ where: { email: EMAIL }, select: { person: { select: { id: true } } } });
  await prisma.providerProfile.updateMany({ where: { person_id: u!.person!.id }, data: { onsite_rate_cents: null, remote_rate_cents: null, hourly_rate_cents: null } });
  await signIn(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/join/provider?step=rate", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Onsite rate", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Offsite rate", { exact: true })).toBeVisible();
  await expect(page.getByText("Hourly Rate", { exact: true })).toHaveCount(0);
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill("150");
  await inputs.nth(1).fill("120");
  await expect(page.getByText("You'll Get")).toHaveCount(2);
  await page.screenshot({ path: "e2e-run10/.artifacts/register-rate-390.png", fullPage: true });
  await page.getByRole("button", { name: /^(Continue|Next)/ }).first().click();
  await expect
    .poll(async () => (await prisma.providerProfile.findFirst({ where: { person_id: u!.person!.id }, select: { onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true } })), { timeout: 20_000 })
    .toEqual({ onsite_rate_cents: 15000, remote_rate_cents: 12000, hourly_rate_cents: 15000 });
});

// R-E016b: on /usage a cell with activity is solid ink with a light figure.
test("usage honeycomb: active cells are dark ink", async ({ page }) => {
  await persona();
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/usage", { waitUntil: "domcontentloaded" });
  const cells = page.locator(".pm-hive-cell[data-level]");
  await expect(cells.first()).toBeVisible({ timeout: 30_000 });
  const styles = await cells.evaluateAll((els) =>
    els.map((e) => ({
      level: e.getAttribute("data-level"),
      bg: getComputedStyle(e, "::before").backgroundColor,
      fig: getComputedStyle(e.querySelector(".pm-hive-figure")!).color,
    })),
  );
  for (const s of styles) {
    if (s.level === "none") expect(s.bg, JSON.stringify(s)).toBe("rgb(255, 255, 255)");
    else {
      expect(s.bg, JSON.stringify(s)).toBe("rgb(39, 35, 52)");
      expect(s.fig, JSON.stringify(s)).toBe("rgb(255, 255, 255)");
    }
  }
  // A fresh account has no activity, so mark one cell active to read the active paint.
  // The hive re-renders on its rebuild timer, so mark and read in one pass, retrying.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const e = document.querySelector(".pm-hive-cell[data-level]");
        if (!e) return null;
        e.setAttribute("data-level", "low");
        return {
          bg: getComputedStyle(e, "::before").backgroundColor,
          fig: getComputedStyle(e.querySelector(".pm-hive-figure")!).color,
        };
      }),
    )
    .toEqual({ bg: "rgb(39, 35, 52)", fig: "rgb(255, 255, 255)" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "e2e-run10/.artifacts/usage-hive-1280.png" });
});

// Free-first lane 4: the Shop lead line.
test("shop: the free lead line is visible", async ({ page }) => {
  await persona();
  await signIn(page);
  for (const w of [1280, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("List the services you sell, free.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Free as of October 2026/)).toBeVisible();
    await page.screenshot({ path: `e2e-run10/.artifacts/shop-${w}.png` });
  }
});
