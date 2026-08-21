/**
 * `check:assessment-volume` — the deck's per-domain fields, pinned
 * (brief_per_domain_volume WS5).
 *
 * Four properties, and each one is a thing that would otherwise fail silently:
 *
 *   1  `ALL_STEPS` HAS NOT GROWN. The fields live on the existing `cd_*` steps.
 *      Ten new screens would roughly double a 16-screen walk and break two
 *      published strings — "in under an hour of your time" on the marketing home
 *      and "about 20 minutes" in `AssessmentWizardShot`.
 *   2  EVERY DOMAIN IN THE BANK HAS AN ENTRY, DERIVED FROM THE BANK. An eleventh
 *      capability domain must fail the build rather than quietly render a screen
 *      with no fields — exactly as `check:assessment` already does for weights.
 *   3  "NOT ASKED" PERSISTS AS NULL AND NEVER BECOMES 0. A zero is a real answer
 *      that reads as *this domain does nothing* and would size accordingly.
 *   4  NO SCORING OUTPUT CHANGED. A fixed input produces a byte-identical
 *      `Scored` with and without the new answers. This brief adds an INPUT.
 *
 * Plus the deck's own content: 19 fields, the labels verbatim, the type implied
 * by each label, and the two slides that carry none.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN. This file's prose names the
 * tokens it forbids, and a scanner that read comments would fail on its own
 * documentation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_DOMAIN_FIELDS,
  ALL_DOMAIN_KEYS,
  DOMAIN_FIELDS,
  PERCENT_SUM_100,
  fieldsForDomain,
  parseFieldValue,
  storedFieldsFor,
  type DomainFieldAnswers,
} from "@/lib/assessment/domain-fields";
import { ALL_STEPS, domainStepId, stepsFor } from "@/lib/assessment/steps";
import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";
import { domainRowsFor } from "@/lib/assessment/domain-results";
import { scoreAssessment, type Answers, type Basics, type Scored } from "@/lib/assessment/scoring";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const read = (...p: string[]) => stripComments(readFileSync(join(...p), "utf8"));

const WIZARD = read("src", "components", "assessment", "AssessmentWizard.tsx");
const PANEL = read("src", "components", "assessment", "DomainFields.tsx");
const SPEC = read("src", "lib", "assessment", "domain-fields.ts");
const ROUTE = read("src", "app", "api", "assessment", "route.ts");
const RESULTS = read("src", "lib", "assessment", "domain-results.ts");
const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8");

// ---------------------------------------------------------------------------
// 1 — ALL_STEPS HAS NOT GROWN
// ---------------------------------------------------------------------------

/*
  Derived, never a literal 16: one process screen, one per domain in the bank, then
  basics / money / process_detail / aimode / contact. An eleventh domain is allowed
  to move this number; a new SCREEN for the volume questions is not.
*/
const EXPECTED_STEPS = 1 + P2P_DOMAINS.length + 5;
check(
  "1 — ALL_STEPS is process + one per domain + five, and nothing else",
  ALL_STEPS.length === EXPECTED_STEPS,
  `${ALL_STEPS.length} vs ${EXPECTED_STEPS}`
);
check(
  "1 — signed out is exactly one screen longer than signed in",
  stepsFor(null).length === EXPECTED_STEPS && stepsFor("a@b.co").length === EXPECTED_STEPS - 1
);
check(
  "1 — no step id mentions volume, dollars or fields",
  !ALL_STEPS.some((s) => /volume|dollar|field|amount/i.test(s)),
  ALL_STEPS.filter((s) => /volume|dollar|field|amount/i.test(s)).join(", ")
);
check(
  "1 — every domain's fields render on that domain's OWN cd_ step",
  P2P_DOMAINS.every((d) => ALL_STEPS.includes(domainStepId(d.key))) &&
    /const domain = domainForStep\(step\)/.test(WIZARD) &&
    /<DomainFields/.test(WIZARD)
);

// ---------------------------------------------------------------------------
// 2 — EVERY DOMAIN IN THE BANK HAS AN ENTRY, DERIVED FROM THE BANK
// ---------------------------------------------------------------------------

