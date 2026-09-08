/**
 * `check:settle` — the rules the settlement surfaces cannot be allowed to lose
 * (`P1-J4-E394`). `npm run check:settle`.
 *
 * ── ⚠⚠ THE FOUR THINGS THIS BRIEF SAID IN CAPITALS ──────────────────────────
 *
 *   1. **ONE MODEL, ONE CREATE ENDPOINT, TWO RENDERINGS.** No `settlement_type`
 *      column, no second route, no branch on a request field.
 *   2. **THE RATE IS NOT EDITABLE** — copied from the order line, rendered as
 *      TEXT and not a disabled input, with the reason said out loud.
 *   3. **REJECT REQUIRES A REASON**, in the UI as well as the API.
 *   4. **THE PARTY RULE IS `E393`'s AND IT HOLDS HERE TOO** — asserted
 *      exhaustively, plus structurally over the component.
 *
 * ⚠ AND ONE THING THIS BRIEF FOUND. `assertSettlementDraw`'s rule 3 does not
 * accumulate within a batch, so the caller MUST aggregate per order line before
 * asserting. The timesheet grid is the first caller that can produce two drafts
 * against one line. That aggregation is asserted here so this path cannot
 * regress — see `createSettlement`'s docblock and the report.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { assertSettlementDraw, SpineError } from "@/lib/transaction-spine";
import { settlementActions } from "@/lib/settlements";
import type { OrderParty } from "@/lib/orders";
import { ROUTE_ACCESS } from "@/lib/route-access";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

type SourceFile = { path: string; text: string; code: string };
function walk(dir: string, out: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) {
      const text = readFileSync(full, "utf8");
      out.push({ path: relative(".", full), text, code: stripComments(text) });
    }
  }
  return out;
}
const SRC = walk("src");
const fileAt = (p: string) => SRC.find((f) => f.path === join(...p.split("/")));
const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8")
  .replace(/^\s*\/\/\/.*$/gm, "")
  .replace(/^\s*\/\/.*$/gm, "");

/* ═══ 1 · ⚠⚠ ONE MODEL, ONE CREATE ENDPOINT, TWO RENDERINGS ════════════════ */

