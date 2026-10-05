import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Résumé company sort, end to end on the Register review step. Throwaway providers only.
// The real CV is read from Scott's local folder at run time (RESUME_SAMPLE) and never copied into the repo.
const T = "\t".repeat(12);
const CLIENTS = ["Regional Utility", "Coastal Retail Group", "Metro Transit Board", "Northern Logistics", "Valley Health System", "Harbor Insurance Co", "Summit Manufacturing", "Lakeside University", "Prairie Foods", "Granite Bank"];
const SYNTH = ["Jordan Sample", "Independent Oracle Consultant", "ORACLE CLOUD APPLICATION EXPERIENCE", ...CLIENTS.flatMap((c, i) => [
  `${c} (REMOTE)${T}0${(i % 9) + 1}/20${10 + i} to 0${(i % 9) + 1}/20${11 + i}\t`, "Summary", `\tEngagement ${i + 1} Implementation`, "\t",
  "Description", `\tDelivered phase ${i + 1}.`, "\t", "Role-Type", "\tApplication-Specific (Functional SME)", "\t",
  "Software", "\tOracle Cloud Applications", "\t", "Skills Used", "\tCore HR, Payables", "\t"])].join("\n");

async function upload(page: Page, name: string, type: string, bytes: Buffer) {
  return page.evaluate(async ({ name, type, b64 }) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("file", new File([bin], name, { type }));
    form.append("source", "RESUME");
    const r = await fetch("/api/onboarding/provider/import", { method: "POST", body: form });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, { name, type, b64: bytes.toString("base64") });
}

const cases = [
  { label: "synthetic", file: "synthetic-cv.txt", type: "text/plain", bytes: () => Buffer.from(SYNTH), expect: 10 },
  { label: "scott-test-cv", file: "test-cv.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: () => readFileSync(process.env.RESUME_SAMPLE!), expect: 10, skip: !process.env.RESUME_SAMPLE || !existsSync(process.env.RESUME_SAMPLE) },
];

for (const c of cases)
  test(`company sort — ${c.label}`, async ({ page }) => {
    test.skip(!!c.skip, "RESUME_SAMPLE not set");
    test.setTimeout(240_000);
    const f: R1Fixture = await createFixture();
    try {
      await signIn(page, f.provider.email);
      await page.goto("/join/provider");
      const up = await upload(page, c.file, c.type, c.bytes());
      expect(up.status, JSON.stringify(up.body).slice(0, 300)).toBeLessThan(300);
      const gaps = ((up.body as { gaps?: string[] }).gaps ?? []).join(" | ");
      console.log(`${c.label} gaps: ${gaps.slice(0, 300)}`);
      expect(gaps).not.toContain("company names in your document");
      const pid = (await db().providerProfile.findUnique({ where: { person_id: f.provider.personId }, select: { id: true } }))!.id;
      const empNames = (await db().employer.findMany({ where: { provider_profile_id: pid }, select: { name: true } })).map((e) => e.name);
      const listed = c.expect + empNames.length;
      console.log(`${c.label}: projects ${await db().project.count({ where: { provider_profile_id: pid } })} · employers ${empNames.length} ${JSON.stringify(empNames)}`);
      expect(gaps).toContain(`We found ${listed} companies. Sort them below.`);
      expect(await db().project.count({ where: { provider_profile_id: pid } })).toBe(c.expect);
      if (c.label === "synthetic") expect(empNames.length).toBe(0);

      for (const w of [1440, 390]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto("/join/provider?step=finish");
        const sort = page.getByTestId("company-sort");
        await expect(sort).toBeVisible({ timeout: 60_000 });
        await expect(sort.getByRole("heading")).toHaveText(`Companies we found (${listed})`);
        await expect(page.getByText("No work history yet — want us to read your résumé again?")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
        await sort.screenshot({ path: `e2e-r1/.artifacts/company-sort-${c.label}-${w}.png` });
      }
      const sort = page.getByTestId("company-sort");
      const rows = sort.locator("li[data-company]");
      const first = (await rows.nth(0).getAttribute("data-company"))!;
      const second = (await rows.nth(1).getAttribute("data-company"))!;
      const third = (await rows.nth(2).getAttribute("data-company"))!;
      await rows.nth(0).getByRole("radio", { name: "Employer" }).click();
      await rows.nth(1).getByLabel(`Employer for ${second}`).selectOption({ label: first });
      await rows.nth(2).getByRole("radio", { name: "Remove" }).click();
      await sort.getByRole("button", { name: "Continue" }).click();
      await expect(sort.getByText(/Saved —/)).toBeVisible({ timeout: 30_000 });
      const emps = await db().employer.findMany({ where: { provider_profile_id: pid }, select: { id: true, name: true } });
      expect(emps.map((e) => e.name)).toContain(first);
      const prjs = await db().project.findMany({ where: { provider_profile_id: pid }, select: { client_name: true, employer_id: true } });
      expect(prjs.length).toBe(c.expect - 2);
      expect(prjs.some((p) => p.client_name === third)).toBe(false);
      expect(prjs.find((p) => p.client_name === second)?.employer_id).toBe(emps.find((e) => e.name === first)!.id);
    } finally {
      await dropFixture(f);
    }
  });
