import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:my-company (lane 4): the buyer view never carries the EIN; own company → Overview; preview banner.
const EIN = "12-3456789";
let f: CoFixture | null = null;
test.beforeAll(async () => {
  f = await createCompanyFixture();
});
test.afterAll(async () => dropCompanyFixture(f));

test("no API route returns a company's tin", () => {
  const walk = (d: string, out: string[] = []): string[] => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (e === "route.ts") out.push(p);
    }
    return out;
  };
  const hits = walk(join(process.cwd(), "src/app/api")).filter((p) =>
    /\btin\b/.test(readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))
  );
  expect(hits).toEqual([]);
});

for (const scheme of ["light", "dark"] as const)
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
    test(`buyer view ${vp.width} ${scheme}`, async ({ browser }) => {
      const url = `/companies/${f!.companyId}`;
      // An outsider (no membership here) sees the buyer view, without the EIN anywhere in the response.
      const out = await browser.newContext({ colorScheme: scheme, viewport: vp });
      const op = await out.newPage();
      await signIn(op, f!.people.loner.email);
      const res = await op.goto(url, { waitUntil: "networkidle" });
      expect((await res!.text()).includes(EIN), "EIN in the HTML/RSC payload").toBe(false);
      await expect(op.locator('[data-company-page="buyer"]')).toBeVisible();
      await expect(op.getByText(/EIN|Tax registration|Asking to join/)).toHaveCount(0);
      await expect(op.locator("main").getByRole("link", { name: "Edit" })).toHaveCount(0);
      await op.screenshot({ path: `e2e-r1/.artifacts/company-buyer-${vp.width}-${scheme}.png`, fullPage: true });
      await out.close();
      // The admin: own company redirects to Overview; the preview shows the same buyer view with a banner.
      const ad = await browser.newContext({ colorScheme: scheme, viewport: vp });
      const ap = await ad.newPage();
      await signIn(ap, f!.people.admin.email);
      await ap.goto(url, { waitUntil: "domcontentloaded" });
      await expect(ap).toHaveURL(/\/company$/);
      await ap.getByRole("link", { name: "How Buyers See Our Company" }).click();
      await expect(ap.locator("[data-buyer-preview]")).toBeVisible();
      await expect(ap.locator('[data-company-page="buyer"]')).toBeVisible();
      // Fresh load of the preview: the response itself must not carry the EIN.
      const pres = await ap.goto(`${url}?preview=buyer`, { waitUntil: "networkidle" });
      expect((await pres!.text()).includes(EIN), "EIN in the preview payload").toBe(false);
      await ad.close();
    });
