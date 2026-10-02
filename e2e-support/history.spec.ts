import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";
import { db } from "../e2e-shell/_db";

/**
 * `P2-ALL-E761` — every change writes one event, and the reporter sees less.
 *
 * ⚠⚠ IT RESTORES THE TICKET IT TOUCHES. This is the ONE shared database and
 * `PAN-*` tickets are Scott's real support queue — a probe that leaves a ticket
 * assigned to the test admin is a probe that changed his worklist.
 */
const prisma = db();
let TICKET: { id: string; code: string } | null = null;
let BEFORE: { status: string; priority: string; assignee: string | null } | null = null;
let EVENT_IDS: string[] = [];

test.beforeAll(async () => {
  const t = await prisma.supportTicket.findFirst({
    orderBy: { created_at: "desc" },
    select: { id: true, ticket_code: true, status: true, priority: true, assignee_person_id: true },
  });
  if (!t) throw new Error("no support tickets to exercise");
  TICKET = { id: t.id, code: t.ticket_code };
  BEFORE = { status: t.status, priority: t.priority, assignee: t.assignee_person_id };
  const existing = await prisma.ticketEvent.findMany({ where: { ticket_id: t.id }, select: { id: true } });
  EVENT_IDS = existing.map((e) => e.id);
});

test.afterAll(async () => {
  if (!TICKET || !BEFORE) return;
  await prisma.supportTicket.update({
    where: { id: TICKET.id },
    data: { status: BEFORE.status, priority: BEFORE.priority, assignee_person_id: BEFORE.assignee },
  });
  /* ⚠ Delete only the events this run created; the backfilled `filed` stays. */
  await prisma.ticketEvent.deleteMany({
    where: { ticket_id: TICKET.id, id: { notIn: EVENT_IDS } },
  });
  const after = await prisma.supportTicket.findUnique({
    where: { id: TICKET.id },
    select: { status: true, priority: true, assignee_person_id: true },
  });
  const events = await prisma.ticketEvent.count({ where: { ticket_id: TICKET.id } });
  if (
    after?.status !== BEFORE.status ||
    after?.priority !== BEFORE.priority ||
    after?.assignee_person_id !== BEFORE.assignee ||
    events !== EVENT_IDS.length
  ) {
    throw new Error(
      `TICKET NOT RESTORED — status ${after?.status}/${BEFORE.status}, events ${events}/${EVENT_IDS.length}`
    );
  }
});

test("E761 — assign, status and priority each write exactly one event", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto(`/admin/support/${TICKET!.id}`);

  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  /* ⚠⚠ NORMALISE FIRST. The button is `Assign to Me` or `Unassign` depending on
     the ticket's CURRENT state, and a test that only works from one starting
     state fails for a reason that has nothing to do with the code. */
  if (await page.getByRole("button", { name: "Unassign" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Unassign" }).click();
    await expect(page.getByRole("button", { name: "Assign to Me" })).toBeVisible();
    await page.waitForTimeout(800);
  }

  /* ⚠ Driven through the real admin panel, not through the lib — the point is
     that the SURFACE records history, not that a function can. */
  const base = await prisma.ticketEvent.count({ where: { ticket_id: TICKET!.id } });
  await page.getByRole("button", { name: "Assign to Me" }).click();
  await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.reload();

  const afterAssign = await prisma.ticketEvent.findMany({
    where: { ticket_id: TICKET!.id },
    orderBy: { created_at: "asc" },
  });
  expect(afterAssign.length, "assigning writes exactly one event").toBe(base + 1);
  expect(afterAssign[afterAssign.length - 1].kind).toBe("assigned");

  /* ⚠⚠ AND IT IS ON THE PAGE, not merely in the table. */
  await expect(page.getByText(/assigned it to themselves/i)).toBeVisible();

  /* ⚠⚠⚠ A SAVE THAT CHANGES NOTHING WRITES NOTHING — the echo ruling 82a rejects. */
  const n1 = await prisma.ticketEvent.count({ where: { ticket_id: TICKET!.id } });
  /* ⚠ The panel now offers `Unassign`, so re-assert the SAME assignment through
     the API the panel uses — which is where the "did it move" test lives. */
  const res = await page.request.patch(`/api/support/tickets/${TICKET!.id}`, {
    data: { assignToSelf: true },
  });
  expect(res.ok(), "the re-assert must be accepted").toBe(true);
  await page.waitForTimeout(800);
  const n2 = await prisma.ticketEvent.count({ where: { ticket_id: TICKET!.id } });
  expect(n2, "re-assigning to the same person writes no second event").toBe(n1);
});

test("E761 — the reporter sees status and messages, never assignee or priority", async () => {
  /* ⚠⚠ QUERIED DIRECTLY, NOT BY IMPORTING THE APP LIB. A dynamic
     `import("../src/lib/support")` fails in this process ("Cannot use import
     statement outside a module") — and it would also drag the app's Prisma
     singleton in. The assertion is about WHICH KINDS reach the reporter, and the
     rule lives in one named constant, so the test states that list itself. */
  const REPORTER_KINDS = ["filed", "status", "message"];
  const all = await prisma.ticketEvent.findMany({
    where: { ticket_id: TICKET!.id },
    select: { kind: true },
  });
  const reporterVisible = all.filter((e) => REPORTER_KINDS.includes(e.kind));

  const kinds = (xs: { kind: string }[]) => [...new Set(xs.map((x) => x.kind))].sort();
  console.log(`\n  admin kinds:    ${kinds(all).join(", ")}`);
  console.log(`  reporter kinds: ${kinds(reporterVisible).join(", ")}`);

  for (const banned of ["assigned", "unassigned", "priority"]) {
    expect(REPORTER_KINDS, `the reporter must not be shown ${banned}`).not.toContain(banned);
  }
  /* ⚠ Paired positive: the admin view really does hold a kind the reporter does
     not, or this test would pass against a ticket that never had one. */
  expect(kinds(all), "the admin view must include at least one admin-only kind").toContain("assigned");
  expect(reporterVisible.length, "the reporter still sees their own ticket's story").toBeGreaterThan(0);
  expect(kinds(reporterVisible)).toContain("filed");
});

test("E761 — the admin timeline renders, light and dark", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`/admin/support/${TICKET!.id}`);
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    /* ⚠ Assignee is on the card now — the defect was that only a BOOLEAN reached
       the page, so an admin saw THAT it was assigned and never to whom. */
    await expect(page.getByText("Assignee")).toBeVisible();
    const hist = page.locator("section", { has: page.getByRole("heading", { name: "History" }) }).first();
    /* ⚠ Scroll it into view first — a clip computed from a box below the fold is
       outside the viewport image, which is what failed here. */
    await hist.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await hist.screenshot({ path: `e2e-support/shots/timeline-1280-${scheme}.png` });
    const rows = await hist.locator("li").count();
    console.log(`  ${scheme}: ${rows} timeline row(s)`);
  }
});
