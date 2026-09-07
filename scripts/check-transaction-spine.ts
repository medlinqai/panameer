/**
 * `check:transaction-spine` — the rules the spine cannot be allowed to lose
 * (`P1-J4-E388` WS-5). `npm run check:transaction-spine`.
 *
 * ── ⚠⚠ TWO KINDS OF ASSERTION, AND THE SECOND KIND IS THE POINT ─────────────
 *
 * BEHAVIOURAL — every rule that says "assert" in the brief is exercised against
 * `lib/transaction-spine.ts`, and every one is MUTATION-TESTED: the harness
 * proves the rule REFUSES the bad case, not merely that it accepts the good one.
 * A guard that only ever sees valid input passes forever while doing nothing.
 *
 * ABSENCE — five things this brief FORBIDS, asserted as absent:
 *   · no `Milestone` model            · no settlement-method enum
 *   · no buyer-facing invoice model   · no PO schedules or distributions
 *   · no UNIQUE constraint on `WorkOrder.external_ref`
 * ⚠⚠ EACH OF THE FIVE WILL LOOK LIKE AN IMPROVEMENT TO SOMEBODY LATER. A
 * milestone model is the obvious way to model milestones; a unique index on a PO
 * number is the obvious way to stop duplicates. They are wrong for reasons that
 * live in this brief and nowhere in the code, which is exactly why the ABSENCE
 * has to be a test — a comment cannot fail a build.
 *
 * ⚠ NO DATABASE AND NO BROWSER. Schema facts are read from `schema.prisma` as
 * text; rules are exercised as functions. It runs anywhere.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SpineError,
  assertAllocation,
  assertLineShape,
  assertSettlementDraw,
  assertSupplierPartSubject,
  basisForPricingType,
  fanOutByProvider,
  feeReconciles,
  feeSplit,
  paymentStatusFor,
  payoutIsReleasable,
  priceSettlementLine,
  workRequestIsComplete,
} from "@/lib/transaction-spine";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * ⚠ THE MUTATION HALF. `refuses` asserts the rule THROWS, and optionally with
 * the expected code — a rule that throws for the wrong reason is not the rule.
 */
function refuses(name: string, fn: () => unknown, code?: string) {
  try {
    fn();
    check(name, false, "it was ACCEPTED — the rule is not enforcing");
  } catch (e) {
    if (code && (e as SpineError).code !== code) {
      check(name, false, `threw ${(e as SpineError).code}, expected ${code}`);
      return;
    }
    check(name, true);
  }
}
function accepts(name: string, fn: () => unknown) {
  try {
    fn();
    check(name, true);
  } catch (e) {
    check(name, false, `it was REFUSED: ${(e as Error).message}`);
  }
}

const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8");
/** ⚠ Comments stripped: this file quotes the things it forbids, in prose. */
const SCHEMA_CODE = SCHEMA.replace(/^\s*\/\/\/.*$/gm, "").replace(/^\s*\/\/.*$/gm, "");

/* ═══ 1 · LINE SHAPE — RATE and AMOUNT are mutually exclusive ═══════════════ */
accepts("1 — a well-formed RATE line is accepted", () =>
  assertLineShape({ basis: "RATE", uom: "HUR", quantity: 40, unit_price_cents: 12500 })
);
accepts("1 — a well-formed AMOUNT line is accepted", () =>
  assertLineShape({ basis: "AMOUNT", amount_cents: 500000 })
);
refuses("1 — RATE without a uom is refused", () =>
  assertLineShape({ basis: "RATE", quantity: 40, unit_price_cents: 12500 }), "RATE_NEEDS_UOM");
refuses("1 — RATE without a quantity is refused", () =>
  assertLineShape({ basis: "RATE", uom: "HUR", unit_price_cents: 12500 }), "RATE_NEEDS_QUANTITY");
refuses("1 — RATE without a unit price is refused", () =>
  assertLineShape({ basis: "RATE", uom: "HUR", quantity: 40 }), "RATE_NEEDS_UNIT_PRICE");
/* ⚠⚠ THE INVERSE IS THE HALF THAT GETS FORGOTTEN — a line carrying BOTH prices
   can be settled twice, once per shape, and the second draw looks legitimate. */
refuses("1 — ⚠ RATE ALSO carrying an amount is refused (settleable twice)", () =>
  assertLineShape({ basis: "RATE", uom: "HUR", quantity: 40, unit_price_cents: 12500, amount_cents: 1 }),
  "RATE_HAS_AMOUNT");
