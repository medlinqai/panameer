/**
 * `check:stats-live` — the assertions only a RENDER can make (`P2-A2-E603` WS-C).
 * `npm run check:stats-live`.
 *
 * ── ⚠⚠⚠ WHY THIS EXISTS AND `check:statistics` DOES NOT COVER IT ─────────
 *
 * ⚠ `check:statistics` reads SOURCE. It can prove that a figure is computed
 * once and that a cell reads a card's field. ⚠⚠ IT CANNOT PROVE THAT TWO DRAWN
 * NUMBERS ARE THE SAME NUMBER, and it cannot exercise a branch no seeded
 * persona reaches.
 * ⚠⚠⚠ ASSERTING A BRANCH NOBODY HAS SEEN IS `E586`'s SHAPE — a gate reporting
 * success over inputs that never existed. Scott, 2026-09-23: *"The credited-
 * front branch is seeded and rendered, not merely asserted."*
 *
 * ── ⚠⚠⚠ SEEDING, AND WHY IT IS NOT A RESEED ──────────────────────────────
 *
 * ⚠ SCOTT: *"A gate writing and removing its own rows is not a reseed —
 * scoped teardown, and it removes exactly what it wrote."*
 * ⚠⚠ THE TEST-WINDOW FREEZE FORBIDS `npm run seed:*` AND ANY RESET. It does not
 * forbid this gate creating the handful of rows it needs and deleting **those
 * rows, by id**, afterwards.
 * ⚠⚠⚠ THE TEARDOWN IS BY PRIMARY KEY, COLLECTED AS EACH ROW IS WRITTEN — never
 * by a `where` that describes the rows, because a describing delete can match
 * something it did not create. That is the `wipe:connection-graph` discipline.
 * ⚠⚠ IT RUNS IN A `finally`, so a failed assertion still cleans up. A gate that
 * leaves rows behind on failure is a gate that poisons the next run.
 *
 * ── ⚠⚠ WHAT IT SEEDS, AND WHY EACH ROW IS NEEDED ─────────────────────────
 *
 * ⚠ **The credited-front persona.** Measured 2026-09-23: no seeded seller has
 * "some counted activity AND no history" — all 14 sampled are either all-zero
 * (action back, face up) or have invite history (trend back), so `creditLine`'s
 * non-empty branch never runs on live data.
 * ⚠ **A DATED row outside the 13-week window.** Every dated row in the database
 * was created this month, so `90 Days` and `YTD` cannot be told apart on live
 * data by anything except bucket arithmetic. One row dated in January makes the
 * two periods genuinely different.
 */
import { chromium, type Page } from "playwright";
import { prisma } from "@/lib/prisma";

const BASE = process.env.STATS_LIVE_BASE ?? "http://localhost:3199";
const PASSWORD = "Panameer123";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ⚠⚠ EVERY ID THIS GATE WRITES, COLLECTED AS IT WRITES IT. */
const wroteInvites: string[] = [];
const wroteConnections: string[] = [];

