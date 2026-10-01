import { test, expect, type Page } from "@playwright/test";
import { prisma } from "../src/lib/prisma";

/**
 * ── ⚠⚠⚠ THE STATISTICS ASSERTIONS ONLY A RENDER CAN MAKE (`E603` WS-C) ───
 *
 * ⚠ Ported from `scripts/check-stats-live.ts`, which is superseded and kept on
 * disk (`E164`). **The assertions are unchanged in substance.** What changed is
 * that this one can run inside `npm run sweep` — the old one needed a server on
 * :3199 that nothing starts, so it reddened environmentally every run and
 * proved nothing.
 *
 * ── ⚠⚠ SEEDING, AND WHY IT IS NOT A RESEED ──────────────────────────────
 *
 * ⚠ Scott: *"A gate writing and removing its own rows is not a reseed — scoped
 * teardown, and it removes exactly what it wrote."*
 * ⚠⚠ TEARDOWN IS BY PRIMARY KEY, collected as each row is written, in an
 * `afterAll` that runs whether the assertions passed or failed. A describing
 * `where` could match a row this run did not create.
 */

const PASSWORD = "Panameer123";
const PERSONA = "sw_user17@straterp.com";

const wroteInvites: string[] = [];
const wroteConnections: string[] = [];

async function signIn(page: Page, email: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(800);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 4 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASSWORD, { delay: 4 });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
}

/**
 * ⚠⚠ EVERY FIGURE, INCLUDING THE ONES ON HIDDEN FLIP FACES — a hidden face's
 * figure is still one the page renders, a gesture away.
 * ⚠ `textContent`, NOT `innerText`: `innerText` is render-aware and returns ""
 * for a `visibility: hidden` node, so every hidden figure would vanish and the
 * sweep would pass over nothing (`E586`).
 */
const SWEEP = `(() => {
  const isFigure = (t) => /^(\\u2014|\\$?[\\d,]+(\\.\\d+)?%?)$/.test(t);
  const out = [];
  for (const el of document.querySelectorAll("p,span,strong,div,td")) {
    if (el.children.length) continue;
    const t = (el.textContent || "").trim();
    if (!t || !isFigure(t)) continue;
    let label = "", n = el;
    for (let i = 0; i < 4 && n && !label; i++) {
      n = n.parentElement; if (!n) break;
      const ts = [...n.querySelectorAll("p,span,strong,dt,h2,h3")]
        .filter((x) => !x.children.length)
        .map((x) => (x.textContent || "").trim())
        .filter((x) => x && !isFigure(x));
      if (ts.length) label = ts[0];
    }
    out.push({
      value: t, label: label.slice(0, 44),
      where: el.closest(".pm-hive") ? "hive" : el.closest("[data-gauge]") ? "gauge" : el.closest(".pm-flip") ? "card" : "old",
      cell: el.closest(".pm-hive-cell")?.dataset.cell ?? null,
      /* ⚠ \`E732\` — the gauge grid replaced the cards, so the sweep has to see it. */
      /* ⚠ E732 — the gauge grid replaced the cards, so the sweep has to see it.
         ⚠⚠⚠ ONLY THE **HEADLINE** FIGURE CARRIES THE KEY. A gauge card holds four numbers
         — the scale's 0, the value, and two sub-figures — and find() takes the FIRST in
         document order, which is the SCALE. ⚠ That made §2 compare the comb's real figure
         against a literal 0 on every card, and it only surfaced because one persona had a
         non-zero count. ⚠⚠ TWO ZEROS AGREE (ruling 11), so on an empty persona it would
         have passed while comparing nothing. */
      gauge: el.closest(".pm-gauge-value")
        ? el.closest("[data-gauge]")?.dataset.gauge ?? null
        : null,
    });
  }
  return out;
})()`;

type Row = { value: string; label: string; where: string; cell: string | null; gauge: string | null };

