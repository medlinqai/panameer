import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * ── ⚠⚠ THE TRIPWIRE (`P1-J1-E041`) ─────────────────────────────────────────
 *
 * `/work` prints `0 Work Orders` and `0 Settlement Requests`, and `/shop` prints
 * `0 Work Orders`, because NEITHER MODEL EXISTS. Those zeros are TRUE today.
 *
 * ⚠⚠ THE PROBLEM THIS SOLVES IS NOT TODAY, IT IS THE DAY AFTER `WorkOrder` SHIPS.
 * A hardcoded `0` still reads `0` then, the tiles still look right, and nothing in
 * the build complains. A comment cannot fail; this can.
 *
 * ⚠ SO THIS TEST FAILS WHEN THE WORLD IMPROVES. That is the design, not a bug. It
 * asserts the two models are ABSENT from `prisma/schema.prisma`, and the moment
 * either is added it goes red with the exact files to edit.
 * ⚠ DO NOT "FIX" A FAILURE HERE BY DELETING THE TEST OR LOOSENING THE MATCH. The
 * fix is to replace the stub with the real count and then delete BOTH the stub and
 * this assertion — in that order.
 *
 * ⚠ STATIC ONLY. Reads the schema off disk; no network, no database, no login.
 */

const SCHEMA = "prisma/schema.prisma";

/** ⚠ ANCHORED TO `model X {` — a comment or a field mentioning the name must not trip it. */
function modelExists(src: string, model: string): boolean {
  return new RegExp(`^model\\s+${model}\\s*\\{`, "m").test(src);
}

/*
 * ── ⚠⚠ THE TRIPWIRE FIRED, AND IT HAS BEEN RETIRED (`P1-J4-E388`, 2026-09-07) ─
 *
 * `model WorkOrder` and `model SettlementRequest` landed, this assertion went RED
 * on the same run, and it named the three files to edit and the order:
 *   1. `unbuilt-counters.ts` — delete the stubs
 *   2. `work-stats.ts` and `shop-stats.ts` — real `.count()` queries
 *   3. delete this assertion — it has done its job
 * All three are done, in that order, which is why this is a comment and not a
 * test. ⚠ IT WAS NOT DELETED TO GO GREEN — the stub was replaced first, and the
 * counts are real.
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED, because the PATTERN is the valuable part:
 *
 *     test("WorkOrder and SettlementRequest are still absent — the stubbed 0s
 *           are still true", () => {
 *       expect(modelExists(src, model), "⚠⚠ `model X` NOW EXISTS … SO THE
 *              STUBBED `0` IS NOW A LIE").toBe(false);
 *     });
 *
 * ⚠⚠ THE SECOND TEST BELOW SURVIVES AND STILL EARNS ITS PLACE: it asserts the
 * two stats modules no longer import a stub, so a future placeholder cannot
 * quietly reappear in the tiles this tripwire was built to protect.
 */
test.describe("⚠ TRIPWIRE — the stubbed counters (P1-J1-E041)", () => {

  /*
    ⚠⚠ THE REPLACEMENT INVARIANT. The old assertion checked the stubs were still
    literally `0` — *"if someone sets a stub to a non-zero placeholder this
    catches it. An invented number on a public page is the thing
    `decisions-01.md` bans outright."* THE STUBS ARE GONE, so that exact check
    cannot run; the DANGER IT GUARDED HAS NOT GONE ANYWHERE.

    This is the same guard aimed at the same risk from the other side: the two
    stats modules must read the DATABASE and must not import a placeholder. It
    fails if a hardcoded counter ever returns to either tile — which is Scott's
    LOCKED rule (2026-08-27): *"a real count of what is in the database, seeded
    rows included, or a number Scott specifies. Count it and print it."*
  */
  test("the /work and /shop tiles COUNT — no stub can return to them", () => {
    for (const mod of ["src/lib/work-stats.ts", "src/lib/shop-stats.ts"]) {
      /* ⚠ COMMENTS STRIPPED BEFORE SCANNING — the house rule these harnesses
         follow, and it matters here: both modules QUOTE their superseded design,
         which names `unbuilt-counters.ts` in prose. A raw scan reads the history
         as if it were the code. */
      const src = readFileSync(mod, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
      expect(
        /unbuilt-counters/.test(src),
        `${mod} must not import a stubbed counter — the tiles read the database`
      ).toBe(false);
      expect(
        /prisma\.workOrder\.count\(\)/.test(src),
        `${mod} must count WorkOrder rows rather than print a constant`
      ).toBe(true);
    }
    const work = readFileSync("src/lib/work-stats.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    expect(
      /prisma\.settlementRequest\.count\(\)/.test(work),
      "work-stats.ts must count SettlementRequest rows"
    ).toBe(true);
  });
});
