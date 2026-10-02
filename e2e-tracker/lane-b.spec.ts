import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import { adminAccount, signInAs } from "./_admin";
import { db } from "../e2e-shell/_db";
import { JOURNEY_COPY } from "../src/lib/work-tracker/journey-copy";
import { disconnectTracker, restoreTracker, snapshotTracker, type TrackerSnapshot } from "./_state";
import { openSection } from "./_open";

/**
 * `P2-ALL-E753` lane B — the public route, and the LEAK TEST.
 *
 * ⚠⚠ **SCOTT'S RULE IS WHAT THIS GUARDS:** *"I do not want to give a 'how to
 * recreate Panameer' cookbook to the competition."* The public payload carries
 * phases, gates, stages, journeys, Shipped and support counts — and no task
 * text, no task id, no criterion text, no note and no owner.
 *
 * ⚠⚠⚠ **THE NEEDLES COME FROM THE CATALOG FILE, NOT FROM A HAND-WRITTEN LIST.**
 * A hand-written list goes stale the first time a task is reworded and then
 * passes forever while leaking. Reading the real catalog means a new task is
 * covered the day it is added.
 */

type Catalog = {
  tasks: { id: string; task: string; segment: string }[];
  gates: { id: string; criteria: [string, string][] }[];
};

function catalog(): Catalog {
  return JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/work-tracker/aim-catalog.json"), "utf8")
  ) as Catalog;
}


/* ⚠⚠⚠ THESE TESTS WRITE TO THE ONE SHARED DATABASE, AND `/status` IS PUBLIC.
   Snapshot before, restore after, and ASSERT the restore — `afterAll` runs even
   when a test fails, which is exactly when the data is dirtiest. See `_state.ts`
   for why this exists (my own spec published an invented date). */
let BEFORE: TrackerSnapshot;
test.beforeAll(async () => {
  BEFORE = await snapshotTracker();
});
test.afterAll(async () => {
  await restoreTracker(BEFORE);
  await disconnectTracker();
});

test("E753 — /status is public: a signed-out visitor gets the page, not /login", async ({ page }) => {
  const res = await page.goto("/status");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/status$/);
  await expect(page.getByRole("heading", { name: "Watch Panameer get built!" })).toBeVisible();
});

test("E753 — /api/status is public and carries the view model", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  for (const key of ["phases", "gates", "currentPhaseStages", "journeys", "shipped", "support"]) {
    expect(body, `payload carries ${key}`).toHaveProperty(key);
  }
  console.log(
    `\n  payload: ${(body.phases as unknown[]).length} phases · ${(body.gates as unknown[]).length} gates · ` +
      `${(body.currentPhaseStages as unknown[]).length} stages · ${(body.journeys as unknown[]).length} journeys · ` +
      `overall ${String(body.overallPercent)}% · current ${String(body.currentPhase)}`
  );
});

test("E753 — LEAK TEST: no task text, task id or criterion text in the public payload", async ({
  request,
  page,
}) => {
  const c = catalog();
  const api = await (await request.get("/api/status")).text();
  await page.goto("/status");
  const html = await page.content();

  /* ⚠ Both surfaces, because the page is server-rendered: the payload could be
     clean while the HTML embeds the same data in a flight chunk. */
  for (const [label, haystack] of [["/api/status", api], ["/status HTML", html]] as const) {
    const leakedIds = c.tasks.map((t) => t.id).filter((id) => haystack.includes(id));
    expect(leakedIds, `${label} leaks task ids: ${leakedIds.slice(0, 5).join(", ")}`).toEqual([]);

    /* ⚠ Long task strings only: a short one like "Pick a name" could appear by
       coincidence, and a needle that can match by accident makes the gate a
       false red that people switch off (`decisions_2026-09-23.md` §8 rule 10).

       ⚠⚠⚠ **AND THE TEN JOURNEY ONE-LINERS ARE PUBLISHED ON PURPOSE** (mockup v5,
       the approved design), so they are excluded — BY IMPORTING THE EXACT SET THE
       PAGE PUBLISHES, never by a hand-written list that would drift. ⚠ Two of
       them (`Courses and certification`, `AI maturity assessment and roadmap`)
       happen to be word-identical to their catalog task text; that is a
       coincidence of short wording, not exposure, and rewording public copy to
       satisfy a test would be the dishonest fix.
       ⚠⚠ **EVERYTHING ELSE STILL FAILS THIS TEST**, including all 200 AIM tasks,
       every task id and every gate criterion. */
    const published = new Set(Object.values(JOURNEY_COPY));
    const leakedTasks = c.tasks
      .map((t) => t.task)
      .filter((txt) => txt.length >= 25 && !published.has(txt) && haystack.includes(txt));
    expect(leakedTasks, `${label} leaks task text: ${leakedTasks.slice(0, 3).join(" | ")}`).toEqual([]);

    const leakedCriteria = c.gates
      .flatMap((g) => g.criteria.map(([txt]) => txt))
      .filter((txt) => haystack.includes(txt));
    expect(leakedCriteria, `${label} leaks criterion text: ${leakedCriteria.slice(0, 3).join(" | ")}`).toEqual(
      []
    );
  }

  /* ⚠⚠⚠ THE EXCLUSION IS PAIRED WITH A POSITIVE ASSERTION, or it could hide a
     page that stopped rendering journeys at all. Exactly ten, and every one
     present. */
  const api2 = await (await request.get("/api/status")).text();
  expect(Object.keys(JOURNEY_COPY).length, "ten journeys, no more").toBe(10);
  for (const line of Object.values(JOURNEY_COPY)) {
    expect(api2.includes(line), `the published journey line "${line}" is missing`).toBe(true);
  }

  console.log(
    `\n  leak test clean against ${c.tasks.length} task ids, ` +
      `${c.tasks.filter((t) => t.task.length >= 25).length} task strings and ` +
      `${c.gates.reduce((n, g) => n + g.criteria.length, 0)} criteria, on BOTH surfaces`
  );
});

