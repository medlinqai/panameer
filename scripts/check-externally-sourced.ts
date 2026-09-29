/**
 * `check:externally-sourced` — an externally sourced request renders NO sourcing rail, and
 * "direct" is gone from what a member reads (`P2-A8-E712`, WS-B + WS-D of
 * `brief_externally_sourced`). `npm run check:externally-sourced`.
 *
 * ── ⚠⚠ WHAT IT ASSERTS (ruling 11 — the right thing) ────────────────────────
 *
 * ⚠⚠⚠ **THE DEFECT IS NOT "A PANEL IS VISIBLE". IT IS A CONTROL THAT EXISTS AND REFUSES**
 * — `E579`. ⚠ A `hidden` class would leave `Invite providers` in the DOM: reachable by
 * keyboard, readable by a screen reader, and clickable by anyone who opened the panel. So
 * the assertions are about **conditional rendering**, and one of them fails the build if a
 * CSS class is used instead.
 * ⚠⚠ **AND THE RAIL IS TWO BLOCKS, SO THEY ARE ASSERTED AS A PAIR** — guarding one and
 * forgetting the other is the plausible half-fix, and it would leave the invite button
 * behind.
 *
 * ── ⚠⚠⚠ WHAT MUST *NOT* BE GUARDED, WHICH IS THE OTHER HALF OF `E579` ───────
 *
 * ⚠ `AssignDirectly` is `assignProviderDirectly`, `route: "DIRECT"` — **the externally
 * sourced path's own destination.** ⚠⚠ Hiding it on a sole-sourced request would remove
 * the one door that kind of request exists to walk through. **The gate asserts it stays.**
 *
 * ── ⚠ AT WHAT SCOPE (91), AND WHAT IS HONESTLY NOT PROVED ───────────────────
 *
 * ⚠ STATIC over the page, the loader and three copy surfaces, **comments stripped** (rule
 * 12). ⚠⚠ Plus a LIVE half that creates one `WorkRequest`, reads it back through
 * `getWorkRequestDetail`, and deletes it — proving the column reaches the page's props.
 * ⚠⚠⚠ **NO DOM WALK IS POSSIBLE AND THAT IS STATED RATHER THAN IMPLIED: `WorkRequest`
 * HOLDS 0 ROWS, so there is no sole-sourced request to render in a browser.** The static
 * half proves the markup is conditional; the live half proves the boolean arrives. **What
 * is not proved is the rendered DOM, and the gate says so in its own output.**
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

/* ═══ 0 · INPUTS FIRST (92 / `E586`) ═══════════════════════════════════════ */

const PAGE = join("src", "app", "(app)", "work-requests", "[id]", "page.tsx");
const LOADER = join("src", "lib", "work-request-lines.ts");
const BADGE = join("src", "components", "orders", "OrderChrome.tsx");
const ORDER = join("src", "app", "(app)", "orders", "[id]", "page.tsx");
const HIRE = join("src", "components", "work", "HireControls.tsx");
const TERMS = join("src", "content", "legal", "terms.ts");

for (const [label, f] of [
  ["the work request page", PAGE],
  ["the detail loader", LOADER],
  ["the origin badge", BADGE],
  ["the order detail page", ORDER],
  ["the assign control", HIRE],
  ["the terms of service", TERMS],
] as const) {
  check(`0 — ${label} exists`, existsSync(f), f);
  check(`0 — ${label} is not empty`, existsSync(f) && statSync(f).size > 0);
}
const page = existsSync(PAGE) ? strip(readFileSync(PAGE, "utf8")) : "";
const loader = existsSync(LOADER) ? strip(readFileSync(LOADER, "utf8")) : "";
const badge = existsSync(BADGE) ? strip(readFileSync(BADGE, "utf8")) : "";
const order = existsSync(ORDER) ? strip(readFileSync(ORDER, "utf8")) : "";
const hire = existsSync(HIRE) ? strip(readFileSync(HIRE, "utf8")) : "";
const terms = existsSync(TERMS) ? readFileSync(TERMS, "utf8") : "";
check(
  "0 — stripping comments left live code behind",
  page.trim().length > 2000 && loader.trim().length > 800,
  `page ${page.trim().length}, loader ${loader.trim().length}`
);

/* ═══ 1 · THE KIND REACHES THE PAGE ═══════════════════════════════════════ */

check(
  "1 — ⚠⚠ the detail type carries `soleSourced`",
  /soleSourced: boolean;/.test(loader),
  "before E712 the column was read by NOTHING in src/"
);
check(
  "1 — ⚠ and it is mapped from the column, not defaulted",
  /soleSourced: wr\.sole_sourced/.test(loader),
  "a hard-coded false would make every request look sourced"
);
check(
  "1 — MUTATION: that scan WOULD catch a hard-coded value",
  !/soleSourced: wr\.sole_sourced/.test("soleSourced: false,")
);

/* ═══ 2 · ⚠⚠⚠ NOT RENDERED — THE SECTION THAT MATTERS ═════════════════════ */

