import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { assertPlanRestored, planDb, restorePlan, snapshotPlan, type PlanSnapshot } from "./_plan-state";

/**
 * ── `E786` — IMPORT A PLAN FROM A SPREADSHEET ───────────────────────────────
 *
 * ⚠ The PARSER is proven without a browser by `check:plan` (§14, 25 fixtures).
 * ⚠⚠ What only a browser can prove is the part a person touches: the file
 * picker, the replace/append choice that has **no default**, the per-row
 * reasons appearing on screen, and the size refusal.
 */

const OWNER = "panameer-build";
const HEADER = "Level,Title,Type,Start,End,Status,Owner,Hours";
let before: PlanSnapshot;

test.beforeAll(async () => {
  before = await snapshotPlan(OWNER);
});

test.afterAll(async () => {
  await restorePlan(before);
  await assertPlanRestored(before);
});

test.beforeEach(async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
  if (plan) await planDb.planRow.deleteMany({ where: { plan_id: plan.id } });
  await page.goto("/admin/build-plan", { waitUntil: "domcontentloaded" });
});

/**
 * ⚠⚠ POLLED, NOT READ ONCE. The success message is set BEFORE `router.refresh()`
 * resolves, so the rows arrive a tick after the text a person sees. ⚠ My first
 * version asserted immediately and got `[]` — which looked like the import not
 * rendering and was the assertion racing the refresh.
 */
async function numbersEventually(page: import("@playwright/test").Page, expected: string[]) {
  await expect
    .poll(
      () =>
        page
          .locator("[data-plan-number]")
          .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim())),
      { message: `the imported rows never rendered as ${expected.join(",")}`, timeout: 30_000 },
    )
    .toEqual(expected);
}

async function attach(page: import("@playwright/test").Page, name: string, body: string) {
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType: name.endsWith(".csv") ? "text/csv" : "application/octet-stream",
    buffer: Buffer.from(body, "utf8"),
  });
}

test("the Import button stays disabled until replace-or-add is answered", async ({ page }) => {
  await attach(page, "plan.csv", `${HEADER}\n1,Build,phase,,,,,`);
  const button = page.getByRole("button", { name: "Import the Plan" });
  /**
   * ⚠⚠⚠ NO DEFAULT IS THE DESIGN. "Add to the plan" and "delete the plan and
   * use this file" are not variations of one another, and a pre-selected radio
   * is how somebody loses two hundred rows to one click.
   */
  await expect(button).toBeDisabled();
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await expect(button).toBeEnabled();
});

test("a CSV imports, and its unreadable rows are listed with their line numbers", async ({ page }) => {
  await attach(
    page,
    "plan.csv",
    `${HEADER}\n` +
      `1,Build,phase,2026-09-20,2026-11-01,In progress,Scott,\n` +
      `2,Public,task,2026-09-20,2026-09-30,done,,40\n` +
      `2,Broken,task,not-a-date,,,,\n` +
      `1,,phase,,,,,`,
  );
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();

  /** ⚠ Three rows survive; two reasons are reported. A partial import is a
   *  RESULT, not a failure — the file is not rejected wholesale. */
  await expect(page.getByText(/Imported 3 rows/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/rows? need/)).toBeVisible();
  await expect(page.getByText(/Row 4:.*not a date/)).toBeVisible();
  await expect(page.getByText(/Row 5:.*No title/)).toBeVisible();

  /** ⚠⚠ And the rows are really there, numbered by the same rule as everywhere
   *  else: the task sits under the phase as 1.1. */
  await numbersEventually(page, ["1", "1.1", "1.2"]);
});