async function signIn(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
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
 * ⚠⚠⚠ THE PAGE SWEEP — EVERY FIGURE, INCLUDING THE ONES ON HIDDEN FLIP FACES.
 * ⚠ A hidden face's figure is still a figure the page renders, one gesture
 * away. A sweep that read only the visible faces would miss exactly the
 * duplicates a flip introduces, which is how `Proposals Sent` came to render as
 * both `0` and a dash without anybody noticing.
 * ⚠⚠ `textContent`, NOT `innerText`: `innerText` is render-aware and returns ""
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
      n = n.parentElement;
      if (!n) break;
      const ts = [...n.querySelectorAll("p,span,strong,dt,h2,h3")]
        .filter((x) => !x.children.length)
        .map((x) => (x.textContent || "").trim())
        .filter((x) => x && !isFigure(x));
      if (ts.length) label = ts[0];
    }
    const flip = el.closest(".pm-flip");
    out.push({
      value: t,
      label: label.slice(0, 44),
      where: el.closest(".pm-hive") ? "hive" : flip ? "card" : "old",
      cell: el.closest(".pm-hive-cell")?.dataset.cell ?? null,
    });
  }
  return out;
})()`;

async function main() {
  const browser = await chromium.launch();
  try {
    /* ── the persona, chosen BY SHAPE from the database ──────────────────── */
    const person = await prisma.person.findFirst({
      where: { user: { email: "sw_user17@straterp.com" } },
      select: { id: true, user_id: true, user: { select: { email: true } } },
    });
    if (!person?.user_id) throw new Error("the fixture persona was not found");

    /* ⚠⚠ MEASURED BEFORE, SO THE GATE KNOWS WHAT IT CHANGED. */
    const before = await prisma.colleagueInvite.count({
      where: { inviter_person_id: person.id },
    });
    check(
      "0 — ⚠⚠ the persona starts with no invitations, so the branch is genuinely unreached (E586)",
      before === 0,
      `${before} existing invitations`
    );

    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, person.user!.email);

    /* ── 3 · THE CREDITED-FRONT BRANCH, SEEDED AND RENDERED ──────────────── */
    /**
     * ⚠ The shape that no live persona has: counted activity (colleagues > 0
     * via an ACCEPTED invitation) with NO history in the trend window — so the
     * card shows its FRONT, and its back is the ACTION back carrying a real
     * credit line rather than "Nothing counted on this card yet."
     * ⚠⚠ THE INVITE IS DATED **OUTSIDE THE 13-WEEK WINDOW**, which is what
     * makes the series empty while the figure is not.
     */
    const longAgo = new Date(new Date().getFullYear(), 0, 15);
    const seeded = await prisma.colleagueInvite.create({
      data: {
        inviter_person_id: person.id,
        /* ⚠ `invitee_email`, not `email` — the column name, read off the schema
           rather than guessed. ⚠⚠ `example.seed` IS ON `UNDELIVERABLE_DOMAINS`,
           so even if something later tried to mail this row, the transport
           refuses it: a gate's fixture must never be able to send real mail. */
        invitee_email: `e603-gate-${Date.now()}@example.seed`,
        /* ⚠ Required, unique, and never used — the invitation is never sent. */
        token_hash: `e603-gate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        expires_at: new Date(Date.now() + 86_400_000),
        status: "PENDING",
        created_at: longAgo,
      },
      select: { id: true },
    });
    wroteInvites.push(seeded.id);

    /*
      ── ⚠⚠⚠ A COLLEAGUE, BECAUSE AN INVITATION IS NOT A HONEYCOMB HEADLINE ──

      ⚠ FOUND BY MUTATION, NOT BY REVIEW: pointing a cell at a different field
      passed the gate, because every compared figure was `0` and any two zeros
      agree. ⚠⚠ SEEDING THE INVITATION DID NOT FIX IT — `Invites Sent` is a CARD
      row, not one of the four honeycomb HEADLINES (`Profile Views`,
      `Colleagues`, `Lessons Completed`, `Work Orders`), so the comparison was
      still four zeros against four zeros.
      ⚠⚠⚠ THIS ROW RAISES `Colleagues` TO 1, WHICH IS WHAT MAKES A MIS-POINTED
      CELL VISIBLE. The vacuity guard below fails if it ever stops doing so.
      ⚠ A mutual COLLEAGUE row also touches the counterpart's figures while it
      exists; the teardown removes it by id, so that is measured in seconds and
      reversed exactly.
    */
    /*
      ⚠⚠⚠ **TWO** COLLEAGUES, NOT ONE, AND THE SECOND ONE IS NOT PADDING.
      ⚠ WITH ONE, `Colleagues` AND `Invites Sent` WERE BOTH 1 — so a cell
      pointed at the WRONG FIELD still drew the right number, and the mutation
      passed the gate twice running. ⚠⚠ TWO ZEROS AGREE; SO DO TWO ONES.
      ⚠⚠⚠ AT TWO, `Colleagues` = 2 AND `Invites Sent` = 1, so the two fields are
      DISTINGUISHABLE and a mis-pointed cell is visible. **A fixture has to make
      the values it compares differ, or the comparison is decoration.**
    */
    const counterparts = await prisma.user.findMany({
      where: { email: { in: ["sw_user16@straterp.com", "sw_user15@straterp.com"] } },
      select: { id: true },
    });
    if (counterparts.length !== 2) throw new Error("the counterpart personas were not found");
    for (const c of counterparts) {
      const conn = await prisma.connection.create({
        data: {
          from_user_id: person.user_id,
          to_user_id: c.id,
          kind: "COLLEAGUE",
          status: "ACCEPTED",
        },
        select: { id: true },
      });
      wroteConnections.push(conn.id);
    }
    check(
      "3 — ⚠ the gate recorded every id it wrote, for teardown by primary key",
      wroteInvites.length === 1,
      wroteInvites[0]
    );


    /* ── 1 · NO FIGURE RENDERS AS BOTH A NUMBER AND A DASH ───────────────── */
    await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const rows: { value: string; label: string; where: string; cell: string | null }[] =
      await page.evaluate(SWEEP);
    check("1 — ⚠ the sweep found figures to check (E586)", rows.length > 5, `${rows.length} figures`);

    const kinds = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.label) continue;
      const k = kinds.get(r.label) ?? new Set<string>();
      k.add(r.value === "—" ? "dash" : "number");
      kinds.set(r.label, k);
    }
    const both = [...kinds].filter(([, k]) => k.size > 1).map(([l]) => l);
    check(
      "1 — ⚠⚠⚠ no figure renders as both a number and a dash",
      both.length === 0,
      both.length ? `both: ${both.join(" · ")}` : `${kinds.size} distinct labels`
    );

    /* ── 2 · THE CELL AND THE CARD READ ONE VALUE ────────────────────────── */
    /**
     * ⚠⚠⚠ THE HONEYCOMB'S EXEMPTION FROM "no figure is computed twice" IS THAT
     * IT READS THE SAME OBJECT. ⚠ Scott: *"the exemption is narrow and
     * asserted, not assumed: the gate proves the cell and the card read the
     * same value, rather than skipping them."*
     * ⚠⚠ ASSERTED ON THE DRAWN NUMBERS — the one thing source-reading cannot do.
     */
    const pairs: [string, string][] = [
      ["profile", "Profile Views"],
      ["network", "Colleagues"],
      ["learning", "Lessons Completed"],
      ["work", "Work Orders"],
    ];
    let compared = 0;
    for (const [cell, cardLabel] of pairs) {
      const cellRow = rows.find((r) => r.cell === cell);
      /* ⚠⚠ MATCHED BY LABEL ANYWHERE OUTSIDE THE HIVE, NOT BY `where === "card"`.
         ⚠⚠⚠ `Your Profile` AND `Teaching` PASS `back={null}`, AND `FlipCard`
         THEN RETURNS THE BARE FRONT WITH NO `.pm-flip` WRAPPER — correctly, by
         `E579`: no back, no control. So their figures are not "in a flip card"
         at all, and keying on that classification silently dropped one of the
         four pairs while the count still read 3. */
      const cardRow = rows.find((r) => r.where !== "hive" && r.label === cardLabel);
      if (!cellRow || !cardRow) {
        /* ⚠⚠ SAY WHICH SIDE WAS MISSING. A silent `continue` is how a coverage
           hole hides inside a passing count (`E586`). */
        console.log(
          `      (not compared: ${cell} — cell ${cellRow ? "found" : "MISSING"}, card "${cardLabel}" ${cardRow ? "found" : "MISSING"})`
        );
        continue;
      }
      compared++;
      check(
        `2 — ⚠⚠ cell "${cell}" and card "${cardLabel}" draw one value`,
        cellRow.value === cardRow.value,
        `${cellRow.value} vs ${cardRow.value}`
      );
    }
    check(
      "2 — ⚠⚠ every honeycomb cell was actually compared to its card (E586)",
      compared === pairs.length,
      `${compared}/${pairs.length} compared`
    );
    /*
      ⚠⚠⚠ AND AT LEAST ONE COMPARED PAIR MUST BE NON-ZERO, OR THE COMPARISON
      PROVES NOTHING. ⚠ FOUND BY MUTATION, NOT BY REVIEW: pointing a cell at a
      DIFFERENT field passed this gate, because every figure on the page was
      `0` and any two zeros agree. ⚠⚠ THAT IS `E586`'s SHAPE WEARING A PASSING
      COUNT — four comparisons ran, all of them vacuous.
      ⚠⚠⚠ THE SEED NOW RUNS **BEFORE** THE SWEEP so `Invites Sent` is 1 while
      its neighbours are 0, which is what makes a mis-pointed cell visible.
    */
    const nonZero = pairs
      .map(([cell]) => rows.find((r) => r.cell === cell))
      .filter((r) => r && r.value !== "0" && r.value !== "\u2014");
    check(
      "2 — ⚠⚠⚠ at least one compared figure is non-zero, so the comparison bites",
      nonZero.length > 0,
      nonZero.length ? `${nonZero.map((r) => `${r!.cell}=${r!.value}`).join(", ")}` : "every figure was 0 — this proves nothing"
    );

    /*
      ⚠⚠⚠ AND THE NEIGHBOURING FIGURE MUST DIFFER FROM IT. ⚠ Non-zero is not
      enough: with `Colleagues` = 1 and `Invites Sent` = 1, a cell pointed at
      the wrong one of the two still drew the right number. ⚠⚠ THIS IS THE
      GUARD THAT MAKES MUTATION 2 FAIL — it fails the gate if the fixture ever
      stops distinguishing the two fields it exists to tell apart.
    */
    const colleaguesRow = rows.find((r) => r.where !== "hive" && r.label === "Colleagues");
    const invitesRow = rows.find((r) => r.where !== "hive" && r.label === "Invites Sent");
    check(
      "2 — ⚠⚠⚠ the fixture makes Colleagues and Invites Sent DIFFERENT numbers",
      !!colleaguesRow && !!invitesRow && colleaguesRow.value !== invitesRow.value,
      `Colleagues=${colleaguesRow?.value} · Invites Sent=${invitesRow?.value}`
    );


    await page.goto(`${BASE}/stats?period=90d`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const credit = await page.evaluate(() => {
      const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
        [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
      );
      if (!f) return null;
      const faces = f.querySelector(".pm-flip-faces")!;
      return {
        showing: (f as HTMLElement).dataset.showing,
        backText: (faces.children[1] as HTMLElement).textContent?.replace(/\s+/g, " ").trim() ?? "",
      };
    });
    check(
      "3 — ⚠⚠⚠ the credit line is RENDERED, not asserted — it names what they did",
      !!credit && /1 invitation sent/.test(credit.backText),
      credit ? credit.backText.slice(0, 90) : "no network card"
    );
    check(
      "3 — ⚠⚠ …and it no longer says nothing was counted",
      !!credit && !/Nothing counted on this card yet/.test(credit.backText),
      "the empty branch is not the one that ran"
    );

    /* ── 4 · PERIOD WINDOWING, ON A SEEDED DATED ROW ─────────────────────── */
    /**
     * ⚠⚠⚠ THIS IS THE ASSERTION LIVE DATA CANNOT MAKE. Every dated row in the
     * database was created THIS MONTH, so `90 Days` and `YTD` cover the same
     * rows and draw the same line. ⚠ The seeded row is dated **15 January**, so
     * it falls OUTSIDE the 13-week window and INSIDE year-to-date.
     * ⚠⚠ THE PROOF IS THAT THE TWO PERIODS DISAGREE ABOUT THE SAME MEMBER IN
     * THE SAME MINUTE — which is exactly what a working window does and what a
     * period control that only moves a pill cannot.
     */
    /**
     * ⚠⚠⚠ WHAT WINDOWING ACTUALLY LOOKS LIKE HERE, MEASURED RATHER THAN ASSUMED.
     * ⚠ The first version of this assertion expected an EMPTY TREND at 90 days.
     * ⚠⚠ IT IS NOT AN EMPTY TREND — it is NO TREND: with nothing in the window
     * the data picks the ACTION back, which is the rule the cards have carried
     * since correction 3. **The gate was asserting a shape the design does not
     * produce.**
     * ⚠⚠⚠ THE DISAGREEMENT IS STILL THE PROOF, AND IT IS STRONGER: the same
     * member, in the same minute, gets a card with NO history at 90 days and a
     * drawn line at year-to-date. Live data cannot show that, because every
     * dated row in the database was created this month.
     */
    const readBack = async (period: string) => {
      await page.goto(`${BASE}/stats?trend=network&period=${period}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      /* ⚠⚠ CLICK, THEN **WAIT**, THEN READ. The first version clicked and read
         inside one `evaluate`, so it read the DOM React had not re-rendered yet
         and reported the FRONT face as if it were the back. */
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
        return {
          showing: (f as HTMLElement).dataset.showing,
          kind: svg ? "trend" : /Invite a Colleague/.test(text) ? "action" : "other",
          points: svg ? svg.querySelectorAll("circle").length : 0,
          label: svg?.getAttribute("aria-label") ?? null,
          text: text.slice(0, 80),
        };
      });
    };
    const d90 = await readBack("90d");
    const ytd = await readBack("ytd");
    check(
      "4 — ⚠⚠⚠ a row dated in January falls OUTSIDE 90 days — no history, so no trend",
      !!d90 && d90.showing === "back" && d90.kind === "action",
      d90 ? `${d90.kind} back · ${d90.text}` : "no back face"
    );
    check(
      "4 — ⚠⚠⚠ …and INSIDE year-to-date — a drawn line, same member, same minute",
      !!ytd && ytd.kind === "trend" && /1 in total/.test(ytd.label ?? ""),
      ytd ? `${ytd.kind} back · ${ytd.points} points · ${ytd.label}` : "no back face"
    );
    check(
      "4 — ⚠⚠ the two periods genuinely disagree, which live data cannot show",
      !!d90 && !!ytd && d90.kind !== ytd.kind,
      `90d=${d90?.kind} vs ytd=${ytd?.kind}`
    );

    await ctx.close();
  } finally {
    /*
      ⚠⚠⚠ SCOPED TEARDOWN — BY ID, NEVER BY A DESCRIBING `where`.
      ⚠ `deleteMany({ where: { email: { startsWith: "e603-gate-" } } })` would
      match rows this run did not write, including a row left by a crashed
      earlier run that somebody is mid-way through investigating.
      ⚠⚠ IN A `finally`, so a failed assertion still cleans up.
    */
    if (wroteConnections.length) {
      const removed = await prisma.connection.deleteMany({
        where: { id: { in: wroteConnections } },
      });
      console.log(`  teardown — removed ${removed.count} of ${wroteConnections.length} connections`);
      if (removed.count !== wroteConnections.length) {
        failures.push(`teardown removed ${removed.count} of ${wroteConnections.length} connections`);
      }
    }
    if (wroteInvites.length) {
      const removed = await prisma.colleagueInvite.deleteMany({
        where: { id: { in: wroteInvites } },
      });
      console.log(`\n  teardown — removed ${removed.count} of ${wroteInvites.length} written rows`);
      if (removed.count !== wroteInvites.length) {
        failures.push(`teardown removed ${removed.count} of ${wroteInvites.length}`);
      }
      const left = await prisma.colleagueInvite.count({ where: { id: { in: wroteInvites } } });
      if (left !== 0) failures.push(`${left} seeded rows survived teardown`);
    }
    await browser.close();
  }
}

main()
  .then(async () => {
    if (failures.length) {
      console.error(`\ncheck:stats-live — ${failures.length} FAILED, ${pass} passed\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:stats-live — ${pass}/${pass} passed`);
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("check:stats-live — ERRORED", e);
    process.exit(1);
  });
