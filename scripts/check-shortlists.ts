/**
 * `check:shortlists` — one table for suggested and shortlisted, a re-run replaces only
 * what the search wrote, and **no path to a work order requires a row**
 * (`P2-A8-E703`, rulings 94e / 93b). `npm run check:shortlists`.
 *
 * ── ⚠⚠ WHAT IT ASSERTS (11) ─────────────────────────────────────────────────
 *
 *  1. ⚠⚠⚠ **A RE-RUN REPLACES `SUGGESTED` ROWS AND LEAVES `SHORTLISTED` AND `ADDED`
 *     UNTOUCHED** — proved live, both directions. Deleting a kept row would throw away a
 *     choice a human made (`E552`/`E553`: a save must not delete what it did not create).
 *  2. ⚠⚠⚠ **NO PATH TO A WORK ORDER REQUIRES A SHORTLIST ROW (93b).** Scott: *"they will
 *     not shortlist…they will add them to the WR."* ⚠ Asserted as an **ABSENCE over the
 *     order path**, because a gate that demanded one would break the commonest path and
 *     would be asserting the wrong thing (ruling 11).
 *  3. ⚠ One table, not two — `source` carries the distinction, and the enum has exactly
 *     three values. A fourth is a workflow and needs a ruling.
 *  4. ⚠⚠ The default is `ADDED`, which is **the safe failure**: a row whose origin nobody
 *     recorded must not become eligible for wholesale deletion.
 *  5. ⚠ `proposal_id` stays nullable — a suggestion has no proposal behind it.
 *
 * ── ⚠⚠ SCOPE (91) · SUBJECT (92) · DIRECTION (90) ───────────────────────────
 *
 * ⚠ STATIC: the schema and `src/lib/shortlists.ts`, comments stripped (rule 12).
 * ⚠⚠ LIVE: it creates **its own work request, shortlist and three lines**, one of each
 * source, re-runs the replace, and **deletes exactly what it created by id.** Row counts
 * are taken before and after. ⚠ Inputs asserted first, so *"0 failures"* cannot mean
 * *"nothing was tested"* (`E586`).
 * ⚠⚠⚠ **NO UI IS ASSERTED — the shortlist UI is explicitly out of scope in the brief.**
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
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/\/?.*$/gm, (_m, i) => i);

/* ═══ 0 · INPUTS (92) ══════════════════════════════════════════════════════ */
const LIB = join("src", "lib", "shortlists.ts");
const SCHEMA = join("prisma", "schema.prisma");
check("0 — the shortlist library exists where this guard expects it", existsSync(LIB), LIB);
check("0 — and is not empty", existsSync(LIB) && statSync(LIB).size > 0);
const lib = existsSync(LIB) ? strip(readFileSync(LIB, "utf8")) : "";
const schema = existsSync(SCHEMA) ? strip(readFileSync(SCHEMA, "utf8")) : "";
check("0 — stripping comments left live code", lib.trim().length > 400, `${lib.trim().length} chars`);
const lineModel = (/model ShortlistLine \{[\s\S]*?\n\}/.exec(schema) ?? [""])[0];

/* ═══ 1 · ONE TABLE, THREE SOURCES ═════════════════════════════════════════ */
check("1 — `ShortlistLine` is in the schema", lineModel.length > 0);
check(
  "1 — ⚠ the source enum has EXACTLY three values — a fourth is a workflow",
  /enum ShortlistLineSource \{\s*SUGGESTED\s*SHORTLISTED\s*ADDED\s*\}/.test(schema)
);
check(
  "1 — ⚠⚠ it defaults to ADDED — the SAFE failure, never eligible for a sweep",
  /source ShortlistLineSource @default\(ADDED\)/.test(lineModel),
  "a default of SUGGESTED would make an unrecorded row deletable"
);
check(
  "1 — ⚠ `proposal_id` stays NULLABLE — a suggestion has no proposal behind it",
  /proposal_id\s+String\? @db\.Uuid/.test(lineModel)
);
check(
  "1 — the pair stays unique, so one provider cannot appear twice on one list",
  /@@unique\(\[shortlist_id, provider_person_id\]\)/.test(lineModel)
);
/* ⚠⚠ ONE TABLE — a second model for the same shape is the defect this avoids. */
check(
  "1 — ⚠⚠ ABSENCE: no separate SuggestedProvider model was created (one shape, one table)",
  !/model Suggested\w*Provider/.test(schema),
  "two tables for one shape is two queries, two grids and two places to fix every bug"
);

