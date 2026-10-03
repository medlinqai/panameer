import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { db } from "../e2e-shell/_db";

/**
 * ── `E794` — FIND & SEE ─────────────────────────────────────────────────────
 *
 * ⚠ **SCOTT'S TRIGGER:** his `test2*` search found nothing, and he could not
 * tell "those accounts are gone" from "that field is not searched". ⚠⚠ So the
 * assertions are about both halves: a real person is findable by EVERY field,
 * and a search that matches nothing SAYS WHAT IT SEARCHED.
 */
const prisma = db();

test.beforeEach(async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
});

test("search finds the same person by name, email, company, phone and both ids", async ({ page }) => {
  /** ⚠ Picked from the database, so the test is about a real row rather than a
   *  fixture that may not resemble one. */
  const subject = await prisma.person.findFirst({
    /** ⚠ `company` is a REQUIRED relation on `Person`, so `isNot: null` is not a
     *  valid filter there and it is always present — only the optional ones need
     *  asking about. */
    where: { user: { isNot: null }, phone: { not: null } },
    select: {
      id: true, user_id: true, first_name: true, last_name: true, phone: true,
      company: { select: { name: true } }, user: { select: { email: true } },
    },
  });
  test.skip(subject === null, "no person with a user, a company and a phone to search for");

  const terms: [string, string][] = [
    ["email", subject!.user!.email],
    ["person id", subject!.id],
    ["user id", subject!.user_id!],
    ["phone", subject!.phone!],
    ["company", subject!.company!.name],
  ];
  if (subject!.last_name) terms.push(["last name", subject!.last_name]);

  for (const [field, term] of terms) {
    await page.goto(`/admin/buyers-sellers?q=${encodeURIComponent(term)}`, { waitUntil: "domcontentloaded" });
    const body = await page.locator("body").innerText();
    expect(body, `searching by ${field} ("${term}") did not find ${subject!.user!.email}`).toContain(
      subject!.user!.email,
    );
  }
});

test("a search that matches nothing says what it searched", async ({ page }) => {
  await page.goto("/admin/buyers-sellers?q=zzzz-no-such-person-zzzz", { waitUntil: "domcontentloaded" });
  /** ⚠⚠⚠ THE WHOLE POINT OF THE LANE: a blank screen is what Scott got, and a
   *  blank screen cannot be told apart from a search that never ran. */
  await expect(page.getByText(/No one matches/)).toBeVisible();
  await expect(page.getByText(/Searched name, email, company, title, job, phone and both ids/)).toBeVisible();
});

test("the user page shows the whole record, with reasons where a figure is uncountable", async ({ page }) => {
  const subject = await prisma.person.findFirst({
    where: { user: { isNot: null } },
    select: { id: true },
    orderBy: { created_at: "desc" },
  });
  test.skip(subject === null, "no person to open");
  await page.goto(`/admin/users/${subject!.id}`, { waitUntil: "domcontentloaded" });

  for (const title of ["Connections", "Work", "Learn", "Email", "Support and follows", "History"]) {
    await expect(page.getByRole("heading", { name: title, exact: true }), `${title} section missing`).toBeVisible();
  }
  /** ⚠⚠ A DASH CARRIES ITS REASON. `WorkOrder` has no per-person column, so the
   *  page must say that rather than print a 0 nobody measured. */
  await expect(page.getByText(/no per-person column on work orders/)).toBeVisible();
  /** ⚠ And the audit section explains its own emptiness rather than implying
   *  nothing ever happened — the ambiguity Scott hit. */
  const history = await page.locator("section", { has: page.getByRole("heading", { name: "History" }) }).innerText();
  expect(history.length, "History rendered nothing at all").toBeGreaterThan(20);
});

test("Export to Excel downloads a workbook that respects the filter", async ({ page }) => {
  await page.goto("/admin/buyers-sellers", { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", { name: "Export to Excel" });
  await expect(link).toBeVisible();

  const res = await page.request.get("/api/admin/export?list=users");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
  expect(res.headers()["content-disposition"]).toContain("panameer-users-");
  const body = await res.body();
  /** ⚠ `PK` — a .xlsx is a zip. Asserting the bytes means a 200 that served
   *  HTML cannot pass. */
  expect(body.subarray(0, 2).toString("latin1")).toBe("PK");

  /** ⚠⚠ THE FILTER RIDES ALONG. A filtered export that silently returns
   *  everything is a different document from the one on screen — so the
   *  no-match export must be SMALLER than the unfiltered one. */
  const filtered = await page.request.get("/api/admin/export?list=users&q=zzzz-no-such-person-zzzz");
  expect(filtered.status()).toBe(200);
  const fb = await filtered.body();
  expect(fb.length, "the filtered workbook is not smaller than the full one").toBeLessThan(body.length);
});
