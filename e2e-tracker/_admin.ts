import { readFileSync } from "fs";
import { join } from "path";
import type { Page } from "@playwright/test";

/** ⚠ The one system admin, read from the seed file rather than hard-coded, so a
 *  renamed account fails loudly here instead of silently testing nothing. */
export function adminAccount(): { email: string; password: string } {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const all = (Object.values(raw).filter(Array.isArray) as { email: string; password: string }[][]).flat();
  const chosen = all.find((u) => u.email?.toLowerCase() === "admin@panameer.com" && u.password);
  if (!chosen) throw new Error("admin@panameer.com is not in prisma/seed-data/test-users.json with a password");
  return { email: chosen.email, password: chosen.password };
}

/** ⚠ The hydration wait is copied from `e2e-shell/_auth.ts` for the reason given
 *  there: an unhydrated React input takes the value and loses it on the first
 *  client render, which posts an empty email and 401s in 5ms. */
export async function signInAs(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 5 });
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
}