/* ═══ 2 · THE DELETE IS SCOPED ═════════════════════════════════════════════ */
check(
  "2 — ⚠⚠⚠ the re-run's delete is scoped to source SUGGESTED, never bare",
  /deleteMany\(\{\s*where:\s*\{\s*shortlist_id:[^}]*source:\s*"SUGGESTED"/.test(lib),
  "a save must never delete data it did not create (E552/E553)"
);
check(
  "2 — and it is scoped to THIS shortlist as well as to the source",
  /deleteMany\(\{\s*where:\s*\{\s*shortlist_id:/.test(lib)
);
check(
  "2 — the replace runs in one transaction — a half-replaced list is a wrong list",
  /\$transaction\(/.test(lib)
);
check(
  "2 — ⚠ every entry point resolves its person from the SESSION",
  /user_id:\s*viewer\.userId/.test(lib) && !/input\.(personId|buyerPersonId)/.test(lib)
);

/* ═══ 3 · ⚠⚠⚠ 93b — THE ORDER PATH MUST NOT REQUIRE A SHORTLIST ═══════════ */
/*
  ⚠⚠ AN ABSENCE, AND IT IS THE MOST IMPORTANT ASSERTION HERE. The defect would arrive as
  an addition: somebody making selection or checkout read the shortlist "to be safe".
  ⚠ Call shapes named (96): `prisma.shortlist*`, `tx.shortlist*`, and the TYPE.
*/
const ORDER_PATH = ["selection.ts", "work-orders.ts", "sourcing.ts", "work-request.ts"].map((f) =>
  join("src", "lib", f)
);
const SHORTLIST_SHAPES = /(?:prisma|tx)\.shortlist\w*\.|\bShortlistLine\b|\bShortlist\b|shortlist_id/;
for (const f of ORDER_PATH) {
  check(`3 — the order-path file \`${f}\` exists to be checked`, existsSync(f), f);
  const code = existsSync(f) ? strip(readFileSync(f, "utf8")) : "";
  check(
    `3 — ⚠⚠⚠ ABSENCE: \`${f}\` never touches a Shortlist (93b — it is OPTIONAL)`,
    !SHORTLIST_SHAPES.test(code),
    "no path to a work order may require a row in this table"
  );
}
check(
  "3 — MUTATION: that scan WOULD catch an order-path read",
  SHORTLIST_SHAPES.test("const s = await tx.shortlistLine.findMany();") &&
    SHORTLIST_SHAPES.test("if (!shortlist_id) throw new Error();")
);

/* ═══ 4 · LIVE — THE REPLACE RULE, BOTH DIRECTIONS ═════════════════════════ */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const before = {
    shortlists: await prisma.shortlist.count(),
    lines: await prisma.shortlistLine.count(),
    requests: await prisma.workRequest.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  /*
    ⚠⚠ THE BUYER MUST HAVE A `user_id`, BECAUSE THE LIBRARY IS DRIVEN THROUGH A VIEWER AND
    A VIEWER IS AN ACCOUNT. ⚠ The first attempt picked on `is_service_buyer` alone and the
    person it found had no account — **the gate said so by name instead of skipping the
    live half silently**, which is the whole point of asserting the fixture (`E586`).
  */
  const buyer = await prisma.person.findFirst({
    where: { is_service_buyer: true, NOT: { user_id: null } },
    select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
  });
  const providers = await prisma.person.findMany({ take: 4, select: { id: true } });
  check("4 — a buyer with a p-account exists", buyer?.company?.p_account_id != null);
  check("4 — at least 4 people exist to stand as providers", providers.length >= 4);
  if (!buyer?.company?.p_account_id || providers.length < 4) return;

  let wrId: string | null = null;
  try {
    const wr = await prisma.workRequest.create({
      data: {
        buyer_person_id: buyer.id,
        p_account_id: buyer.company.p_account_id,
        status: "DRAFT",
        proposal_access: "INVITE_ONLY",
      },
      select: { id: true },
    });
    wrId = wr.id;
    const sl = await prisma.shortlist.create({
      data: {
        shortlist_number: `SL-GATE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        work_request_id: wr.id,
        created_by_person_id: buyer.id,
      },
      select: { id: true },
    });
    /* one of each source — the whole point is that they behave differently */
    await prisma.shortlistLine.createMany({
      data: [
        { shortlist_id: sl.id, line_number: 1, provider_person_id: providers[0].id, source: "SUGGESTED" },
        { shortlist_id: sl.id, line_number: 2, provider_person_id: providers[1].id, source: "SHORTLISTED" },
        { shortlist_id: sl.id, line_number: 3, provider_person_id: providers[2].id, source: "ADDED" },
      ],
    });
    check("4 — the fixture was created: one SUGGESTED, one SHORTLISTED, one ADDED", true);

    /* ⚠⚠⚠ THE RE-RUN. Only the SUGGESTED row may go. */
    const { replaceSuggestions } = await import("@/lib/shortlists");
    const viewerUserId = buyer.user_id;
    check("4 — the buyer has a user account, so the library can be driven", viewerUserId != null);
    if (viewerUserId) {
      await replaceSuggestions(
        { userId: viewerUserId } as never,
        wr.id,
        [{ providerPersonId: providers[3].id, note: "re-run" }]
      );
      const after = await prisma.shortlistLine.findMany({
        where: { shortlist_id: sl.id },
        select: { provider_person_id: true, source: true },
      });
      const bySrc = (s: string) => after.filter((r) => r.source === s).map((r) => r.provider_person_id);
      check(
        "4 — ⚠⚠⚠ the SHORTLISTED row SURVIVED the re-run",
        bySrc("SHORTLISTED").includes(providers[1].id),
        JSON.stringify(after.map((r) => r.source))
      );
      check(
        "4 — ⚠⚠⚠ the ADDED row SURVIVED the re-run",
        bySrc("ADDED").includes(providers[2].id)
      );
      check(
        "4 — ⚠⚠ the OLD SUGGESTED row was REPLACED, not kept",
        !after.some((r) => r.provider_person_id === providers[0].id),
        "a suggestion is a snapshot (94e)"
      );
      check(
        "4 — ⚠ and the new suggestion landed as SUGGESTED",
        bySrc("SUGGESTED").includes(providers[3].id)
      );
    }
  } finally {
    /* ⚠⚠ BY ID, INNERMOST FIRST. The shortlist and its lines cascade from the request. */
    if (wrId) {
      const sls = await prisma.shortlist.findMany({ where: { work_request_id: wrId }, select: { id: true } });
      if (sls.length) await prisma.shortlistLine.deleteMany({ where: { shortlist_id: { in: sls.map((s) => s.id) } } });
      await prisma.shortlist.deleteMany({ where: { work_request_id: wrId } });
      await prisma.workRequest.deleteMany({ where: { id: wrId } });
    }
  }

  const after = {
    shortlists: await prisma.shortlist.count(),
    lines: await prisma.shortlistLine.count(),
    requests: await prisma.workRequest.count(),
    payments: await prisma.payment.count(),
    paymentLines: await prisma.paymentLine.count(),
  };
  check(
    "4 — ⚠⚠ the gate left nothing behind",
    after.shortlists === before.shortlists && after.lines === before.lines && after.requests === before.requests,
    `shortlists ${before.shortlists}→${after.shortlists}, lines ${before.lines}→${after.lines}, requests ${before.requests}→${after.requests}`
  );
  check(
    "4 — ⚠⚠⚠ NO MONEY MOVED",
    after.payments === before.payments && after.paymentLines === before.paymentLines,
    `Payment ${before.payments}→${after.payments}, PaymentLine ${before.paymentLines}→${after.paymentLines}`
  );
}

live()
  .catch((e) => failures.push(`4 — the live half threw instead of asserting: ${(e as Error).message}`))
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`\ncheck:shortlists — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:shortlists — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ NOTE: no UI is asserted — the shortlist UI is out of scope in the brief.");
  });
