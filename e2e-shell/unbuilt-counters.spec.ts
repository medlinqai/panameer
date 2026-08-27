import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  WORK_ORDERS_STUB,
  SETTLEMENT_REQUESTS_STUB,
} from "../src/lib/unbuilt-counters";

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

test.describe("⚠ TRIPWIRE — the stubbed counters (P1-J1-E041)", () => {
  test("WorkOrder and SettlementRequest are still absent — the stubbed 0s are still true", () => {
    const src = readFileSync(SCHEMA, "utf8");

    for (const [model, tile, where] of [
      ["WorkOrder", "Work Orders", "BOTH /work and /shop"],
      ["SettlementRequest", "Settlement Requests", "/work"],
    ] as const) {
      expect(
        modelExists(src, model),
        `⚠⚠ \`model ${model}\` NOW EXISTS IN ${SCHEMA}, SO THE STUBBED \`0\` ON ` +
          `${where} IS NOW A LIE.\n\n` +
          `   The tile "${tile}" is hardcoded to 0 and will keep printing 0 while the ` +
          `table fills up.\n\n` +
          `   TO FIX, IN THIS ORDER:\n` +
          `     1. src/lib/unbuilt-counters.ts — delete ${model === "WorkOrder" ? "WORK_ORDERS_STUB" : "SETTLEMENT_REQUESTS_STUB"}\n` +
          `     2. src/lib/work-stats.ts${model === "WorkOrder" ? " AND src/lib/shop-stats.ts" : ""} — ` +
          `replace it with prisma.${model[0].toLowerCase() + model.slice(1)}.count()\n` +
          `     3. delete this assertion — it has done its job\n\n` +
          `   ⚠ DO NOT delete or loosen this test to go green. Replace the stub first.`,
      ).toBe(false);
    }
  });

  test("the stubs are still literally 0, so the tiles and the tripwire agree", () => {
    /*
      ⚠ IF SOMEONE SETS A STUB TO A NON-ZERO "PLACEHOLDER" this catches it. An
      invented number on a public page is the thing `decisions-01.md` bans outright,
      and a stub is exactly where one would get typed in by accident.
    */
    expect(WORK_ORDERS_STUB, "WORK_ORDERS_STUB must be 0 — never an invented figure").toBe(0);
    expect(SETTLEMENT_REQUESTS_STUB, "SETTLEMENT_REQUESTS_STUB must be 0").toBe(0);
  });
});
