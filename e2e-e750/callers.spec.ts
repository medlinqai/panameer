import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** `E751` — is the PageTabs wrapper always `main`'s first child? The band fix
 * cancels `main`'s padding, so this is the premise that makes that safe. */
const PATHS = ["/profile", "/usage", "/community", "/community/score", "/payments",
  "/my-services", "/company", "/messages", "/account-health", "/settings/notifications"];

test("E751 callers — wrapper position inside main", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  const rows: string[] = [];
  for (const path of PATHS) {
    await page.goto(path);
    const n = await page.getByTestId("page-tabs").count();
    if (n === 0) { rows.push(`${path.padEnd(26)} NO page-tabs rendered`); continue; }
    const r = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="page-tabs"]') as HTMLElement;
      const wrap = s.parentElement as HTMLElement;
      const main = document.querySelector("main") as HTMLElement;
      const mr = main.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      return {
        parentIsMain: wrap.parentElement === main,
        isFirstChild: main.firstElementChild === wrap,
        mainX: Math.round(mr.x), mainW: Math.round(mr.width), mainY: Math.round(mr.y),
        wrapX: Math.round(wr.x), wrapW: Math.round(wr.width), wrapY: Math.round(wr.y),
        padT: getComputedStyle(main).paddingTop, padL: getComputedStyle(main).paddingLeft,
      };
    });
    rows.push(
      `${path.padEnd(26)} parentIsMain=${String(r.parentIsMain).padEnd(5)} first=${String(r.isFirstChild).padEnd(5)}` +
      ` main[x=${r.mainX} w=${r.mainW} y=${r.mainY} padT=${r.padT} padL=${r.padL}]` +
      ` wrap[x=${r.wrapX} w=${r.wrapW} y=${r.wrapY}]`);
  }
  console.log("\n===== E751 CALLERS =====\n" + rows.join("\n") + "\n");
  expect(rows.length).toBe(PATHS.length);
});
