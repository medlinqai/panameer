import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded } from "../e2e-shell/_auth";

/** ⚠ `P2-A1.1-E748` WS-C — the badge on the owner view and a visitor's. */
const PROFILE = "74c0df8a-c74f-45fd-a84a-8d1e43f34924";

test("owner sees the badge, with the source in its tooltip", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  /* ⚠⚠ NOT THE GATE PERSONA — measured: it has ZERO employers, so the only
     badge on its profile is the pre-existing profile-level "Validated by
     Panameer" chip, and the assertion matched that instead of the new one.
     ⚠⚠⚠ A test that passes on the wrong element proves nothing. */
  await signInAsSeeded(page, "sw_user2@straterp.com");
  await page.goto("/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  /* ⚠ Scoped to the WORK HISTORY badge: the profile-level "Validated by
     Panameer" chip also starts with the word, and the two are different claims. */
  const badges = page.locator('span[title^="Validated by a contact at"]');
  const n = await badges.count();
  const titles = await badges.evaluateAll((els) => els.map((e) => e.getAttribute("title")));
  console.log(`OWNER badges=${n} titles=${JSON.stringify(titles.slice(0, 3))}`);
  expect(n, "the owner sees no validated badge").toBeGreaterThan(0);
  /* ⚠⚠ THE TOOLTIP NAMES A DOMAIN, NEVER A PERSON. */
  expect(titles.some((t) => /contact at /.test(t ?? "")), "no source in the tooltip").toBe(true);
  expect(titles.some((t) => /@/.test(t ?? "")), "an ADDRESS leaked into the tooltip").toBe(false);
  await page.screenshot({ path: "e2e-e744/shots/badge-owner-1280.png" });
  await page.close();
});

test("a visitor sees the badge and never a pending one", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await signIn(page);
  await page.goto(`/providers/${PROFILE}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const body = (await page.locator("body").innerText()).toLowerCase();
  const badges = await page.locator('span[title^="Validated"]').count();
  console.log(`VISITOR badges=${badges} pendingText=${body.includes("validation requested")}`);
  expect(badges, "the visitor sees no validated badge").toBeGreaterThan(0);
  /* ⚠⚠⚠ PENDING IS OWNER-ONLY — a visitor learning somebody was asked and not
     answered reads as a doubt about the member. */
  expect(body.includes("validation requested"), "PENDING leaked to a visitor").toBe(false);
  await page.screenshot({ path: "e2e-e744/shots/badge-visitor-1280.png" });
  await page.close();
});