refuses("1 — AMOUNT without an amount is refused", () =>
  assertLineShape({ basis: "AMOUNT" }), "AMOUNT_NEEDS_AMOUNT");
refuses("1 — ⚠ AMOUNT ALSO carrying quantity/price is refused", () =>
  assertLineShape({ basis: "AMOUNT", amount_cents: 1000, uom: "HUR", quantity: 2, unit_price_cents: 500 }),
  "AMOUNT_HAS_RATE_FIELDS");

/* ═══ 2 · SUPPLIER PART — exactly one subject, both directions ══════════════ */
accepts("2 — a PROVIDER part with a provider is accepted", () =>
  assertSupplierPartSubject({ kind: "PROVIDER", provider_profile_id: "p1" }));
accepts("2 — a PACKAGE part with a package is accepted", () =>
  assertSupplierPartSubject({ kind: "PACKAGE", package_id: "k1" }));
refuses("2 — a part naming BOTH subjects is refused", () =>
  assertSupplierPartSubject({ kind: "PROVIDER", provider_profile_id: "p1", package_id: "k1" }),
  "PART_TWO_SUBJECTS");
refuses("2 — a part naming NEITHER subject is refused", () =>
  assertSupplierPartSubject({ kind: "PROVIDER" }), "PART_NO_SUBJECT");
refuses("2 — kind and subject disagreeing is refused", () =>
  assertSupplierPartSubject({ kind: "PACKAGE", provider_profile_id: "p1" }), "PART_KIND_MISMATCH");
check("2 — part_number is unique in the schema", /part_number\s+String\s+@unique/.test(SCHEMA_CODE));
check(
  "2 — each subject id is unique, so one subject cannot mint two part numbers",
  /provider_profile_id String\? @unique/.test(SCHEMA_CODE) && /package_id\s+String\? @unique/.test(SCHEMA_CODE)
);

/* ═══ 3 · PRICING-TYPE MAPPING ═════════════════════════════════════════════ */
check("3 — HOURLY maps to RATE", basisForPricingType("HOURLY") === "RATE");
check("3 — FIXED maps to AMOUNT", basisForPricingType("FIXED") === "AMOUNT");
check("3 — RECURRING maps to AMOUNT", basisForPricingType("RECURRING") === "AMOUNT");

/* ═══ 4 · COMPLETE means EVERY line assigned and priced ═════════════════════ */
const priced = { basis: "RATE" as const, unit_price_cents: 100 };
check("4 — a fully assigned, priced request is COMPLETE",
  workRequestIsComplete([{ ...priced, provider_person_id: "a" }, { ...priced, provider_person_id: "b" }]));
check("4 — ⚠ one unassigned line makes it NOT complete",
  !workRequestIsComplete([{ ...priced, provider_person_id: "a" }, { ...priced, provider_person_id: null }]));
check("4 — ⚠ one unpriced line makes it NOT complete",
  !workRequestIsComplete([{ basis: "RATE", provider_person_id: "a", unit_price_cents: null }]));
check("4 — an empty request is NOT complete", !workRequestIsComplete([]));

/* ═══ 5 · FAN-OUT — group by provider, and BOTH PATHS IDENTICAL ════════════ */
const threeProviderLines = [
  { line_number: 1, provider_person_id: "alice" },
  { line_number: 2, provider_person_id: "bob" },
  { line_number: 3, provider_person_id: "carol" },
];
check("5 — a three-provider request fans out into THREE work orders",
  fanOutByProvider(threeProviderLines).size === 3);
check("5 — the same provider on three lines makes ONE order with three lines",
  (() => {
    const g = fanOutByProvider([
      { line_number: 1, provider_person_id: "alice" },
      { line_number: 2, provider_person_id: "alice" },
      { line_number: 3, provider_person_id: "alice" },
    ]);
    return g.size === 1 && (g.get("alice")?.length ?? 0) === 3;
  })());
/*
  ⚠⚠ BOTH PATHS FAN OUT IDENTICALLY, PROVEN BY CONSTRUCTION AND BY VALUE.
  The web path ("Requester clicks CREATE WORK ORDER") and the inbound-PO path
  call the SAME function, so they cannot diverge — and to prove the grouping is
  not order-dependent, the PO shape is fed in a DIFFERENT line order.
*/
const inboundPoShape = [
  { line_number: 3, provider_person_id: "carol" },
  { line_number: 1, provider_person_id: "alice" },
  { line_number: 2, provider_person_id: "bob" },
];
check(
  "5 — ⚠⚠ WEB and INBOUND-PO paths produce IDENTICAL grouping",
  (() => {
    const web = fanOutByProvider(threeProviderLines);
    const erp = fanOutByProvider(inboundPoShape);
    if (web.size !== erp.size) return false;
    for (const [provider, lines] of web) {
      const other = erp.get(provider);
      if (!other || other.length !== lines.length) return false;
      const a = lines.map((l) => l.line_number).sort().join(",");
      const b = other.map((l) => l.line_number).sort().join(",");
      if (a !== b) return false;
    }
    return true;
  })()
);
refuses("5 — an unassigned line cannot be fanned out into an order", () =>
  fanOutByProvider([{ provider_person_id: null }]), "LINE_UNASSIGNED");
