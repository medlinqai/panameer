import { test, expect } from "@playwright/test";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";
import { POST } from "../src/app/api/account/sign-out/route";

// check:sign-out: first click / Enter / tap signs out, the cookie is gone, /login, Back can't show the app,
// and on panameer.com hosts both the host-only and the .panameer.com session cookies are expired.
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
});
test.afterAll(async () => dropFixture(f));

for (const how of ["mouse", "keyboard", "tap"] as const)
  test(`sign out by ${how}`, async ({ browser }) => {
    const ctx = await browser.newContext(how === "tap" ? { viewport: { width: 390, height: 844 }, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, f!.provider.email);
    await page.goto("/connect/connections", { waitUntil: "networkidle" });
    const menu = page.getByRole("button", { name: "Account menu" });
    if (how === "tap") await menu.last().tap();
    else await menu.first().click();
    const so = page.getByRole("menuitem", { name: "Sign Out" });
    if (how === "tap") await so.tap();
    else if (how === "mouse") await so.click();
    else {
      await so.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    expect((await ctx.cookies()).filter((c) => c.name.includes("session-token"))).toEqual([]);
    await page.goBack().catch(() => {});
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });

test("the route expires host-only and .panameer.com copies on app.panameer.com", async () => {
  const res = await POST(new Request("https://app.panameer.com/api/account/sign-out", { method: "POST", headers: { host: "app.panameer.com" } }));
  const set = res.headers.getSetCookie();
  for (const name of ["__Secure-next-auth.session-token", "next-auth.session-token"]) {
    expect(set.some((c) => c.startsWith(`${name}=;`) && !/Domain=/.test(c)), `${name} host-only`).toBe(true);
    expect(set.some((c) => c.startsWith(`${name}=;`) && /Domain=\.panameer\.com/.test(c)), `${name} .panameer.com`).toBe(true);
  }
  expect(set.every((c) => /Max-Age=0/.test(c))).toBe(true);
  const local = (await POST(new Request("http://localhost:3100/api/account/sign-out", { method: "POST", headers: { host: "localhost:3100" } }))).headers.getSetCookie();
  expect(local.some((c) => /Domain=/.test(c)), "no domain on localhost").toBe(false);
});