test.beforeAll(async () => {
  const person = await prisma.person.findFirst({
    where: { user: { email: PERSONA } },
    select: { id: true, user_id: true },
  });
  if (!person?.user_id) throw new Error("the fixture persona was not found");

  /* ⚠ An invitation dated 15 JANUARY — outside the 13-week window, inside YTD.
     That is what makes the two periods genuinely disagree; on live data every
     dated row was created this month. */
  const longAgo = new Date(new Date().getFullYear(), 0, 15);
  const seeded = await prisma.colleagueInvite.create({
    data: {
      inviter_person_id: person.id,
      invitee_email: `e603-gate-${Date.now()}@example.seed`,
      token_hash: `e603-gate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      expires_at: new Date(Date.now() + 86_400_000),
      status: "PENDING",
      created_at: longAgo,
    },
    select: { id: true },
  });
  wroteInvites.push(seeded.id);

  /* ⚠⚠ **TWO** COLLEAGUES, NOT ONE. With one, `Colleagues` and `Invites Sent`
     were both 1 — and a cell pointed at the WRONG FIELD still drew the right
     number. Two zeros agree; so do two ones. At two they are distinguishable. */
  const counterparts = await prisma.user.findMany({
    where: { email: { in: ["sw_user16@straterp.com", "sw_user15@straterp.com"] } },
    select: { id: true },
  });
  if (counterparts.length !== 2) throw new Error("the counterpart personas were not found");
  for (const c of counterparts) {
    const conn = await prisma.connection.create({
      data: { from_user_id: person.user_id, to_user_id: c.id, kind: "COLLEAGUE", status: "ACCEPTED" },
      select: { id: true },
    });
    wroteConnections.push(conn.id);
  }
});

test.afterAll(async () => {
  /* ⚠⚠⚠ BY PRIMARY KEY, AND IN A TEARDOWN THAT RUNS ON FAILURE TOO. A gate
     that leaves rows behind when it fails poisons the next run. */
  if (wroteConnections.length) {
    const r = await prisma.connection.deleteMany({ where: { id: { in: wroteConnections } } });
    if (r.count !== wroteConnections.length) {
      throw new Error(`teardown removed ${r.count} of ${wroteConnections.length} connections`);
    }
  }
  if (wroteInvites.length) {
    const r = await prisma.colleagueInvite.deleteMany({ where: { id: { in: wroteInvites } } });
    if (r.count !== wroteInvites.length) {
      throw new Error(`teardown removed ${r.count} of ${wroteInvites.length} invitations`);
    }
  }
});

test("§1 no figure renders as both a number and a dash", async ({ page }) => {
  await signIn(page, PERSONA);
  await page.goto("/usage", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const rows: Row[] = await page.evaluate(SWEEP);
  expect(rows.length, "the sweep found figures to check (E586)").toBeGreaterThan(5);

  const kinds = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.label) continue;
    const k = kinds.get(r.label) ?? new Set<string>();
    k.add(r.value === "—" ? "dash" : "number");
    kinds.set(r.label, k);
  }
  const both = [...kinds].filter(([, k]) => k.size > 1).map(([l]) => l);
  expect(both, `these render as BOTH a number and a dash: ${both.join(" · ")}`).toEqual([]);
});

/*
  ── ⚠⚠⚠ RE-POINTED FROM THE CARDS TO THE GAUGES (`P2-A1.1-E732`) ──────────────────────

  ⚠ **THE RULE IS UNCHANGED AND IS THE WHOLE REASON `lib/usage-areas.ts` EXISTS: the comb
  and the thing beside it read ONE value.** ⚠⚠ What changed is WHICH thing sits beside it —
  `E732` removed the four stat cards from `/usage` and the gauges are what the comb now has
  to agree with. ⚠⚠⚠ **`check:rollup`'s CASE (THE MECHANISM CHANGED), NOT
  `check:cert-skills`' (THE CODE DRIFTED)** — the distinction Scott enforces.

  ⚠ **IT IS STRONGER THAN IT WAS**, because it now pairs by KEY rather than by a
  hand-written label map: every comb cell is matched to the gauge with the same
  `data-gauge`, so a renamed label cannot silently drop a pair out of the comparison.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the old label pairs:
  //   ["profile", "Profile Views"], ["network", "Colleagues"],
  //   ["learning", "Lessons Completed"], ["work", "Work Orders"],
*/
test("§2 the cell and its gauge read one value", async ({ page }) => {
  await signIn(page, PERSONA);
  await page.goto("/usage", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const rows: Row[] = await page.evaluate(SWEEP);

  const cellKeys = [...new Set(rows.filter((r) => r.cell).map((r) => r.cell!))];
  expect(cellKeys.length, "the sweep found comb cells to check (E586)").toBeGreaterThan(3);

  let compared = 0;
  for (const key of cellKeys) {
    const cellRow = rows.find((r) => r.cell === key);
    /* ⚠⚠ THE GAUGE'S **HEADLINE** FIGURE, NOT ITS SUB-FIGURES. ⚠ A gauge card carries
       three numbers; only the first is the one the comb mirrors, and matching on "any
       number in this card" would pass on the wrong one. */
    const gaugeRow = rows.find((r) => r.gauge === key);
    if (!cellRow || !gaugeRow) continue;
    compared++;
    expect(cellRow.value, `cell "${key}" vs gauge "${key}"`).toBe(gaugeRow.value);
  }
  /* ⚠⚠⚠ EVERY CELL WAS ACTUALLY COMPARED. Without this the loop could compare nothing
     and pass — `E586`'s family, and the reason this line has always been here. */
  expect(compared, "every honeycomb cell was compared to its gauge (E586)").toBe(cellKeys.length);

  /* ⚠⚠⚠ AND THE COMPARISON MUST BITE. Pointing a cell at a different field passed this
     gate twice — first because every figure was 0, then because the fixture made both
     compared figures 1. ⚠ `Invites Sent` is a SUB-figure of the Connect gauge, so it is a
     real second value on the same card. */
  /* ⚠ The Connect gauge's HEADLINE (colleagues) against one of its own SUB-figures
     (invites sent). ⚠⚠ `gauge` is set only on the headline now, so the headline is found
     by key and the sub by its own label — two real values on one card. */
  const colleagues = rows.find((r) => r.gauge === "connect");
  const invites = rows.find((r) => r.where === "gauge" && r.label === "Invites Sent");
  expect(
    colleagues && invites,
    "the bite check found both figures to compare (E586)"
  ).toBeTruthy();
  expect(
    colleagues?.value,
    `the fixture must distinguish Colleagues from Invites Sent — got ${colleagues?.value} and ${invites?.value}`
  ).not.toBe(invites?.value);
});

/*
  ── ⚠⚠⚠ §3 AND §4 HAVE LOST THEIR SUBJECT (`P2-A1.1-E732`) ────────────────────────────

  ⚠ Both assert behaviour of the **`Your Network` CARD** — its credited front face and its
  trend back. ⚠⚠ **`E732` REMOVED THE FOUR STAT CARDS FROM `/usage` ON SCOTT'S
  INSTRUCTION**, and `StatisticsCards` renders on no other page, so **that card now renders
  nowhere.**

  ⚠⚠⚠ **THEY ARE SKIPPED, NOT DELETED AND NOT QUIETLY RE-POINTED.**
  · **Not deleted**, because the rules are real and the component is still on disk: a
    credited front must actually RENDER rather than merely be asserted, and a period
    control must reach the QUERY rather than only the pill. If the card comes back, these
    come back with it.
  · **Not re-pointed at the gauges**, because the gauges have **no flip, no back face and
    no credit line** — pointing these at them would be an assertion about a mechanism that
    does not exist there, which is the opposite of what §3 exists to prevent.
  · **Not left running**, because they would be RED on correct code, and ⚠ *"a gate that
    fails on correct code is a gate somebody switches off"* (ruling 10).

  ⚠⚠ **A SKIP IS VISIBLE AND A DELETION IS NOT.** Playwright reports these as `skipped`,
  so the count says plainly that two assertions are parked — rather than the suite
  shrinking by two and nobody noticing (`E586`'s family: a gate must never report success
  with no inputs).
  ⚠⚠⚠ **RECORDED FOR SCOTT: the `?trend=` and `?period=` links are now INERT on `/usage`.**
  `StatisticsCards`' trend links went with the cards, so the query string the WS-A redirect
  carefully preserves currently reaches nothing on this page. **That is a consequence of
  removing the cards, not a defect introduced by it — reported, not fixed.**
*/
test.skip("§3 the credited-front branch is RENDERED, not asserted — SUBJECT REMOVED by E732", async ({ page }) => {
  await signIn(page, PERSONA);
  await page.goto("/usage?period=90d", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const credit = await page.evaluate(() => {
    const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
      [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
    );
    if (!f) return null;
    const faces = f.querySelector(".pm-flip-faces")!;
    return (faces.children[1] as HTMLElement).textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(credit, "the network card was not found").not.toBeNull();
  expect(credit!, "the credit line must name what they did").toMatch(/1 invitation sent/);
  expect(credit!, "the empty branch must not be the one that ran").not.toMatch(
    /Nothing counted on this card yet/
  );
});

test.skip("§4 period windowing, on a seeded dated row — SUBJECT REMOVED by E732", async ({ page }) => {
  await signIn(page, PERSONA);
  const readBack = async (period: string) => {
    await page.goto(`/usage?trend=network&period=${period}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    /* ⚠⚠ CLICK, THEN WAIT, THEN READ — reading inside the same `evaluate` as
       the click reads the DOM React has not re-rendered yet. */
    await page.evaluate(() => {
      const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
        [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
      );
      if (f && (f as HTMLElement).dataset.showing === "front") {
        f.querySelector<HTMLButtonElement>(".pm-flip-toggle")?.click();
      }
    });
    await page.waitForTimeout(450);
    return page.evaluate(() => {
      const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
        [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
      );
      if (!f) return null;
      const faces = f.querySelector(".pm-flip-faces")!;
      const vis = [...faces.children].find(
        (c) => getComputedStyle(c).visibility !== "hidden"
      ) as HTMLElement | undefined;
      const svg = vis?.querySelector("svg[role='img']");
      const text = vis?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return { kind: svg ? "trend" : /Invite a Colleague/.test(text) ? "action" : "other" };
    });
  };
  const d90 = await readBack("90d");
  const ytd = await readBack("ytd");
  /* ⚠ A row dated in January is OUTSIDE 90 days, so there is no history and the
     data picks the ACTION back — not an empty trend. Inside YTD it draws. */
  expect(d90?.kind, "90 days should have no history to draw").toBe("action");
  expect(ytd?.kind, "year-to-date should draw a line").toBe("trend");
  expect(d90?.kind, "the two periods must disagree — live data cannot show this").not.toBe(
    ytd?.kind
  );
});