check("5 — WorkOrder.provider_person_id is REQUIRED (not optional)",
  /provider_person_id String @db\.Uuid/.test(SCHEMA_CODE));

/* ═══ 6 · SETTLEMENT — the five rules ══════════════════════════════════════ */
const RELEASED = {
  status: "RELEASED",
  period_start: new Date("2026-01-01"),
  period_end: new Date("2026-12-31"),
  not_to_exceed_cents: 1_000_000,
};
const rateOrderLine = {
  id: "wol1", basis: "RATE" as const, uom: "HUR", quantity: 100,
  unit_price_cents: 12500, drawn_quantity: 0, drawn_amount_cents: 0,
};
const amountOrderLine = {
  id: "wol2", basis: "AMOUNT" as const, amount_cents: 500000,
  drawn_quantity: 0, drawn_amount_cents: 0,
};
const period = { periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-31") };

accepts("6 — a valid RATE draw inside every rule is accepted", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 40 }, orderLine: rateOrderLine }],
  }));

refuses("6.1 — a basis mismatch is refused (timesheet against an amount line)", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol2", basis: "RATE", quantity: 1 }, orderLine: amountOrderLine }],
  }), "BASIS_MISMATCH");

/* ⚠⚠ RULE 2 IS REFUSED, NOT IGNORED — see `priceSettlementLine`. */
refuses("6.2 — ⚠⚠ a settlement line supplying its OWN price is REFUSED", () =>
  priceSettlementLine(
    { work_order_line_id: "wol1", basis: "RATE", quantity: 1, unit_price_cents: 999 },
    rateOrderLine
  ), "PRICE_NOT_COPIED");
check("6.2 — the price is COPIED from the order line",
  priceSettlementLine({ work_order_line_id: "wol1", basis: "RATE", quantity: 1 }, rateOrderLine)
    .unit_price_cents === 12500);

refuses("6.3 — a RATE draw exceeding the ordered quantity is refused", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 101 }, orderLine: rateOrderLine }],
  }), "RATE_OVERDRAW");
refuses("6.3 — ⚠ a RATE draw exceeding the REMAINING quantity is refused", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{
      draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 41 },
      orderLine: { ...rateOrderLine, drawn_quantity: 60 },
    }],
  }), "RATE_OVERDRAW");
refuses("6.3 — ⚠⚠ an AMOUNT line cannot be drawn TWICE", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{
      draft: { work_order_line_id: "wol2", basis: "AMOUNT" },
      orderLine: { ...amountOrderLine, drawn_amount_cents: 500000 },
    }],
  }), "AMOUNT_ALREADY_DRAWN");
refuses("6.3 — ⚠⚠ an AMOUNT line cannot be drawn IN PART", () =>
  assertSettlementDraw({
    order: RELEASED, ...period, alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol2", basis: "AMOUNT", amount_cents: 250000 }, orderLine: amountOrderLine }],
  }), "AMOUNT_PARTIAL_DRAW");

refuses("6.4 — a draw past not_to_exceed is refused", () =>
  assertSettlementDraw({
    order: { ...RELEASED, not_to_exceed_cents: 100000 }, ...period, alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 40 }, orderLine: rateOrderLine }],
  }), "NOT_TO_EXCEED");
refuses("6.4 — ⚠ the cap counts EARLIER settlements too, so filing twice cannot clear it", () =>
  assertSettlementDraw({
    order: { ...RELEASED, not_to_exceed_cents: 600000 }, ...period, alreadySettledCents: 400000,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 40 }, orderLine: rateOrderLine }],
  }), "NOT_TO_EXCEED");

refuses("6.5 — a period starting before the order is refused", () =>
  assertSettlementDraw({
    order: RELEASED, periodStart: new Date("2025-12-01"), periodEnd: new Date("2026-03-31"),
    alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 1 }, orderLine: rateOrderLine }],
  }), "PERIOD_BEFORE_ORDER");
