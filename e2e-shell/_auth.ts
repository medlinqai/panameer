import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠ ONE SIGN-IN, TWO CALLERS (`P2-J3-E567` WS-A) ───────────────────────
 *
 * ⚠ EXTRACTED FROM `app-shell.spec.ts`, WHERE IT WAS A LOCAL FUNCTION. It is
 * shared because `e2e-shell/` now holds a second spec (the Connect walk), and
 * ⚠⚠ A SECOND COPY OF THE SIGN-IN IS THE `teachesPathWhere` MISTAKE APPLIED TO
 * TEST CODE — the one that has already cost twice in `E558`. One definition,
 * imported; never two that drift.
 *
 * ⚠ THE ORIGINAL IS SUPERSEDED-AND-QUOTED AT ITS OLD SITE (`E164`), not deleted.
 *
 * ⚠ THE ACCOUNT IS READ FROM THE SEED FILE, NOT HARDCODED. `test3@panameer.com`
 * is in `prisma/seed-data/test-users.json`, generated from Scott's Users.xlsx —
 * so a password rotation there changes this helper too, instead of breaking the
 * suite a month later for a reason nobody connects.
 *
 * ⚠⚠ MEASURED 2026-09-18 AND RECORDED HERE BECAUSE IT SHAPES WHAT THE SUITES CAN
 * PROVE: `test3@panameer.com` is Michael Star — `is_service_provider: true`,
 * `is_service_coordinator: FALSE`. ⚠ THE SEED HAS NO DUAL-ROLE ACCOUNT, so no
 * browser test here can prove that a person holding BOTH capabilities sees both
 * of Teams' section sets. ⚠ That half is proved STATICALLY instead — see
 * `check:community`'s Teams block. ⚠⚠ DO NOT "FIX" THIS BY ADDING A DUAL-ROLE
 * SEED USER: row counts are quoted by other gates and briefs, including the
 * "10 dual-role" figure itself, and that is a seed decision with its own blast
 * radius.
 */

/**
 * ── ⚠⚠ THE TWO `waitForTimeout` CALLS ARE CARRIED FORWARD DELIBERATELY ─────
 *
 * ⚠ `playwright.config.ts` records that WS-3 FORBIDS `waitForTimeout`: *"A retry
 * turns a real intermittent defect into a green run... the suite has to stay
 * trustworthy or it stops being read."* ⚠⚠ THE TENSION IS REAL AND IT IS
 * RECORDED HERE RATHER THAN RESOLVED.
 *
 * ⚠ THE HYDRATION JUSTIFICATION BELOW IS A REAL ONE — an unhydrated React input
 * takes the value and loses it on the first client render, which posts an empty
 * email and 401s in 5ms. That is not flake; it is a genuine race with a known
 * cause.
 *
 * ⚠⚠ `E567` IS AN EXTRACTION AND DOES NOT RE-LITIGATE IT. Replacing these with a
 * web-first assertion would be a BEHAVIOUR CHANGE INSIDE A MOVE — and it would
 * make "the count did not change" unprovable, which is the only evidence the
 * extraction was clean. ⚠ WHOEVER REPLACES THEM SHOULD DO IT AS ITS OWN CHANGE,
 * with the count held still on either side.
 */

export function seededAccount(): { email: string; password: string } {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const groups = Object.values(raw).filter(Array.isArray) as {
    email: string;
    password: string;
  }[][];
  const all = groups.flat();
  const chosen = all.find((u) => u.email === "test3@panameer.com");
  if (!chosen) throw new Error("test3@panameer.com is not in prisma/seed-data/test-users.json");
  return { email: chosen.email, password: chosen.password };
}

export async function signIn(page: Page) {
  const { email, password } = seededAccount();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  /* Hydration: an unhydrated React input takes the value and loses it on the
     first client render, which posts an empty email and 401s in 5ms. */
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  expect(res.ok(), `sign-in as ${email} returned ${res.status()}`).toBe(true);
  await page.waitForTimeout(1500);
}
