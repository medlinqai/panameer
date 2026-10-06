import { test, expect, type Browser } from "@playwright/test";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:dynamic-branding: members of the company see its theme, others don't; unreadable combos refused; reset restores.
let f: CoFixture | null = null;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

const themeOf = async (browser: Browser, email: string, scheme: "light" | "dark" = "light", w = 1440) => {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, email);
  await page.goto("/company", { waitUntil: "networkidle" });
  const r = await page.evaluate(() => {
    const el = document.querySelector("[data-brand-theme]") as HTMLElement | null;
    return el ? { mode: el.dataset.brandTheme, rail: el.style.getPropertyValue("--color-rail"), brand: el.style.getPropertyValue("--color-magenta") } : null;
  });
  return { r, page, ctx };
};

test("admin saves a readable theme; members see it, non-members don't", async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await a.newPage();
  await signIn(ap, f!.people.admin.email);
  // Unreadable: mid-gray carries neither white nor dark text at 4.5:1.
  const bad = await ap.request.put("/api/company/theme", { data: { brandHue: "#777777", recipeId: "ink" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toMatch(/Not readable/);
  // Non-admins can't save at all.
  const m = await browser.newContext();
  const mp = await m.newPage();
  await signIn(mp, f!.people.member.email);
  expect((await mp.request.put("/api/company/theme", { data: { brandHue: "#0f766e", recipeId: "color" } })).status()).toBe(403);
  await m.close();
  // UI: the gray is shown as unreadable and Save is disabled; a teal saves.
  await ap.goto("/company/branding", { waitUntil: "networkidle" });
  await ap.locator('input[name="hex"]').fill("#777777");
  await expect(ap.locator("[data-contrast] [data-ok=false]").first()).toBeVisible();
  await expect(ap.getByRole("button", { name: "Save Theme" })).toBeDisabled();
  await ap.locator('input[name="hex"]').fill("#0f766e");
  await ap.locator('[data-look="color"]').click();
  await expect(ap.getByRole("button", { name: "Save Theme" })).toBeEnabled();
  await ap.getByRole("button", { name: "Save Theme" }).click();
  await expect(ap.locator("[data-theme-msg]")).toContainText("Saved");
  await ap.screenshot({ path: "e2e-r1/.artifacts/branding-1440.png", fullPage: true });
  await a.close();

  for (const who of ["admin", "member"] as const) {
    const { r, ctx } = await themeOf(browser, f!.people[who].email);
    expect(r, `${who} sees the theme`).not.toBeNull();
    expect(r!.brand).toBe("#0f766e");
    expect(r!.mode).toBe("dark");
    await ctx.close();
  }
  // The loner shares the company row but has no membership — no theme.
  const lone = await themeOf(browser, f!.people.loner.email);
  expect(lone.r, "non-member sees Panameer's default").toBeNull();
  await lone.ctx.close();
});

test("light rail turns band text ink; reset restores the default", async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await a.newPage();
  await signIn(ap, f!.people.admin.email);
  expect((await ap.request.put("/api/company/theme", { data: { brandHue: "#0f766e", recipeId: "light" } })).status()).toBe(200);
  for (const [scheme, w] of [["light", 1440], ["dark", 390]] as const) {
    const { r, page, ctx } = await themeOf(browser, f!.people.member.email, scheme, w);
    expect(r!.mode).toBe("light");
    const color = await page.locator(".pm-band-console").first().evaluate((e) => getComputedStyle(e).color).catch(() => null);
    if (color) expect(color).not.toBe("rgba(255, 255, 255, 0.45)");
    await page.screenshot({ path: `e2e-r1/.artifacts/branding-light-rail-${w}-${scheme}.png` });
    await ctx.close();
  }
  await ap.goto("/company/branding", { waitUntil: "networkidle" });
  await ap.getByRole("button", { name: "Reset to Panameer Default" }).click();
  await expect(ap.locator("[data-theme-msg]")).toContainText("Panameer default");
  await a.close();
  const after = await themeOf(browser, f!.people.member.email);
  expect(after.r, "reset restores the default").toBeNull();
  await after.ctx.close();
});