/**
 * ⚠⚠⚠ THE TEST THAT PROVES THE LEAK TEST CAN FAIL.
 *
 * ⚠ An assertion its own mutation cannot fail is not an assertion
 * (`decisions_2026-09-23.md` §8 rule 12). This asserts that the catalog the
 * needles come from really does contain the strings being searched for — if the
 * file were empty or the shape changed, the leak test above would pass
 * vacuously and nobody would know.
 */
test("E753 — the leak test's own needles are real", () => {
  const c = catalog();
  expect(c.tasks.length).toBeGreaterThan(200);
  expect(c.gates.length).toBe(4);
  expect(c.tasks.filter((t) => t.task.length >= 25).length).toBeGreaterThan(150);
  expect(c.gates.reduce((n, g) => n + g.criteria.length, 0)).toBeGreaterThan(15);
});

test("E765 — an admin-added task's TITLE never reaches the public payload", async ({ request }) => {
  /*
    ⚠⚠⚠ NOT A VACUOUS CHECK. With zero custom tasks this would pass against an
    empty table and prove nothing, so it CREATES one with a unique title, asserts
    the title is absent from both surfaces while its COUNT is present, and then
    deletes it.

    ⚠ A custom task is the sharpest form of the rule Scott set: it is work HE
    wrote about THIS build, so its title is exactly the "how to recreate
    Panameer" detail the public page must never carry.
  */
  const prisma = db();
  const marker = `E765 secret task ${Date.now()}`;
  const release = await prisma.workTrackerRelease.findFirst({ select: { id: true } });

  const created = await prisma.workTrackerCustomTask.create({
    data: { title: marker, phase: "Build", status: "In Progress", release_id: release?.id ?? null },
  });
  try {
    const api = await (await request.get("/api/status")).text();
    const page = await (await request.get("/status")).text();
    expect(api.includes(marker), "a custom task title reached /api/status").toBe(false);
    expect(page.includes(marker), "a custom task title reached /status").toBe(false);

    /* ⚠⚠ THE PAIRED POSITIVE: it must be COUNTED even though it is not named,
       or the test would pass against a page that ignores custom tasks entirely. */
    if (release) {
      const body = JSON.parse(api) as { currentRelease: { taskCount: number } | null };
      expect(body.currentRelease?.taskCount ?? 0, "the custom task is counted").toBeGreaterThan(0);
    }
  } finally {
    await prisma.workTrackerCustomTask.delete({ where: { id: created.id } });
  }
});

test("E753 — a DRAFT Shipped entry never reaches the public payload", async ({ page, request }) => {
  const { email, password } = adminAccount();
  const marker = `E753 draft probe ${Date.now()}`;

  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");
  /* ⚠ `E768` made Shipped an expander and renamed the form submit to
     `Create Draft`. The assertion below is unchanged; only the path is. */
  await openSection(page, "Shipped");
  await page.getByPlaceholder("What shipped").fill(marker);
  await page.getByRole("button", { name: "Create Draft" }).click();
  await page.waitForTimeout(1800);

  /* ⚠ The draft exists in the admin view … */
  await page.reload();
  await openSection(page, "Shipped");
  await expect(page.getByText(marker, { exact: true })).toBeVisible();

  /* ⚠⚠ … and must be absent from the public payload. `published: true` is in the
     WHERE clause, so there is no branch that could forget. */
  const api = await (await request.get("/api/status")).text();
  expect(api.includes(marker), "a DRAFT reached the public payload").toBe(false);

  /* ⚠ Now publish it and prove the test can see the difference — otherwise the
     assertion above would pass against a payload that never shows anything. */
  const row = page.locator("div", { has: page.getByText(marker, { exact: true }) }).last();
  await row.getByRole("button", { name: "Publish" }).click();
  await page.waitForTimeout(1800);
  const api2 = await (await request.get("/api/status")).text();
  expect(api2.includes(marker), "a PUBLISHED entry did not reach the public payload").toBe(true);

  /* clean up — this is the one shared database */
  await page.reload();
  await openSection(page, "Shipped");
  await page
    .locator("div", { has: page.getByText(marker, { exact: true }) })
    .last()
    .getByRole("button", { name: "Delete" })
    .click();
  await page.waitForTimeout(1800);
  const api3 = await (await request.get("/api/status")).text();
  expect(api3.includes(marker)).toBe(false);
  console.log(`\n  draft hidden → published visible → deleted: the filter is real, not vacuous`);
});