check(
  "1 — SettlementRequest is one model",
  (SCHEMA.match(/^model SettlementRequest \{/gm) ?? []).length === 1
);
check(
  "1 — SettlementLine is one model",
  (SCHEMA.match(/^model SettlementLine \{/gm) ?? []).length === 1
);
/* ⚠⚠ THE COLUMN `E388` FORBIDS. It would be a second fact saying what `basis`
   already says, and two facts about one thing can disagree. */
check("1 — ABSENCE: no settlement_type column", !/settlement_type/.test(SCHEMA));
check("1 — ABSENCE: no settlement kind/type enum", !/enum Settlement(Type|Kind)/.test(SCHEMA));
/* ⚠ AND NO TIMESHEET MODEL. The other shape this could have taken is a parallel
   table for the RATE case, which is the same mistake with a different name. */
check(
  "1 — ABSENCE: no separate Timesheet model",
  !/^model (Timesheet|TimeEntry|TimesheetLine|Milestone[A-Za-z]*Claim)/m.test(SCHEMA)
);

/**
 * ⚠⚠ EXACTLY ONE CREATE ENDPOINT. The way a second one arrives is somebody
 * building `/api/timesheets` because the FORM looks different — and then two
 * paths write one table with two sets of rules.
 */
{
  const apiFiles = SRC.filter((f) => f.path.includes(join("app", "api", "settlements")));
  const creators = apiFiles.filter(
    (f) => /export async function POST/.test(f.code) && !/\[id\]/.test(f.path)
  );
  check("1 — the settlements API exists", apiFiles.length > 0);
  check(
    "1 — exactly ONE create endpoint",
    creators.length === 1,
    creators.map((c) => c.path).join(", ")
  );
  check(
    "1 — and it is POST /api/settlements",
    creators[0]?.path === join("src", "app", "api", "settlements", "route.ts")
  );
  /* ⚠ NO OTHER ROUTE ANYWHERE CREATES A SETTLEMENT. */
  const writers = SRC.filter(
    (f) =>
      f.path.includes(join("app", "api")) &&
      /prisma\.settlementRequest\.create/.test(f.code)
  );
  check(
    "1 — ABSENCE: no API route writes settlementRequest directly",
    writers.length === 0,
    writers.map((w) => w.path).join(", ")
  );
  const libWriters = SRC.filter((f) => /prisma\.settlementRequest\.create/.test(f.code));
  check(
    "1 — exactly one function in the tree creates a settlement",
    libWriters.length === 1 && libWriters[0].path === join("src", "lib", "settlements.ts"),
    libWriters.map((w) => w.path).join(", ")
  );
}
/* ⚠⚠ THE CREATE PATH DOES NOT BRANCH ON A REQUEST FIELD — the ORDER LINE's basis
   decides. A `body.type` or `body.kind` here would be the second model wearing a
   disguise. */
{
  const api = fileAt("src/app/api/settlements/route.ts");
  check(
    "1 — ABSENCE: the create endpoint reads no type/kind from the body",
    !!api && !/body\.(type|kind|settlementType|mode)/.test(api.code)
  );
  const lib = fileAt("src/lib/settlements.ts");
  check(
    "1 — the create path branches on the ORDER LINE's basis",
    !!lib && /ol\.basis === "RATE"/.test(lib.code)
  );
  check(
    "1 — ABSENCE: createSettlement takes no type parameter",
    !!lib && !/type:\s*["']?(RATE|AMOUNT|TIMESHEET|MILESTONE)/.test(lib.code)
  );
}
/* ⚠ ONE COMPONENT RENDERS BOTH, and it posts to the one endpoint. */
{
  const ui = fileAt("src/components/settle/RaiseSettlement.tsx");
  check("1 — one create component exists", !!ui);
  check(
    "1 — it renders a timesheet AND a milestone",
    !!ui && /TimesheetLine/.test(ui.code) && /MilestoneLine/.test(ui.code)
  );
  check(
    "1 — both renderings post to /api/settlements",
    !!ui && (ui.code.match(/fetch\("\/api\/settlements"/g) ?? []).length === 1
  );
  check(
    "1 — it branches on the order line's basis",
    !!ui && /l\.basis === "RATE"/.test(ui.code)
  );
  /* ⚠⚠ AN AMOUNT LINE HAS NO NUMBER INPUT — a quantity or amount field there
     invites a partial claim, which cannot exist. */
  const milestone = ui?.code.slice(ui.code.indexOf("function MilestoneLine")) ?? "";
  check(
    "1 — ABSENCE: the milestone rendering has no quantity or amount input",
    milestone.length > 0 && !/inputMode="decimal"/.test(milestone) && !/type="number"/.test(milestone)
  );
  check(
    "1 — the milestone rendering is a checkbox (in full or not at all)",
    /type="checkbox"/.test(milestone)
  );
}

/* ═══ 2 · THE RATE IS NOT EDITABLE, AND IT SAYS WHY ════════════════════════ */

{
  const ui = fileAt("src/components/settle/RaiseSettlement.tsx");
  check(
    "2 — the rate is shown with the reason it cannot be changed",
    !!ui && /the rate agreed on the work order/.test(ui.text)
  );
  check(
    "2 — the fixed amount says the same",
    !!ui && /the amount agreed on the work order/.test(ui.text)
  );
  /* ⚠⚠ TEXT, NOT A DISABLED INPUT. *"A silently-ignored input is worse than a
     disabled one"* — and a disabled input still reads as a box that could be
     enabled, so there is no input at all. */
  check(
    "2 — ABSENCE: there is no rate input, disabled or otherwise",
    !!ui && !/unitPrice|unit_price/i.test(ui.code.replace(/unitPriceCents/g, ""))
  );
  check(
    "2 — ABSENCE: no disabled input is used to fake read-only",
    !!ui && !/<input[^>]*disabled/.test(ui.code)
  );
  /* ⚠ AND THE PRICE IS NEVER SENT. The body carries quantity and a date; a price
     in it would be refused by `priceSettlementLine`, but it must not be there. */
  check(
    "2 — ABSENCE: the posted body carries no price",
    !!ui && !/unitPriceCents:\s*[^,}]*[,}]/.test(ui.code.slice(ui.code.indexOf("const lines = ["), ui.code.indexOf("const r = await fetch")))
  );
  const lib = fileAt("src/lib/settlements.ts");
  check(
    "2 — the price is copied by priceSettlementLine, the spine's own function",
    !!lib && /priceSettlementLine\(/.test(lib.code)
  );
  /**
   * ⚠ THE REAL PROOF IS THE INPUT TYPE, NOT A GREP FOR "price".
   *
   * ⚠ SUPERSEDED, quoted: this scanned for `/input\.\w*[Pp]rice|r\.unitPrice|r\.amount/`
   * and matched `r.amount_cents` inside `settledCentsFor`, where `r` is a
   * DATABASE ROW and not caller input. **The scan was measuring the wrong thing.**
   * `SettleLineInput` carrying no price field at all is the actual guarantee: a
   * price cannot be read from input that has nowhere to put one.
   */
  const inputType = lib?.code.match(/export type SettleLineInput = \{([\s\S]*?)\};/)?.[1] ?? "";
  check("2 — SettleLineInput was found", inputType.length > 0);
  check(
    "2 — ABSENCE: the caller's line input has no price field at all",
    inputType.length > 0 && !/price|amount|cents/i.test(inputType)
  );
  check(
    "2 — it carries only the date, the quantity and a note",
    /serviceDate/.test(inputType) && /quantity/.test(inputType) && /note/.test(inputType)
  );
  /* ⚠ REMAINING COUNTS DOWN AS THEY TYPE. */
  check("2 — remaining is shown per line", !!ui && /remaining on this line|remaining`/.test(ui.text));
}

/**
 * ⚠⚠ REMAINING IS `E393`'s, NOT A SECOND COMPUTATION.
 *
 * The brief: *"a second computation of remaining is exactly the
 * two-implementations-that-agree-today defect this stack has now avoided twice."*
 * `drawdownFor` already exposed both halves, so it needed no extension — and this
 * file must contain no arithmetic on `drawn_quantity`.
 */
{
  const lib = fileAt("src/lib/settlements.ts");
  check(
    "2 — settlements reads E393's drawdown",
    !!lib && /\.drawdown/.test(lib.code) && /remainingQuantity/.test(lib.code)
  );
  check(
    "2 — ABSENCE: settlements never subtracts drawn from ordered itself",
    !!lib && !/quantity\s*-\s*\w*[Dd]rawn|drawn_quantity\s*\)?\s*[-+]/.test(lib.code)
  );
  /* ⚠ COUNT THE COMPUTATION, NOT THE DECLARATION. `remainingQuantity:` appears
     twice in `orders.ts` — once in the `Drawdown` type and once where it is
     worked out — and only the second is a derivation. Counting both made the
     assertion fail on correct code, which is a scan measuring the wrong thing. */
  const dd = fileAt("src/lib/orders.ts");
  check(
    "2 — remaining is COMPUTED in exactly one place",
    !!dd && (dd.code.match(/remainingQuantity: Math\.max/g) ?? []).length === 1
  );
  /* ⚠ AND NOWHERE ELSE IN THE TREE. */
  const others = SRC.filter(
    (f) => f.path !== join("src", "lib", "orders.ts") && /remainingQuantity:\s*Math\.max|ordered\w*\s*-\s*drawn/i.test(f.code)
  );
  check(
    "2 — ABSENCE: nothing else computes remaining",
    others.length === 0,
    others.map((o) => o.path).join(", ")
  );
}

/* ═══ 3 · REJECT REQUIRES A REASON — IN THE UI AND AT THE BOUNDARY ═════════ */

{
  const ui = fileAt("src/components/settle/SettlementDecision.tsx");
  check("3 — the decision component exists", !!ui);
  /* ⚠⚠ REJECT OPENS A BOX; IT NEVER POSTS DIRECTLY. So there is no path from the
     button to a reasonless rejection. */
  check(
    "3 — the Reject button opens the reason box rather than posting",
    !!ui && /onClick=\{\(\) => setRejecting\(true\)\}/.test(ui.code)
  );
  check(
    "3 — the confirm button is disabled until a reason is typed",
    !!ui && /disabled=\{reason\.trim\(\)\.length < 3/.test(ui.code)
  );
  check(
    "3 — the field is marked required and says why",
    !!ui && /required/.test(ui.code) && /without a reason there is nothing for the provider to act on/i.test(ui.text)
  );
  const lib = fileAt("src/lib/settlements.ts");
  check(
    "3 — and the BOUNDARY refuses without one",
    !!lib && /note\.length < 3/.test(lib.code)
  );
  check(
    "3 — the refusal explains itself",
    !!lib && /without one the provider cannot answer it/.test(lib.text)
  );
  /* ⚠ AND THE REASON IS SHOWN BACK, prominently — otherwise requiring it is wasted. */
  const detail = fileAt("src/app/(app)/finances/payment-requests/[id]/page.tsx");
  check(
    "3 — a rejected request shows its reason",
    !!detail && /s\.status === "REJECTED"/.test(detail.code) && /decisionNote/.test(detail.code)
  );
}
/* ⚠⚠ AND APPROVAL SAYS WHAT IT MEANS — *"ACCEPTANCE MUST BE DEFINED."* */
{
  const ui = fileAt("src/components/settle/SettlementDecision.tsx");
  check(
    "3 — approval says it accepts the work",
    !!ui && /approving this payment request IS accepting the work/i.test(ui.text)
  );
  check(
    "3 — and the timesheet wording differs from the deliverable wording",
    !!ui && /signs off these hours as worked/i.test(ui.text)
  );
}

/* ═══ 4 · THE PARTY RULE — E393's, EXHAUSTIVE, AND STRUCTURAL ══════════════ */

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID"] as const;
const PARTIES: OrderParty[] = ["BUYER", "PROVIDER", "NONE"];
let combos = 0;
for (const status of STATUSES) {
  for (const party of PARTIES) {
    combos += 1;
    const actions = settlementActions({ status }, party);
    /* ⚠⚠ A PROVIDER NEVER DECIDES THEIR OWN CLAIM. */
    check(`4 — ${party} @ ${status}: a PROVIDER never gets APPROVE`, !(party === "PROVIDER" && actions.includes("APPROVE")));
    check(`4 — ${party} @ ${status}: a PROVIDER never gets REJECT`, !(party === "PROVIDER" && actions.includes("REJECT")));
    check(`4 — ${party} @ ${status}: a NON-PARTY gets nothing`, !(party === "NONE" && actions.length > 0));
  }
}
check("4 — every status × party combination was exercised", combos === 15, `${combos}`);
check(
  "4 — the BUYER decides a SUBMITTED request",
  settlementActions({ status: "SUBMITTED" }, "BUYER").join() === "APPROVE,REJECT"
);
check(
  "4 — a decided request offers the buyer nothing",
  settlementActions({ status: "APPROVED" }, "BUYER").length === 0 &&
    settlementActions({ status: "REJECTED" }, "BUYER").length === 0
);
/* ⚠⚠ THE STRUCTURAL HALF — `E393`'s pattern, followed rather than reinvented. */
{
  const ui = fileAt("src/components/settle/SettlementDecision.tsx");
  check(
    "4 — ABSENCE: the decision component never learns who is looking",
    !!ui && !/\bparty\b|isBuyer|isProvider|getSessionViewer|useSession/.test(ui.code)
  );
  check("4 — the buttons come from mapping the server's actions", !!ui && /actions\.map\(/.test(ui.code));
  check(
    "4 — it renders nothing at all when there is no action",
    !!ui && /if \(actions\.length === 0\) return null;/.test(ui.code)
  );
  /* ⚠ ABSENT, NOT DISABLED — no greyed Approve on a provider's screen. */
  const surfaces = SRC.filter(
    (f) =>
      (f.path.includes(join("components", "settle")) ||
        f.path.includes(join("app", "(app)", "finances")) ||
        f.path.includes(join("app", "(app)", "pay"))) &&
      f.path !== join("src", "components", "settle", "SettlementDecision.tsx")
  );
  const leaks = surfaces.filter((f) => /["'>]\s*(Approve|Reject)\b/.test(f.code));
  check(
    "4 — ABSENCE: no Approve/Reject label outside the decision component",
    leaks.length === 0,
    leaks.map((l) => l.path).join(", ")
  );
  const lib = fileAt("src/lib/settlements.ts");
  check(
    "4 — approve asks settlementActions rather than re-testing the party",
    !!lib && /settlementActions\(\{ status: current\.status \}, current\.party\)\.includes\("APPROVE"\)/.test(lib.code)
  );
  check(
    "4 — reject asks it too",
    !!lib && /settlementActions\(\{ status: current\.status \}, current\.party\)\.includes\("REJECT"\)/.test(lib.code)
  );
  /* ⚠ AND ONLY THE PROVIDER RAISES ONE. */
  check(
    "4 — only the provider can raise a settlement",
    !!lib && (lib.code.match(/o\.party !== "PROVIDER"/g) ?? []).length === 2
  );
}
/* ⚠ THE SETTLE LINK ON THE ORDER FOLLOWS THE SAME RULE. */
{
  const order = fileAt("src/app/(app)/orders/[id]/page.tsx");
  check(
    "4 — the Raise-a-payment-request link renders only for the provider on a RELEASED order",
    !!order && /o\.party === "PROVIDER" && o\.status === "RELEASED"/.test(order.code)
  );
}

/* ═══ 5 · THE BATCH-ACCUMULATION FOOTGUN, AND THE CALLER'S FIX ═════════════
   ⚠⚠ MEASURED: `assertSettlementDraw`'s rule 3 reads `orderLine.drawn_quantity`
   fresh for every draft, so five timesheet rows of 40 hours against a 100-hour
   line pass individually. The timesheet grid is the FIRST caller that can produce
   two drafts against one line. `createSettlement` aggregates per order line
   before asserting; this proves BOTH the hole and the fix. */

const ORDER = {
  status: "RELEASED",
  period_start: new Date("2026-10-01"),
  period_end: new Date("2026-12-31"),
  not_to_exceed_cents: null,
};
const OL = {
  id: "l1",
  basis: "RATE" as const,
  uom: "HOUR",
  quantity: 100,
  unit_price_cents: 15000,
  drawn_quantity: 0,
  drawn_amount_cents: 0,
};
const draw = (quantities: number[]) =>
  assertSettlementDraw({
    order: ORDER,
    periodStart: new Date("2026-10-01"),
    periodEnd: new Date("2026-10-05"),
    lines: quantities.map((q) => ({
      draft: { work_order_line_id: "l1", basis: "RATE" as const, quantity: q },
      orderLine: OL,
    })),
    alreadySettledCents: 0,
  });

check(
  "5 — the spine still accepts un-aggregated drafts that overdraw (the hole is real)",
  (() => {
    try {
      draw([40, 40, 40, 40, 40]);
      return true;
    } catch {
      return false;
    }
  })(),
  "⚠ if this now FAILS, E388 was hardened — remove the caller-side aggregation note and this assertion"
);
check(
  "5 — and it refuses the SAME draw once aggregated (the fix works)",
  (() => {
    try {
      draw([200]);
      return false;
    } catch (e) {
      return (e as SpineError).code === "RATE_OVERDRAW";
    }
  })()
);
{
  const lib = fileAt("src/lib/settlements.ts");
  /* ⚠ THE AGGREGATION, ASSERTED — so this path cannot regress into passing
     per-row drafts straight through. */
  check(
    "5 — createSettlement aggregates per order line before asserting",
    !!lib && /byOrderLine\.set\(r\.workOrderLineId, cur\)/.test(lib.code)
  );
  check(
    "5 — one draft per ORDER LINE reaches the spine",
    !!lib && /for \(const \[workOrderLineId, agg\] of byOrderLine\)/.test(lib.code)
  );
  check(
    "5 — the spine's five rules are called, not re-implemented",
    !!lib && /assertSettlementDraw\(\{/.test(lib.code)
  );
  /* ⚠ AN AMOUNT LINE CANNOT BE SPLIT ACROSS ROWS. */
  check(
    "5 — an AMOUNT line refuses more than one row",
    !!lib && /ol\.basis === "AMOUNT" && agg\.count > 1/.test(lib.code)
  );
  /* ⚠ THE DRAW IS TAKEN AT SUBMIT AND RETURNED ON REJECTION. */
  check("5 — the draw is taken at submit", !!lib && /drawn_quantity: \{ increment/.test(lib.code));
  check("5 — and returned on rejection", !!lib && /drawn_quantity: \{ decrement/.test(lib.code));
  check(
    "5 — a rejected settlement does not consume the not-to-exceed cap",
    !!lib && /status: \{ in: \["DRAFT", "SUBMITTED", "APPROVED", "PAID"\] \}/.test(lib.code)
  );
}

/* ═══ 6 · ROUTES, AND WHERE THE CREATE FLOW LIVES ═════════════════════════ */

const gated = new Map(ROUTE_ACCESS.map((e) => [e.prefix, e.requires]));
check("6 — /pay is gated canHireTalent", gated.get("/pay") === "canHireTalent");
check("6 — /finances is gated authenticated", gated.get("/finances") === "authenticated");
check("6 — /orders is gated authenticated (covers /orders/[id]/settle)", gated.get("/orders") === "authenticated");
{
  const proxy = fileAt("src/proxy.ts");
  for (const p of ["/pay", "/finances", "/orders"])
    check(`6 — proxy.ts runs the edge on ${p}`, !!proxy && proxy.text.includes(`"${p}/:path*"`));
}
for (const p of [
  "src/app/(app)/pay/page.tsx",
  "src/app/(app)/finances/payment-requests/page.tsx",
  "src/app/(app)/finances/payment-requests/[id]/page.tsx",
  "src/app/(app)/orders/[id]/settle/page.tsx",
]) {
  const f = fileAt(p);
  check(`6 — ${p.split("/").slice(-2).join("/")} calls guardPage`, !!f && /guardPage\(/.test(f.code));
}
/**
 * ⚠ THE CREATE FLOW LIVES INSIDE THE ORDER — `nav.ts`'s locked decision:
 * *"Payment Requests generated from a Work Order… A rail item for a thing that is
 * a tab inside another thing taught the wrong model of how work gets billed."*
 */
{
  const nav = fileAt("src/lib/nav.ts");
  check(
    "6 — the doctrine still says payment requests come from a Work Order",
    !!nav && (nav.text.replace(/\s+/g, " ")).includes("generated from a Work Order")
  );
  check("6 — and the create page lives under the order", !!fileAt("src/app/(app)/orders/[id]/settle/page.tsx"));
  /* ⚠ ABSENCE: no top-level create route. */
  const topLevel = SRC.filter((f) => /app.\(app\).settle/.test(f.path) || /app.\(app\).timesheets/.test(f.path));
  check("6 — ABSENCE: no top-level settle or timesheet route", topLevel.length === 0, topLevel.map((t) => t.path).join(", "));
}
/* ⚠ AND THE PROVIDER IS TOLD WHY WHEN NOTHING IS RELEASED — not an empty form. */
{
  const list = fileAt("src/app/(app)/finances/payment-requests/page.tsx");
  check(
    "6 — the provider is told when no order is ready to bill against",
    !!list && /No work order is ready to bill against/.test(list.text)
  );
  check(
    "6 — and the reason names released",
    !!list && /released/.test(list.text)
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:settle — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:settle — ${pass}/${pass} passed`);