refuses("6.5 — a period ending after the order is refused", () =>
  assertSettlementDraw({
    order: RELEASED, periodStart: new Date("2026-03-01"), periodEnd: new Date("2027-01-31"),
    alreadySettledCents: 0,
    lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 1 }, orderLine: rateOrderLine }],
  }), "PERIOD_AFTER_ORDER");

for (const status of ["DRAFT", "ISSUED", "ACCEPTED", "CLOSED", "CANCELLED"]) {
  refuses(`6 — ⚠ a settlement against a ${status} order is refused (only RELEASED)`, () =>
    assertSettlementDraw({
      order: { ...RELEASED, status }, ...period, alreadySettledCents: 0,
      lines: [{ draft: { work_order_line_id: "wol1", basis: "RATE", quantity: 1 }, orderLine: rateOrderLine }],
    }), "ORDER_NOT_RELEASED");
}
check("6 — SettlementLine.work_order_line_id is NOT nullable",
  /work_order_line_id String @db\.Uuid/.test(SCHEMA_CODE));

/* ═══ 7 · THE FEE — compute and subtract, always reconciling ═══════════════ */
for (const [gross, bps] of [[10000, 1000], [9999, 1490], [33333, 1490], [12500, 1490], [1, 1490], [7, 333]] as const) {
  const r = feeSplit(gross, bps);
  check(`7 — net + fee == gross for ${gross}c @ ${bps}bps`, feeReconciles(r),
    `${r.net_cents} + ${r.fee_cents} != ${r.gross_cents}`);
}
check("7 — ⚠ the fee is COMPUTED AND SUBTRACTED, never computed alongside the net",
  (() => {
    /* If net were computed independently this would disagree on a non-even case. */
    /* ⚠ 500c @ 14.9% is a case where the two methods GENUINELY DISAGREE:
       correct net 425, naive net 426. Found by search, not assumed — 33333c
       happens to agree, which is exactly why "it looked fine" is not evidence. */
    const g = 500, bps = 1490;
    const r = feeSplit(g, bps);
    const naiveNet = Math.round((g * (10000 - bps)) / 10000);
    return r.net_cents === g - r.fee_cents && r.net_cents !== naiveNet;
  })(),
  "the non-even case no longer diverges — pick another gross if the rates changed");
check("7 — feeReconciles CATCHES a broken row",
  !feeReconciles({ gross_cents: 100, fee_cents: 10, net_cents: 91 }));

/* ═══ 8 · ALLOCATION AND RELEASE ═══════════════════════════════════════════ */
accepts("8 — allocating less than received is legal (PARTIAL allocation)", () =>
  assertAllocation(10000, [3000, 4000]));
accepts("8 — allocating exactly what was received is legal", () =>
  assertAllocation(10000, [10000]));
refuses("8 — ⚠⚠ allocating MORE than was received is refused", () =>
  assertAllocation(10000, [6000, 5000]), "OVER_ALLOCATED");
refuses("8 — a non-positive allocation line is refused", () =>
  assertAllocation(10000, [0]), "ALLOCATION_NOT_POSITIVE");
check("8 — no allocation reads UNMATCHED", paymentStatusFor(10000, []) === "UNMATCHED");
check("8 — ⚠ a partial allocation reads PARTIALLY_ALLOCATED",
  paymentStatusFor(10000, [3000]) === "PARTIALLY_ALLOCATED");
check("8 — a full allocation reads ALLOCATED", paymentStatusFor(10000, [10000]) === "ALLOCATED");
check("8 — ⚠⚠ a payout is RELEASABLE only when ITS OWN settlement is allocated",
  payoutIsReleasable({ settlementAllocatedCents: 5000, settlementTotalCents: 5000 }));
check("8 — ⚠ a partially allocated settlement does NOT release its payout",
  !payoutIsReleasable({ settlementAllocatedCents: 4999, settlementTotalCents: 5000 }));
check("8 — an unallocated settlement does NOT release its payout",
  !payoutIsReleasable({ settlementAllocatedCents: 0, settlementTotalCents: 5000 }));
check("8 — ProviderPayoutLine.settlement_line_id is NOT nullable",
  /settlement_line_id String @db\.Uuid/.test(SCHEMA_CODE));

