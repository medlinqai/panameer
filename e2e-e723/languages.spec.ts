import { test, expect } from "@playwright/test";
/* ⚠ `signInAsSeeded` IS NOT USED HERE: it reads the seed file, and this walk signs in as a
   throwaway persona it created itself. The sign-in is inline below, deliberately. */
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E723` items 10–12 — THE LANGUAGES ROUND TRIP ───────────────────────────────────
 *
 * ⚠ **SCOTT: *"Prove it: pick 'Fluent' for French, save, reload, and it's still Fluent."***
 * ⚠⚠ **THAT IS THE WHOLE POINT OF THE ITEM.** The old editor wrote `proficiency` while the
 * save read `level ?? proficiency`, and `level` was `""` — which `??` does NOT treat as
 * absent — so the typed value was discarded on every save. **A round trip is the only shape
 * of test that catches it; asserting the form's own state would have passed.**
 * ⚠⚠⚠ **IT WRITES REAL ROWS ON A THROWAWAY PROFILE AND DELETES THEM.** Never a seeded
 * provider: the languages step replaces the whole set for a profile.
 */
const OUT = join(process.cwd(), "e2e-e723", "shots");
const EMAIL = "e723.languages@example.seed";
test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test("E723 items 10–12 — French · Fluent survives save and reload", async ({ browser }) => {
  const prisma = db();
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL }, select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });
  const bcrypt = await import("bcryptjs");
  const host = await prisma.person.findFirst({
    where: { company_id: { not: undefined } }, select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  const user = await prisma.user.create({
    data: { email: EMAIL, password_hash: await bcrypt.default.hash("Panameer123", 10),
            email_verified: new Date(), first_name: "Lang", last_name: "Walk" },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: { user_id: user.id, first_name: "Lang", last_name: "Walk", is_service_provider: true,
            company_id: host!.company_id, site_id: host!.site_id }, select: { id: true },
  });
  const profile = await prisma.providerProfile.create({
    data: { person_id: person.id, status: "ACTIVE", currency: "USD" }, select: { id: true },
  });
  /* ⚠⚠ SEEDED WITH THE EXACT SHAPE THAT BROKE: `level` empty, `proficiency` carrying the
     word. ⚠⚠⚠ THAT IS THE FIXTURE THE BUG NEEDS — a fresh row with a real `level` would
     have passed on the broken code too (ruling 11: the fixture must be able to fail). */
  await prisma.language.create({
    data: { provider_profile_id: profile.id, name: "French", proficiency: "Fluent", level: null },
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]'); await page.type('input[type="email"]', EMAIL, { delay: 5 });
  await page.click('input[type="password"]'); await page.type('input[type="password"]', "Panameer123", { delay: 5 });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 }).catch(() => {});

  await page.goto("/profile/edit/languages", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const before = await page.evaluate(() =>
    [...document.querySelectorAll("select")].map((s) => ({
      value: (s as HTMLSelectElement).value,
      options: [...(s as HTMLSelectElement).options].length,
    }))
  );
  console.log(`\n══ EDITOR · selects on load ══\n   ${JSON.stringify(before)}`);
  /* ⚠ TWO PICKLISTS, NOT TEXT BOXES — and the language one carries the world list. */
  expect(before.length, "the editor does not render two picklists").toBeGreaterThanOrEqual(2);
  expect(before[0].options, "the language picklist is not the world list").toBeGreaterThan(150);
  expect(before[1].options, "the proficiency picklist is not the five (+ prompt)").toBe(6);

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("select")][1]
      ? [...([...document.querySelectorAll("select")][1] as HTMLSelectElement).options].map((o) => o.textContent)
      : []
  );
  console.log(`   proficiency options in order: ${labels.join(" · ")}`);
  /* ⚠⚠ SCOTT'S DISPLAY ORDER, EXACTLY. */
  expect(labels.slice(1)).toEqual(["Native", "Fluent", "Professional", "Conversational", "Beginner"]);

  await page.selectOption("select >> nth=0", { label: "French" });
  await page.selectOption("select >> nth=1", { label: "Fluent" });
  await page.screenshot({ path: join(OUT, "languages-editor.png"), fullPage: true });

  /* ⚠ THE LAST ROW'S REMOVE IS DEAD, WITH ITS REASON. */
  const removeState = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => (x.textContent ?? "").trim() === "Remove");
    return { disabled: b ? (b as HTMLButtonElement).disabled : null,
             line: document.body.innerText.includes("You need at least one language.") };
  });
  console.log(`   last-row Remove disabled: ${removeState.disabled} · reason shown: ${removeState.line}`);
  expect(removeState.disabled, "the last language can still be removed").toBe(true);
  expect(removeState.line, "no reason is shown beside the dead Remove").toBe(true);

  await page.getByRole("button", { name: /^Save/i }).click();
  await page.waitForTimeout(2600);

  /* ⚠⚠⚠ THE DATABASE, NOT THE FORM. */
  const stored = await prisma.language.findMany({
    where: { provider_profile_id: profile.id }, select: { name: true, level: true, proficiency: true },
  });
  console.log(`   STORED after save: ${JSON.stringify(stored)}`);
  expect(stored.length, "the save wrote no language").toBe(1);
  expect(stored[0].name).toBe("French");
  expect(stored[0].level, "the proficiency was discarded on save — the E723 item 11 bug").toBe("FLUENT");

  /* ⚠ AND THE PROFILE SHOWS IT BACK. */
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  await page.evaluate(() =>
    document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec").forEach((d) => (d.open = true))
  );
  await page.waitForTimeout(400);
  const shown = await page.evaluate(() => {
    const sec = [...document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec")]
      .find((d) => (d.querySelector("h2")?.textContent ?? "").startsWith("Languages"));
    return { heading: (sec?.querySelector("h2")?.textContent ?? "").trim(),
             body: (sec?.querySelector("div.pb-7") as HTMLElement | null)?.innerText.trim() ?? null };
  });
  console.log(`   PROFILE shows: "${shown.heading}" → "${shown.body}"`);
  await page.screenshot({ path: join(OUT, "languages-profile.png"), fullPage: true });
  expect(shown.body, "the profile does not show French — Fluent").toContain("French");
  expect(shown.body, "the profile does not show the proficiency").toContain("Fluent");
  expect(shown.heading, "the Languages count is wrong").toBe("Languages (1)");

  await page.close();
  await prisma.person.delete({ where: { id: person.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
