import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E719` — HIRE FROM A PROFILE, SOLE-SOURCED ──────────────────────────────────
 *
 * ⚠ Three personas, because the rule is about WHO sees the button:
 *   · **buyer** `sw_user31@straterp.com` — `is_service_buyer = true`, not a provider
 *   · **owner** `sw_user21@straterp.com` viewing their OWN `/providers/<id>`
 *   · **non-buyer** the same provider viewing SOMEBODY ELSE'S profile
 * ⚠⚠ The owner and the non-buyer are the same account on two different pages, which is the
 * point: it proves the button is withheld for two DIFFERENT reasons, not one.
 *
 * ⚠⚠⚠ **THIS SUITE WRITES REAL ROWS** — a DRAFT work request and a shortlist line, which is
 * exactly what the brief asks to be counted. ⚠ No money moves: a draft commits nothing, has
 * no `WorkOrder` and no `Payment`, and nothing is posted or assigned.
 */
const OUT = join(process.cwd(), "e2e-e719", "shots");
const BUYER = "sw_user31@straterp.com";

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

async function counts() {
  const p = db();
  const [wr, soleDrafts, sl, sll] = await Promise.all([
    p.workRequest.count(),
    p.workRequest.count({ where: { status: "DRAFT", sole_sourced: true } }),
    p.shortlist.count(),
    p.shortlistLine.count(),
  ]);
  return { wr, soleDrafts, sl, sll };
}

/** The provider the buyer will hire — the richest profile, found at runtime. */
async function targetProvider() {
  const hit = await db().providerProfile.findFirst({
    where: { employers: { some: {} } },
    select: { id: true, person: { select: { id: true, first_name: true, last_name: true } } },
    orderBy: { employers: { _count: "desc" } },
  });
  return hit;
}

test("E719 — a buyer sees Hire; it creates ONE draft, and a second click reopens it", async ({
  browser,
}) => {
  const target = await targetProvider();
  expect(target, "no provider to hire").toBeTruthy();

  /*
    ── ⚠⚠⚠ THIS GATE HAS TO SURVIVE ITS OWN SECOND RUN ─────────────────────────────────

    ⚠ The first version asserted `after === before + 1` flat, which is true **only on a clean
    database**. ⚠⚠ **ON EVERY RE-RUN THE BUYER ALREADY HAS THE DRAFT THIS TEST CREATED, so the
    click correctly REOPENS it and the counts do not move — and the gate would have gone red
    on correct code, the second time anybody ran it.**
    ⚠⚠⚠ **RULING 10: a gate that fails on correct code is a gate someone switches off**, and
    this one would have started failing the day after it shipped.
    ⚠ So the expectation is chosen from the state: a buyer with no existing draft must GAIN
    one; a buyer who already has one must land on THAT one with nothing created. **Both
    branches assert; neither is a skip.**
  */
  const before = await counts();
  const priorDraft = await db().workRequest.findFirst({
    where: {
      status: "DRAFT",
      sole_sourced: true,
      buyer: { user: { email: BUYER } },
    },
    select: { id: true },
  });
  console.log(`\n══ E719 · ROW COUNTS BEFORE ══\n   ${JSON.stringify(before)}`);
  console.log(`   existing sole-sourced draft for this buyer: ${priorDraft?.id ?? "none"}`);
  const expectCreate = !priorDraft;

  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signInAsSeeded(page, BUYER);
  await page.goto(`/providers/${target!.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  /* ⚠ The button, its style, and its POSITION — Scott asked for "first of the actions". */
  const hire = page.locator("[data-e719-hire]");
  await expect(hire, "a buyer does not see Hire").toHaveCount(1);
  const layout = await page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { top: Math.round(r.top + window.scrollY), bg: s.backgroundColor, color: s.color };
    };
    const rail = document.querySelector(".pm-cp3-rail");
    const headings = [...(rail?.querySelectorAll("h3") ?? [])].map((h) => ({
      text: (h.textContent ?? "").trim(),
      top: Math.round(h.getBoundingClientRect().top + window.scrollY),
    }));
    return { hire: box("[data-e719-hire]"), headings };
  });
  console.log(`E719  Hire button: ${JSON.stringify(layout.hire)}`);
  console.log(`E719  rail headings in paint order: ${layout.headings.map((h) => h.text).join(" → ")}`);

  /* ⚠⚠ SOLID INK — the same fill the profile's own primary uses. */
  expect(layout.hire!.bg, "Hire is not solid ink").toBe("rgb(39, 35, 52)");
  expect(layout.hire!.color, "Hire does not have white text").toBe("rgb(255, 255, 255)");
  /* ⚠⚠⚠ FIRST OF THE ACTIONS: above both Message and Connect as a Colleague. */
  const order = layout.headings.map((h) => h.text);
  const iHire = order.indexOf("Hire");
  expect(iHire, "no Hire heading on the rail").toBeGreaterThanOrEqual(0);
  for (const later of ["Connect as a Colleague", "Message"]) {
    const j = order.indexOf(later);
    if (j >= 0) expect(iHire, `Hire is not above "${later}"`).toBeLessThan(j);
  }
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "buyer-rail.png") });

  /* ── the click ── */
  await hire.click();
  await page.waitForURL(/\/work-requests\/[0-9a-f-]+/, { timeout: 30_000 });
  const firstUrl = page.url();
  const firstId = firstUrl.split("/work-requests/")[1].split(/[?#]/)[0];
  console.log(`E719  landed on: /work-requests/${firstId}`);
  await page.screenshot({ path: join(OUT, "buyer-landed.png") });

  const after1 = await counts();
  const d = expectCreate ? 1 : 0;
  console.log(
    `══ E719 · AFTER ONE CLICK ══\n   ${JSON.stringify(after1)}  (expected delta ${d} — ` +
      `${expectCreate ? "created" : "reopened an existing draft"})`
  );
  expect(after1.wr, "work request count moved by the wrong amount").toBe(before.wr + d);
  expect(after1.soleDrafts, "sole-sourced draft count moved by the wrong amount").toBe(
    before.soleDrafts + d
  );
  expect(after1.sl, "shortlist count moved by the wrong amount").toBe(before.sl + d);
  expect(after1.sll, "shortlist line count moved by the wrong amount").toBe(before.sll + d);
  if (!expectCreate) {
    expect(firstId, "a reopen landed somewhere other than the existing draft").toBe(
      priorDraft!.id
    );
  }

  /* ⚠⚠ THE ROW ITSELF, NOT JUST THE COUNT — a count can move for the wrong reason. */
  const row = await db().workRequest.findUnique({
    where: { id: firstId },
    select: { status: true, sole_sourced: true, buyer_person_id: true },
  });
  const line = await db().shortlistLine.findFirst({
    where: { provider_person_id: target!.person.id },
    select: { source: true, provider_person_id: true },
    orderBy: { created_at: "desc" },
  });
  console.log(`E719  WR row:   ${JSON.stringify(row)}`);
  console.log(`E719  SL line:  ${JSON.stringify(line)}`);
  expect(row?.status).toBe("DRAFT");
  expect(row?.sole_sourced, "sole_sourced was not written").toBe(true);
  expect(line?.provider_person_id, "the shortlist names the wrong provider").toBe(
    target!.person.id
  );
  expect(line?.source, "the line is not an ADDED row").toBe("ADDED");

  /* ── ⚠⚠⚠ THE SECOND CLICK. One draft, not two. ── */
  await page.goto(`/providers/${target!.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  await page.locator("[data-e719-hire]").click();
  await page.waitForURL(/\/work-requests\/[0-9a-f-]+/, { timeout: 30_000 });
  const secondId = page.url().split("/work-requests/")[1].split(/[?#]/)[0];
  const after2 = await counts();
  console.log(`E719  second click landed on: /work-requests/${secondId}`);
  console.log(`══ E719 · AFTER TWO CLICKS ══\n   ${JSON.stringify(after2)}`);
  expect(secondId, "the second click created a DIFFERENT request").toBe(firstId);
  expect(after2.wr, "the second click created another work request").toBe(after1.wr);
  expect(after2.sll, "the second click added another shortlist line").toBe(after1.sll);

  await page.close();
});

test("E719 — the owner previewing their own profile sees no Hire", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page); // the gate persona: a provider
  const own = await page.evaluate(async () => {
    const r = await fetch("/api/me");
    const j = await r.json();
    return j?.providerProfile?.id ?? null;
  });
  expect(own, "the gate persona has no provider profile").toBeTruthy();
  await page.goto(`/providers/${own}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const n = await page.locator("[data-e719-hire]").count();
  console.log(`\nE719  OWNER preview /providers/${String(own).slice(0, 8)}… → Hire buttons: ${n}`);
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "owner-rail.png") }).catch(() => {});
  await page.screenshot({ path: join(OUT, "owner-page.png") });
  expect(n, "the owner is offered Hire on their own profile").toBe(0);
  await page.close();
});

test("E719 — a non-buyer sees no Hire on someone else's profile", async ({ browser }) => {
  const target = await targetProvider();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page); // provider, is_service_buyer = false
  await page.goto(`/providers/${target!.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const n = await page.locator("[data-e719-hire]").count();
  console.log(`E719  NON-BUYER on /providers/${target!.id.slice(0, 8)}… → Hire buttons: ${n}`);
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "nonbuyer-rail.png") });
  expect(n, "a non-buyer is offered Hire").toBe(0);

  /* ⚠⚠⚠ AND THE ROUTE REFUSES THEM TOO — the UI decides what is drawn, never who may act.
     Without this, "no button" would be the whole security story. */
  const res = await page.evaluate(async (pid: string) => {
    const r = await fetch("/api/work-requests/sole-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerPersonId: pid }),
    });
    return { status: r.status, body: await r.text() };
  }, target!.person.id);
  console.log(`E719  non-buyer POSTs anyway → ${res.status} ${res.body.slice(0, 80)}`);
  expect(res.status, "a non-buyer could create a sole-sourced request by hand").toBe(403);
  await page.close();
});