check(
  "2 — ALL_DOMAIN_KEYS is derived from the bank, not listed",
  /P2P_DOMAINS\.map\(\(d\) => d\.key\)/.test(SPEC)
);
const missing = ALL_DOMAIN_KEYS.filter((k) => !(k in DOMAIN_FIELDS));
check(
  "2 — every capability domain in the bank has a DOMAIN_FIELDS entry",
  missing.length === 0,
  missing.join(", ")
);
const orphan = Object.keys(DOMAIN_FIELDS).filter((k) => !ALL_DOMAIN_KEYS.includes(k));
check(
  "2 — and no entry names a domain the bank does not have",
  orphan.length === 0,
  orphan.join(", ")
);

/*
  ⚠ THE TWO QUALITATIVE DOMAINS CARRY NONE, BY NAME. Their absence is the deck's
  design, and they are the same two the dollar model exempts (UNWEIGHTED_DOMAINS).
  A field appearing on either is somebody "completing the pattern".
*/
for (const k of ["data_ai_governance", "change_ai_adoption"]) {
  check(`2 — ${k} carries NO extra fields, as the deck draws it`, fieldsForDomain(k).length === 0);
}
check(
  "2 — exactly two domains carry no fields",
  ALL_DOMAIN_KEYS.filter((k) => fieldsForDomain(k).length === 0).length === 2
);
check("2 — 19 fields across the eight quantitative slides", ALL_DOMAIN_FIELDS.length === 19, `${ALL_DOMAIN_FIELDS.length}`);

/*
  THE DECK'S LABELS, VERBATIM. Read out of `AI Maturity Assessment.pptx` rather than
  retyped: if a label is reworded, this list is the thing that has to be re-read
  against the deck before it can be changed.
*/
const DECK_LABELS: Record<string, string[]> = {
  requisitioning: [
    "Estimated Number of Requisition Lines",
    "Estimated Dollars Across All Requisition Lines",
  ],
  sourcing: [
    "Estimated Number of Sourcing Events",
    "Estimated Dollars Saved Across All Sourcing Events",
  ],
  contracts: ["Estimated Number of Contract Lines", "Estimated Spend on Contract Being Tracked"],
  purchase_orders: ["Estimated Number of PO Lines", "Estimated Dollars Across All PO Lines"],
  receiving: [
    "Estimated Number of Receipt Lines",
    "Estimated Dollars Across All Receipt Lines",
    "Percentage of your orders that are services?",
    "Do you use service receipts & 3Way on Service Orders?",
  ],
  invoices: ["Estimated Number of Invoice Lines", "Estimated Dollars Across All Invoice Lines"],
  payments: ["% of Manual Checks", "% of ACH Payments", "% of Wire Payments"],
  supplier_risk: [
    "Estimated Number of Supplier Registrations",
    "Estimated Number of Supplier Qualifications",
  ],
  data_ai_governance: [],
  change_ai_adoption: [],
};
for (const [k, labels] of Object.entries(DECK_LABELS)) {
  check(
    `2 — ${k}: labels are the deck's, verbatim and in the deck's order`,
    JSON.stringify(fieldsForDomain(k).map((f) => f.label)) === JSON.stringify(labels),
    fieldsForDomain(k).map((f) => f.label).join(" | ")
  );
}

/*
  ⚠ THE VALIDATION RULE FOLLOWS THE LABEL, AND THE LABEL IS THE CONTRACT — Scott,
  2026-08-20. A field whose label says "Number of" but whose type says `dollars`
  would silently multiply a line count by 100 and store it as cents.
*/
for (const { domainKey, field } of ALL_DOMAIN_FIELDS) {
  const expected = /^Estimated Number of /.test(field.label)
    ? "count"
    : /^(%|Percentage)/.test(field.label)
      ? "percent"
      : /^Do you /.test(field.label)
        ? "boolean"
        : "dollars";
  check(
    `2 — ${domainKey}.${field.id}: the type matches what the label promises (${expected})`,
    field.type === expected,
    `${field.type}`
  );
}
check(
  "2 — every field id is unique across the whole bank",
  new Set(ALL_DOMAIN_FIELDS.map((x) => x.field.id)).size === ALL_DOMAIN_FIELDS.length
);
/*
  ⚠ THE DECK NAMES NO PERIOD on any of its fifteen slides. Until Scott names one,
  every field records `period: null` rather than a made-up "per month".
*/
check(
  "2 — no field invents a period the deck does not state",
  ALL_DOMAIN_FIELDS.every((x) => x.field.period === null) &&
    !ALL_DOMAIN_FIELDS.some((x) => /per (month|year|annum)/i.test(x.field.label))
);

