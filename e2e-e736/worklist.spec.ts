import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E736` — THE TRIAGE LIST AND THE WORKLIST ───────────────────────────────────────
 *
 * ⚠ **SCOTT'S GATE: *"Bulk select and dismiss 3 → counts move correctly. Complete one
 * worklist row → it moves Open → Completed."***
 *
 * ⚠⚠ **IT WRITES REAL ROWS ON A THROWAWAY PERSONA AND DELETES THEM.** Never a seeded
 * member: this dismisses and resolves rows, and doing that to a seeded account would
 * change figures other gates and briefs quote. ⚠ `E723`'s pattern, for `E723`'s reason.
 *
 * ⚠⚠⚠ **THE COUNTS ARE READ FROM THE DATABASE, NOT FROM THE SCREEN.** Asserting that a
 * chip's number changed proves the chip re-rendered; asserting the ROW's `dismissed_at`
 * proves the act happened. The screen assertion is kept as well, because a correct write
 * that does not reach the list is still a defect the member sees.
 */
const OUT = join(process.cwd(), "e2e-e736", "shots");
const EMAIL = "e736.worklist@example.seed";
const PASS = "Test-Passw0rd!";

const setTheme = (t: "light" | "dark") =>
  `document.documentElement.setAttribute("data-theme", "${t}")`;

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test("E736 — dismiss hides rows and never resolves an action row", async ({ page }) => {
  const prisma = db();
  const bcrypt = await import("bcryptjs");

  /* ── a throwaway persona, cleaned first in case a previous run died ───────────────── */
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });

  /* ⚠ `is_service_provider` IS ON `Person`, NOT ON `User`, and a `Person` needs a company
     and a site — read off `e2e-e723`'s working persona rather than guessed. */
  /* ⚠⚠ READ OFF THE SCHEMA, NOT GUESSED: `Person.company_id` is **NOT NULLABLE**
     (`String @db.Uuid`) and `site_id` IS (`String?`). ⚠ That is why both `{ not: null }`
     forms were rejected — a null filter on a non-nullable column is not a valid query.
     ⚠ So only `site_id` needs a presence test. */
  const host = await prisma.person.findFirst({
    where: { site_id: { not: null } },
    select: { company_id: true, site_id: true },
  });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password_hash: await bcrypt.hash(PASS, 10),
      email_verified: new Date(),
      first_name: "E736",
      last_name: "Worklist",
    },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: {
      user_id: user.id,
      first_name: "E736",
      last_name: "Worklist",
      is_service_provider: true,
      company_id: host!.company_id,
      site_id: host!.site_id,
    },
    select: { id: true },
  });
  const personId = person.id;

  /*
    ⚠⚠ SIX ROWS: five plain and ONE that requires action. ⚠⚠⚠ THE CATEGORIES ARE REAL
    REGISTRY KEYS — `check:notifications` fails the build on an unknown category, so a
    made-up one here would write rows the settings screen can never reach.
  */
  const mk = (i: number, action: boolean) => ({
    person_id: personId,
    event_key: action ? "colleague.invite_received" : "message.received",
    category: action ? "account.registration" : "message.received",
    title: `E736 row ${i}`,
    body: `body ${i}`,
    href: "/profile",
    requires_action: action,
    delivered_in_app_at: new Date(),
  });
  await prisma.notification.createMany({
    data: [mk(1, false), mk(2, false), mk(3, false), mk(4, false), mk(5, false), mk(6, true)],
  });

  const before = await prisma.notification.count({
    where: { person_id: personId, dismissed_at: null },
  });
  expect(before, "six rows to work with (E586 — a gate with no inputs must fail)").toBe(6);

  /* ── sign in ─────────────────────────────────────────────────────────────────────── */
  /* ⚠ `e2e-e723`'s sign-in, copied rather than re-derived: the inputs are selected by
     TYPE (there is no `name="email"`), the form needs a beat to hydrate, and the submit is
     awaited on the credentials callback rather than on a URL change. */
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASS, { delay: 5 });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page
    .waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 })
    .catch(() => {});

  await page.goto("/notifications", { waitUntil: "networkidle" });
  await expect(page.locator(".pm-triage-row")).toHaveCount(6);

  /* ── the bell lights on this page (lane 1's rule, proven here) ───────────────────── */
  const bellBg = await page
    .locator('button[aria-label*="otification"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bellBg, "the bell is lit on /notifications").toBe("rgb(176, 42, 174)");

  /* ── select three and dismiss ────────────────────────────────────────────────────── */
  for (let i = 0; i < 3; i++) {
    await page.locator('.pm-triage-row input[type="checkbox"]').nth(i).check();
  }
  await expect(page.locator(".pm-triage-bar")).toContainText("3 selected");
  /* ⚠ SCOPED TO THE BULK BAR. An unscoped "Dismiss" matched two controls — the bar's
     and a row's — and clicking the wrong one would have dismissed ONE row while the
     assertion expected three, which is a false red that looks like a real one. */
  await page.locator(".pm-triage-bar").getByRole("button", { name: "Dismiss", exact: true }).click();
  await page.waitForTimeout(1200);

  /* ⚠ THE DATABASE IS THE ASSERTION. */
  const after = await prisma.notification.count({
    where: { person_id: personId, dismissed_at: null },
  });
  expect(after, "three rows dismissed").toBe(3);

  /* ⚠ AND THE SCREEN AGREES — a correct write that does not reach the list is still a
     defect the member sees. */
  await expect(page.locator(".pm-triage-row")).toHaveCount(3);

  /*
    ⚠⚠⚠ DISMISS DOES NOT DELETE AND DOES NOT RESOLVE. ⚠ Both halves asserted, because
    either one failing is a different defect: deleting loses the record, resolving lets a
    member clear an obligation by tidying their inbox.
  */
  const total = await prisma.notification.count({ where: { person_id: personId } });
  expect(total, "dismiss hides, it does not delete").toBe(6);
  const stillOpen = await prisma.notification.count({
    where: { person_id: personId, requires_action: true, resolved_at: null },
  });
  expect(stillOpen, "the action row is still open after a dismiss").toBe(1);

  /* ── the worklist: Open → Completed ──────────────────────────────────────────────── */
  await page.goto("/worklist", { waitUntil: "networkidle" });
  await expect(page.locator(".pm-wl-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".pm-wl-status")).toHaveText("Open");

  /*
    ⚠⚠ RESOLVED THE WAY THE APP RESOLVES IT — a domain side effect, not a button. There is
    deliberately no "mark done" control (see the page's own docblock), so the test does what
    the six real writers do: stamp `resolved_at`.
  */
  await prisma.notification.updateMany({
    where: { person_id: personId, requires_action: true, resolved_at: null },
    data: { resolved_at: new Date() },
  });

  await page.goto("/worklist", { waitUntil: "networkidle" });
  await expect(page.locator(".pm-wl-empty"), "it left Open").toHaveText("This queue is clear.");

  await page.goto("/worklist?status=completed", { waitUntil: "networkidle" });
  await expect(page.locator(".pm-wl-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".pm-wl-status")).toHaveText("Completed");

  /* ── shots ───────────────────────────────────────────────────────────────────────── */
  for (const [route, name] of [
    ["/notifications", "triage"],
    ["/worklist?status=any", "worklist"],
  ] as const) {
    for (const w of [1280, 390]) {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.goto(route, { waitUntil: "networkidle" });
      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(setTheme(theme));
        await page.waitForTimeout(220);
        await page.screenshot({ path: join(OUT, `${name}-${w}-${theme}.png`), fullPage: true });
      }
    }
  }

  /* ⚠⚠ DARK MODE BY COMPUTED COLOUR, not by the screenshot existing (`E723`). */
  await page.evaluate(setTheme("dark"));
  const rowBg = await page
    .locator("body")
    .evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log(`E736 dark body bg: ${rowBg}`);
  expect(rowBg, "dark mode is not white").not.toBe("rgb(255, 255, 255)");

  /* ── teardown ────────────────────────────────────────────────────────────────────── */
  await prisma.person.delete({ where: { id: personId } });
  await prisma.user.delete({ where: { id: user.id } });
  const left = await prisma.notification.count({ where: { person_id: personId } });
  expect(left, "the throwaway persona and its rows are gone").toBe(0);
});