/* ═══ 9 · ⚠⚠ THE FIVE ABSENCES THIS BRIEF FORBIDS ═════════════════════════ */
/*
  ⚠⚠ NO **SETTLEMENT** MILESTONE MODEL. Milestones are the LINE COUNT: one AMOUNT
  line is a lump sum, several are milestones.

  ⚠ `PackageMilestone` IS EXPLICITLY ALLOWED AND IS A DIFFERENT THING — it
  pre-dates this brief and is where a package's milestones are AUTHORED, which is
  the SOURCE that becomes work-request lines. The thing forbidden is a milestone
  that the SPINE settles against, which would make "how is this billed" a stored
  flag again. So the assertion names the shapes that would do that rather than
  banning the word.
*/
for (const forbidden of ["Milestone", "SettlementMilestone", "WorkOrderMilestone", "OrderMilestone"]) {
  check(
    `9 — ⚠⚠ NO \`${forbidden}\` model — milestones are the LINE COUNT, not a table`,
    !new RegExp(`^model\\s+${forbidden}\\s*\\{`, "m").test(SCHEMA_CODE)
  );
}
check("9 — ⚠ `PackageMilestone` is untouched — it AUTHORS milestones, it does not settle them",
  /^model PackageMilestone \{/m.test(SCHEMA_CODE));
/*
  ⚠ NARROWED DELIBERATELY. `BillingMethodKind` and `PayoutMethodKind` pre-exist
  and are PAYMENT INSTRUMENTS (card, ACH) — not settlement methods. Banning the
  substring would have failed on unrelated, correct enums.
*/
for (const forbidden of ["SettlementMethod", "SettlementType", "BillingBasis", "MilestoneType"]) {
  check(
    `9 — ⚠⚠ NO \`${forbidden}\` enum — \`LineBasis\` is the only switch`,
    !new RegExp(`^enum\\s+${forbidden}\\s*\\{`, "m").test(SCHEMA_CODE)
  );
}
check("9 — ⚠⚠ NO buyer-facing INVOICE model — ERS creates it in THEIR system",
  !/^model\s+\w*Invoice\w*\s*\{/m.test(SCHEMA_CODE),
  "Panameer never sends the buyer an invoice");
check("9 — ⚠⚠ NO PO schedules or distributions — those are the buyer's accounting",
  !/^model\s+\w*(PurchaseOrderSchedule|OrderSchedule|WorkOrderSchedule|Distribution)\w*\s*\{/m.test(SCHEMA_CODE));
/*
  ⚠⚠ THE ONE MOST LIKELY TO BE "FIXED" BY SOMEBODY LATER. A unique index on a PO
  number looks like duplicate detection working correctly. It would REJECT THE
  SECOND PROVIDER ON A TWO-PROVIDER PO, because the buyer's ERP sees one supplier
  and one PO fans out into N work orders.
*/
const workOrderBlock = /model WorkOrder \{[\s\S]*?\n\}/.exec(SCHEMA_CODE)?.[0] ?? "";
check("9 — the WorkOrder model block was found by the scan", workOrderBlock.length > 0);
check(
  "9 — ⚠⚠ `WorkOrder.external_ref` has NO unique constraint (multi-provider POs)",
  workOrderBlock.length > 0 &&
    !/external_ref\s+String\?\s+@unique/.test(workOrderBlock) &&
    !/@@unique\(\[[^\]]*external_ref/.test(workOrderBlock)
);

/* ═══ 10 · THE HEADER/LINE SPLIT SURVIVES ═════════════════════════════════ */
check("10 — ⚠ WorkRequest.unspsc_code is GONE from the header (commented, not deleted)",
  !/^\s*unspsc_code\s+String\?/m.test(
    /model WorkRequest \{[\s\S]*?\n\}/.exec(SCHEMA_CODE)?.[0] ?? ""
  ));
check("10 — ⚠ UNSPSC lives on WorkRequestLine",
  /model WorkRequestLine \{[\s\S]*?unspsc_code[\s\S]*?\n\}/.test(SCHEMA_CODE));
check("10 — ⚠ p_account_id STAYS on the WorkRequest header (the RequisitioningBU)",
  /model WorkRequest \{[\s\S]*?p_account_id[\s\S]*?\n\}/.test(SCHEMA_CODE));
check("10 — punchout_line_ref is unique — it is the join key on the return leg",
  /punchout_line_ref String\? @unique/.test(SCHEMA_CODE));
check("10 — ⚠ WorkOrder.fee_bps has NO @default — it is a SNAPSHOT, copied not invented",
  /fee_bps Int\s*$/m.test(workOrderBlock) && !/fee_bps Int\s+@default/.test(workOrderBlock));

if (failures.length > 0) {
  console.error(`check:transaction-spine — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:transaction-spine — ${pass}/${pass} passed`);