/* Slide 8 is a MIX, not a size: three rails, no volume, no dollars, must total 100. */
check(
  "2 — payments is the only percent-sum group, and it is the deck's three rails",
  JSON.stringify(Object.keys(PERCENT_SUM_100)) === '["payments"]' &&
    JSON.stringify(PERCENT_SUM_100.payments) ===
      '["pct_manual_checks","pct_ach_payments","pct_wire_payments"]'
);
check(
  "2 — payments carries no count and no dollars field",
  fieldsForDomain("payments").every((f) => f.type === "percent")
);
check(
  "2 — supplier_risk carries counts and NO dollars field",
  fieldsForDomain("supplier_risk").length === 2 &&
    fieldsForDomain("supplier_risk").every((f) => f.type === "count")
);
/*
  ⚠ FOUR TYPES ON SLIDE 6, NOT THREE. The brief says "Three input types on one
  screen — count, percentage, boolean"; the deck slide also carries `Estimated
  Dollars Across All Receipt Lines`, so it is count + dollars + percent + boolean.
  The deck wins and the discrepancy is reported. The point the brief was making
  survives either way: the field model has to carry a TYPE, not just a number.
*/
check(
  "2 — receiving carries all four input types on one screen",
  new Set(fieldsForDomain("receiving").map((f) => f.type)).size === 4,
  [...new Set(fieldsForDomain("receiving").map((f) => f.type))].join("+")
);
/*
  ⚠ THE DOLLAR FIELD IS THREE DIFFERENT QUANTITIES and the difference is recorded,
  not implied. A generic dollars column would let a dashboard sum savings, tracked
  spend and gross flow into a figure that means nothing.
*/
check(
  "2 — sourcing's dollars are SAVED, contracts' are SPEND UNDER CONTRACT, and both say so",
  /SAVED/.test(DOMAIN_FIELDS.sourcing[1].meaning) &&
    /under contract/.test(DOMAIN_FIELDS.contracts[1].meaning) &&
    DOMAIN_FIELDS.sourcing[1].meaning !== DOMAIN_FIELDS.requisitioning[1].meaning
);
check(
  "2 — every field carries a non-empty recorded meaning",
  ALL_DOMAIN_FIELDS.every((x) => x.field.meaning.trim().length > 0)
);

// ---------------------------------------------------------------------------
// 2b — the typed edits Scott asked for
// ---------------------------------------------------------------------------

