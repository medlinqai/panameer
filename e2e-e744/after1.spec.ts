import { test } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
/** ⚠ `P2-A1.1-E744` lane 1 — the four cards are gone. */
test("usage after lane 1", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await signIn(page);
  await page.goto("/usage", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const t = (await page.locator("body").innerText()).toLowerCase();
  console.log(JSON.stringify({
    confirmExperience: t.includes("confirm your experience"),
    serviceProductsTile: t.includes("manage service products"),
    profileChecklist: t.includes("see your profile score"),
    inventoryCounts: t.includes("companies") && t.includes("certifications"),
    footerLine: t.includes("something look wrong"),
    gauges: await page.locator(".pm-gauge, [data-gauge]").count(),
  }));
  await page.screenshot({ path: "e2e-e744/shots/usage-after-lane1-1280.png", fullPage: true });
  await page.close();
});