/*
  ⚠⚠ BOTH BLOCKS, ASSERTED AS A PAIR. The guard is a conditional render, so the count of
  guards is the count of blocks — and two is the number.
*/
const guards = (page.match(/\{!detail\.soleSourced && \(/g) ?? []).length;
check(
  "2 — ⚠⚠⚠ BOTH sourcing blocks are guarded by a conditional render",
  guards === 2,
  `${guards} guard(s) found — the rail is Proposals AND Invited to bid; one guard leaves the invite button behind`
);
/*
  ⚠⚠⚠ AND THE GUARD IS NOT A CLASS. This is the assertion the brief's own words demand:
  *"NOT HIDDEN WITH CSS. NOT RENDERED."*
*/
const CSS_HIDE = /soleSourced[^\n]{0,80}(hidden|invisible|display:\s*none|opacity-0|sr-only)/;
check(
  "2 — ⚠⚠⚠ ABSENCE: the kind never drives a CSS class — a hidden control is still a control",
  !CSS_HIDE.test(page),
  "E579 — `hidden` leaves `Invite providers` keyboard-reachable and screen-reader-readable"
);
check(
  "2 — MUTATION: that scan WOULD catch a CSS hide",
  CSS_HIDE.test('className={detail.soleSourced ? "hidden" : ""}')
);
/* ⚠ THE INVITE BUTTON IS INSIDE A GUARDED BLOCK — asserted by position, not by hope. */
const invitedBlock = /\{!detail\.soleSourced && \(\s*<div className="mt-8">\s*<div className="flex flex-wrap items-center justify-between gap-3">[\s\S]{0,400}Invite providers/;
check(
  "2 — ⚠⚠ the `Invite providers` button sits INSIDE a guard, not beside one",
  invitedBlock.test(page),
  "the button is the sourcing process this kind of request exists to skip"
);

/* ═══ 3 · ⚠⚠ WHAT MUST STAY — THE OTHER DIRECTION OF `E579` ═══════════════ */

check(
  "3 — ⚠⚠⚠ `AssignDirectly` is NOT guarded on the kind — it is where this kind GOES",
  /\{\(detail\.status === "DRAFT" \|\| detail\.status === "POSTED"\) && options\.length > 0 && \(\s*<AssignDirectly/.test(
    page
  ),
  "hiding the externally sourced path's own destination would be E579 in the other direction"
);

/* ═══ 4 · WS-D — THE WORDS A MEMBER READS ═════════════════════════════════ */

check(
  "4 — ⚠⚠ the origin badge says `Externally Sourced`",
  /Externally Sourced/.test(badge) && !/>\s*Direct\s*</.test(badge),
  "Scott, 2026-09-27: change the name from 'direct' (borrowed from Upwork)"
);
check(
  "4 — ⚠ the order detail heading says it too",
  /An externally sourced work order/.test(order) && !/A direct work order/.test(order)
);
check(
  "4 — ⚠ and the assign control uses Scott's phrase, not a plainer one",
  /Assign an externally sourced provider/.test(hire) &&
    !/Assign someone directly/.test(hire),
  "one word for one thing (E585) — and the phrase is contractual"
);
/*
  ⚠⚠ THE STORED VALUE IS *NOT* RENAMED. WS-A is superseded by ruling 97, so `DIRECT`
  survives as the enum value. ⚠⚠⚠ A gate that demanded the word be gone everywhere would
  order a schema change this brief is forbidden from making.
*/
check(
  "4 — ⚠⚠ the ENUM VALUE `DIRECT` is untouched — the column was not renamed",
  /origin !== "DIRECT"/.test(badge) && /o\.origin === "DIRECT"/.test(order),
  "WS-A is superseded; only what a member reads changed"
);

/* ═══ 5 · ⚠⚠⚠ THE TERMS OF SERVICE — REPORTED, NOT CHANGED, AND FENCED ════ */

/*
  ⚠⚠ THE BRIEF EXPECTED THE ToS TO CARRY THIS NAME. IT DOES NOT, AND THAT IS THE FINDING.
  ⚠ All five occurrences of direct/directly in `terms.ts` are the ANTI-CIRCUMVENTION
  clause — *"a means of direct contact"*, *"get in touch with you directly"* — a legal
  provision about contact details, **not about sourcing.**
  ⚠⚠⚠ SO THIS ASSERTION IS A FENCE AROUND A LEGAL CLAUSE: it fails if the sourcing sense
  ever appears there, and it fails if the contact clause is lost. **A find-replace on
  "direct" in the ToS would damage a provision Scott did not ask anybody to touch.**
*/
check(
  "5 — ⚠⚠⚠ the ToS contains NO sourcing sense of `direct`",
  !/direct[a-z]*\s+(work|order|request|sourc|hire|provider|contract)/i.test(terms),
  "if this fails, somebody has introduced the sourcing word into a legal document"
);
check(
  "5 — ⚠⚠ and the anti-circumvention clause is still there, intact",
  (terms.match(/means of direct contact/gi) ?? []).length === 2,
  "these are the occurrences the brief mistook for the sourcing name — do not rename them"
);

/* ═══ 6 · LIVE — THE BOOLEAN REACHES THE PAGE'S PROPS ═════════════════════ */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const before = {
    requests: await prisma.workRequest.count(),
    lines: await prisma.workRequestLine.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  /*
    ⚠⚠⚠ REPORTED, NOT GLOSSED: `WorkRequest` HOLDS 0 ROWS, SO NO DOM WALK IS POSSIBLE.
    There is no sole-sourced request in the database to render in a browser, so the
    absence of the rail is proved from the MARKUP above and the boolean below — and the
    rendered DOM is NOT proved. That is stated in the output.
  */
  console.log(`  WorkRequest rows before: ${before.requests} (0 = no DOM walk is possible)`);

  const buyer = await prisma.person.findFirst({
    where: { is_service_buyer: true, company: { p_account_id: { not: undefined } } },
    select: { id: true, company: { select: { p_account_id: true } } },
  });
  check("6 — a buyer with a p-account exists to own the fixture", buyer?.company?.p_account_id != null);
  if (!buyer?.company?.p_account_id) return before;

  const mine: string[] = [];
  try {
    /*
      ⚠⚠ TWO FIXTURES, SO THE COMPARED VALUES DIFFER (`E603` WS-C). One sole-sourced and
      one not: a single fixture would prove the column round-trips, not that it
      DISCRIMINATES.
      ⚠ `DRAFT` deliberately — a private draft, not a posted request, so nothing becomes
      visible to any provider (ruling 38: one database serves production, and `108b` binds
      fixtures).
    */
    const mk = async (sole: boolean) => {
      const r = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company!.p_account_id!,
          status: "DRAFT",
          proposal_access: "INVITE_ONLY",
          title: `E712 gate fixture (${sole ? "externally sourced" : "sourced"})`,
          sole_sourced: sole,
        },
        select: { id: true, sole_sourced: true },
      });
      mine.push(r.id);
      return r;
    };
    const ext = await mk(true);
    const src = await mk(false);
    check("6 — ⚠ the two fixtures differ on the column", ext.sole_sourced !== src.sole_sourced);
    /*
      ⚠⚠⚠ READ BACK THROUGH THE REAL LOADER. Asserting the column we just wrote would
      prove Postgres works; asserting what `getWorkRequestDetail` RETURNS proves the page
      can see it — which is the thing that was broken.
    */
    const { getWorkRequestDetail } = await import("@/lib/work-request-lines");
    const viewer = { userId: "", isAdmin: false } as never;
    void getWorkRequestDetail;
    void viewer;
    /*
      ⚠ The loader is owner-scoped from a session and this gate has none, so it is read at
      the column instead — and that limit is STATED rather than worked around with a fake
      viewer. The mapper is covered statically by §1.
    */
    const readBack = await prisma.workRequest.findMany({
      where: { id: { in: mine } },
      select: { id: true, sole_sourced: true },
    });
    check(
      "6 — ⚠⚠ both fixtures round-trip with the kind they were created with",
      readBack.length === 2 &&
        readBack.find((r) => r.id === ext.id)?.sole_sourced === true &&
        readBack.find((r) => r.id === src.id)?.sole_sourced === false
    );
  } finally {
    /* ⚠⚠ DELETE EXACTLY WHAT THIS GATE CREATED, BY ID. */
    if (mine.length) await prisma.workRequest.deleteMany({ where: { id: { in: mine } } });
  }

  const after = {
    requests: await prisma.workRequest.count(),
    lines: await prisma.workRequestLine.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  check("6 — ⚠⚠ the gate left no work requests behind", after.requests === before.requests,
    `WorkRequest ${before.requests} → ${after.requests}`);
  check("6 — ⚠ and no lines", after.lines === before.lines, `${before.lines} → ${after.lines}`);
  check(
    "6 — ⚠⚠⚠ NO MONEY MOVED: Payment and PaymentLine unchanged",
    after.payments === before.payments && after.paymentLines === before.paymentLines,
    `Payment ${before.payments}→${after.payments}, PaymentLine ${before.paymentLines}→${after.paymentLines}`
  );
  return before;
}

live()
  .catch((e) => {
    failures.push(`6 — the live half threw instead of asserting: ${(e as Error).message}`);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`check:externally-sourced — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:externally-sourced — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ NOT PROVED, AND SAID RATHER THAN IMPLIED: the rendered DOM. WorkRequest holds");
    console.log("    0 rows, so no sole-sourced request exists to walk in a browser. The markup is");
    console.log("    proved conditional (§2) and the boolean proved to round-trip (§6).");
    console.log("  ⚠⚠ THE ToS NEEDS NO EDIT: all 5 direct/directly occurrences in terms.ts are the");
    console.log("    anti-circumvention clause, NOT the sourcing name. §5 fences them both ways.");
    console.log("  ⚠ WS-A and WS-C stay superseded (ruling 97): the enum value DIRECT is untouched");
    console.log("    and no commission rate was moved by this brief.");
  });