check("2b — a count accepts thousands separators and stores the integer", (() => {
  const r = parseFieldValue("count", "1,250,000");
  return r.ok && r.value === 1_250_000;
})());
check("2b — a count rejects a decimal", !parseFieldValue("count", "12.5").ok);
check("2b — a count rejects a currency symbol", !parseFieldValue("count", "$1200").ok);
check("2b — a count rejects letters", !parseFieldValue("count", "lots").ok);
check("2b — a count rejects a negative", !parseFieldValue("count", "-5").ok);
check("2b — dollars accept $ and separators and STORE CENTS", (() => {
  const r = parseFieldValue("dollars", "$1,250,000");
  return r.ok && r.value === 125_000_000;
})());
check("2b — dollars keep the cents exactly, with no float drift", (() => {
  const r = parseFieldValue("dollars", "19.99");
  return r.ok && r.value === 1999;
})());
check("2b — dollars reject letters", !parseFieldValue("dollars", "1200 dollars").ok);
check("2b — dollars reject three decimal places", !parseFieldValue("dollars", "12.345").ok);
check("2b — a percent rejects above 100", !parseFieldValue("percent", "101").ok);
check("2b — a percent rejects a negative", !parseFieldValue("percent", "-1").ok);
check("2b — a percent stores an integer, never a float fraction", (() => {
  const r = parseFieldValue("percent", "50");
  return r.ok && r.value === 50;
})());
check("2b — 0 and 100 are both valid percentages", parseFieldValue("percent", "0").ok && parseFieldValue("percent", "100").ok);
check("2b — a boolean needs an explicit Yes or No", (() => {
  const yes = parseFieldValue("boolean", "true");
  const no = parseFieldValue("boolean", "false");
  return yes.ok && yes.value === true && no.ok && no.value === false && !parseFieldValue("boolean", "").ok;
})());
check("2b — an empty box is never valid — every field is required", (() => {
  const types = ["count", "dollars", "percent", "boolean"] as const;
  return types.every((t) => !parseFieldValue(t, "").ok);
})());
/*
  ⚠ THE THIRD BOX IS NEVER AUTO-FILLED FROM THE OTHER TWO. A buyer splitting across
  a fourth rail needs to SEE that the deck's model does not fit them.
*/
check(
  "2b — the payment split is validated, not balanced for the visitor",
  /groupTotal === 100/.test(PANEL) &&
    /continueDisabled: !domainFieldsComplete\(domain\.key\)/.test(WIZARD) &&
    !/100 - \(/.test(PANEL)
);
check(
  "2b — the running total is shown while it is wrong",
  /need to total 100%/.test(PANEL)
);
check(
  "2b — the boolean is two buttons, not a checkbox",
  !/type="checkbox"/.test(PANEL) && /aria-pressed=\{raw === o\.v\}/.test(PANEL)
);
check(
  "2b — the numeric boxes are free text with an edit, not type=number",
  !/type="number"/.test(PANEL) && /type="text"/.test(PANEL)
);

// ---------------------------------------------------------------------------
// 3 — "NOT ASKED" PERSISTS AS NULL AND NEVER BECOMES 0
// ---------------------------------------------------------------------------

const scoredFixture = (): Scored => ({
  maturityPct: 29,
  unknownDomains: ["supplier_risk"],
  domains: P2P_DOMAINS.map((d, i) => ({
    key: d.key,
    name: d.name,
    formal: d.formal,
    rung: d.key === "supplier_risk" ? null : 10,
    opportunity: d.key === "supplier_risk" ? [0, 0] : [1_000 * (i + 1), 2_000 * (i + 1)],
    rank: d.key === "supplier_risk" ? null : i + 1,
  })),
  ranked: [],
  opportunity: [0, 0],
  investment: [0, 0],
  leapfrog: false,
});

check(
  "3 — a domain that was never asked stores null, not [] and not a row of zeroes",
  storedFieldsFor("invoices", undefined) === null &&
    storedFieldsFor("invoices", {}) === null
);
check(
  "3 — a slide that legitimately has no fields stores [], which is NOT null",
  (() => {
    const got = storedFieldsFor("data_ai_governance", { data_ai_governance: {} });
    return Array.isArray(got) && got.length === 0;
  })()
);
check(
  "3 — an answered domain stores the label and the meaning beside the value",
  (() => {
    const got = storedFieldsFor("invoices", { invoices: { invoice_lines: 1200 } });
    if (!got || got.length !== 1) return false;
    const f = got[0];
    return (
      f.id === "invoice_lines" &&
      f.label === "Estimated Number of Invoice Lines" &&
      f.type === "count" &&
      f.meaning.length > 0 &&
      f.value === 1200
    );
  })()
);
check(
  "3 — a field id the spec does not know is dropped, not stored",
  (() => {
    const got = storedFieldsFor("invoices", { invoices: { made_up: 1 } });
    return Array.isArray(got) && got.length === 0;
  })()
);
check(
  "3 — a real zero survives as a zero — it is an answer, not an absence",
  (() => {
    const got = storedFieldsFor("invoices", { invoices: { invoice_lines: 0 } });
    return Boolean(got) && got![0].value === 0;
  })()
);

const noFields = domainRowsFor(scoredFixture(), new Map());
check(
  "3 — with no answers at all, EVERY row's fields column is a DB null",
  noFields.every((r) => String(r.fields) === String(noFields[0].fields)) &&
    noFields.every((r) => !Array.isArray(r.fields) && r.fields !== 0),
  JSON.stringify(noFields[0].fields)
);
check(
  "3 — the backfill writes no fields — it has nothing to read",
  domainRowsFor(scoredFixture(), new Map(), true).every((r) => !Array.isArray(r.fields))
);
check(
  "3 — with answers, only the answered domains carry an array",
  (() => {
    const answers: DomainFieldAnswers = { invoices: { invoice_lines: 900 } };
    const rows = domainRowsFor(scoredFixture(), new Map(), false, answers);
    const inv = rows.find((r) => r.domain_key === "invoices");
    const other = rows.find((r) => r.domain_key === "sourcing");
    return Array.isArray(inv?.fields) && !Array.isArray(other?.fields);
  })()
);
check(
  "3 — the wizard omits a domain with nothing typed rather than sending zeroes",
  /if \(Object\.keys\(vals\)\.length > 0\) out\[d\.key\] = vals;/.test(WIZARD)
);
check(
  "3 — the schema column is nullable, so 'not asked' has somewhere to live",
  /fields\s+Json\?/.test(SCHEMA)
);
check(
  "3 — the stored value is resolved at WRITE time, never looked up at read time",
  /storedFieldsFor\(d\.key, domainFields\)/.test(RESULTS)
);
check(
  "3 — historical assessments are not backfilled by this brief",
  !/domainFields/.test(read("prisma", "backfill-assessment-domains.ts"))
);

// ---------------------------------------------------------------------------
// 4 — NO SCORING OUTPUT CHANGED
// ---------------------------------------------------------------------------

/*
  ⚠ THE POINT OF THIS BRIEF IS THAT IT ADDS AN INPUT AND CHANGES NO OUTPUT. The same
  answers with and without `domainFields` must score to a byte-identical object —
  not merely an equal maturity percentage.
*/
const FIXED_ANSWERS: Answers = {
  maturity: {
    requisitioning: 10,
    sourcing: 23,
    contracts: 37,
    purchase_orders: 10,
    receiving: 23,
    invoices: 10,
    payments: 37,
    supplier_risk: null,
    data_ai_governance: 10,
    change_ai_adoption: 23,
  },
  spendBand: "10-50m",
  costLeverBand: "40-60",
  headcountBand: "6-15",
  aiMode: "approve",
};
const FIXED_BASICS: Basics = {
  revenueBand: "50-250m",
  ebitdaBand: "10-20",
  platform: "oracle-fusion",
  state: "TX",
};

const withoutFields = scoreAssessment(FIXED_ANSWERS, FIXED_BASICS);
const withFields = scoreAssessment(
  {
    ...FIXED_ANSWERS,
    /* deliberately shaped like the real payload, and deliberately ignored */
    ...({
      domainFields: {
        invoices: { invoice_lines: 12_000, invoice_line_dollars: 250_000_000_00 },
        payments: { pct_manual_checks: 60, pct_ach_payments: 30, pct_wire_payments: 10 },
      },
    } as Partial<Answers>),
  },
  FIXED_BASICS
);
check(
  "4 — the Scored object is byte-identical with and without the new answers",
  JSON.stringify(withoutFields) === JSON.stringify(withFields)
);
check(
  "4 — and it is not vacuously empty",
  withoutFields.domains.length === P2P_DOMAINS.length && withoutFields.maturityPct > 0,
  `${withoutFields.maturityPct}`
);
check(
  "4 — scoring.ts does not mention the new answers at all",
  !/domainFields|domain-fields/.test(read("src", "lib", "assessment", "scoring.ts"))
);
check(
  "4 — the Answers type does not carry them, so scoring structurally cannot read them",
  !/domainFields/.test(
    read("src", "lib", "assessment", "scoring.ts").slice(
      read("src", "lib", "assessment", "scoring.ts").indexOf("export type Answers"),
      read("src", "lib", "assessment", "scoring.ts").indexOf("export type Basics")
    )
  )
);
/*
  ⚠ THE VALUE MODEL IS NOT WIRED HERE. Whether these figures replace, feed or are
  reconciled against `DOLLAR_WEIGHTS` is Scott's open decision, and it decides what
  the headline figure on the dashboard actually is. Building the join before that is
  decided bakes in the answer.
*/
check(
  "4 — no ValueFactorBasis member was added on the strength of this brief",
  !/TRANSACTION_VOLUME|LINE_VOLUME|DOMAIN_VOLUME/.test(
    read("src", "lib", "catalog", "value-factors.ts")
  )
);
check(
  "4 — the submit route stores the fields and scores without them",
  /writeDomainResults\(tx, created\.id, scored, \{[\s\S]{0,120}domainFields/.test(ROUTE) &&
    /scoreAssessment\(b\.answers, \{/.test(ROUTE)
);
check(
  "4 — the route accepts the key but never requires it — absent means NOT ASKED",
  /domainFields: z[\s\S]{0,220}\.optional\(\)/.test(ROUTE)
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:assessment-volume — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:assessment-volume — ${pass}/${pass} passed`);