test("replace empties the plan first; append keeps what is there", async ({ page }) => {
  await attach(page, "first.csv", `${HEADER}\n1,First,phase,,,,,`);
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  await expect(page.getByText(/Imported 1 row/)).toBeVisible({ timeout: 30_000 });

  await attach(page, "second.csv", `${HEADER}\n1,Second,phase,,,,,`);
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  await expect(page.getByText(/Imported 1 row/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-plan-title]")).toHaveCount(2);

  await attach(page, "third.csv", `${HEADER}\n1,Only,phase,,,,,`);
  await page.getByRole("radio", { name: /Replace the plan/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  /** ⚠ One row in, two replaced — and the message says so. */
  await expect(page.getByText(/replacing 2/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-plan-title]")).toHaveCount(1);
});

test("a file over 2 MB is refused, and the message says how big it was", async ({ page }) => {
  /** ⚠ Built from real rows so the refusal is about SIZE, not about content. */
  const big = `${HEADER}\n` + "1,Row,phase,,,,,\n".repeat(140_000);
  expect(Buffer.byteLength(big), "the fixture must exceed the cap").toBeGreaterThan(2 * 1024 * 1024);
  await attach(page, "huge.csv", big);
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  await expect(page.getByText(/The limit is 2 MB/)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-plan-title]")).toHaveCount(0);
});

test("a format we cannot read is refused by name, with what to do instead", async ({ page }) => {
  await attach(page, "schedule.mpp", "not really a project file");
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  /** ⚠⚠ Refused BY NAME rather than fed to a reader that cannot read it and
   *  failing obscurely. Microsoft Project is a later decision. */
  await expect(page.getByText(/save it as \.xlsx or \.csv/)).toBeVisible({ timeout: 30_000 });
});

test("the template downloads as a workbook with the documented headings", async ({ page }) => {
  const res = await page.request.get("/api/admin/plan/template");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
  expect(res.headers()["content-disposition"]).toContain("panameer-plan-template.xlsx");
  const body = await res.body();
  /** ⚠ A .xlsx is a zip — `PK` is its magic number. ⚠⚠ Asserting the bytes
   *  rather than only the header means a 200 that served HTML cannot pass. */
  expect(body.subarray(0, 2).toString("latin1")).toBe("PK");
  expect(body.length, "an empty workbook would still be a zip").toBeGreaterThan(2000);
});

test("the template is a round trip — it imports cleanly into a plan", async ({ page }) => {
  /**
   * ⚠⚠⚠ THE ASSERTION THAT MATTERS MOST ABOUT A TEMPLATE: that the file we hand
   * out is a file we can read back. ⚠ A template whose own headings have drifted
   * from the reader is the defect this prevents, and it is why the headings are
   * generated from `IMPORT_COLUMNS` rather than committed as a binary (`E585`).
   */
  const res = await page.request.get("/api/admin/plan/template");
  const body = await res.body();
  await page.setInputFiles('input[type="file"]', {
    name: "panameer-plan-template.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: body,
  });
  await page.getByRole("radio", { name: /Add these rows/ }).check();
  await page.getByRole("button", { name: "Import the Plan" }).click();
  await expect(page.getByText(/Imported 5 rows/)).toBeVisible({ timeout: 60_000 });
  /** ⚠ And with no problems — the template must not warn about itself. */
  await expect(page.getByText(/need(s)? a look/)).toHaveCount(0);
  await numbersEventually(page, ["1", "1.1", "1.2", "1.3", "◆"]);

  /**
   * ⚠⚠⚠ THE RELEASE SURVIVES THE ROUND TRIP (`E795`). This is the assertion the
   * live plan needed and did not have: on 2026-10-03 an edit-and-replace import
   * silently dropped every R1 tag, because the template had no Release column.
   * ⚠ Four of the template's five rows carry `R1`; the `Learn` example carries
   * none, so the pair proves the column is read rather than defaulted.
   */
  const plan = await planDb.plan.findUnique({ where: { owner_key: OWNER }, select: { id: true } });
  const rows = await planDb.planRow.findMany({
    where: { plan_id: plan!.id },
    select: { title: true, release_id: true },
  });
  const tagged = rows.filter((r) => r.release_id !== null).map((r) => r.title).sort();
  const untagged = rows.filter((r) => r.release_id === null).map((r) => r.title).sort();
  expect(tagged, `tagged: ${JSON.stringify(tagged)}`).toHaveLength(4);
  expect(untagged, "the Learn example must arrive untagged").toEqual(["Learn"]);
});
