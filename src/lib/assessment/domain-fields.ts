import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

/**
 * THE DECK'S PER-DOMAIN EXTRA FIELDS — slides 2–11 of `AI Maturity Assessment.pptx`.
 *
 * ── ⚠ THE SHAPE IS NOT UNIFORM AND MUST NOT BE MADE UNIFORM ──────────────────
 *
 * Eight domains carry extra fields and TWO CARRY NONE. One carries four fields, one
 * carries three percentages and no volume at all, one carries two counts and no
 * dollars. That is the design, read straight off Scott's deck — not an incomplete
 * pattern waiting to be finished.
 *
 *   slide  2 requisitioning      count + dollars
 *   slide  3 sourcing            count + dollars   ⚠ dollars SAVED, not dollars flowing
 *   slide  4 contracts           count + dollars   ⚠ SPEND UNDER CONTRACT, a third quantity
 *   slide  5 purchase_orders     count + dollars
 *   slide  6 receiving           count + dollars + percent + boolean   ⚠ three input types
 *   slide  7 invoices            count + dollars
 *   slide  8 payments            three percentages that must total 100 — NO volume, NO dollars
 *   slide  9 supplier_risk       two counts, NO dollars
 *   slide 10 data_ai_governance  ⚠ NONE
 *   slide 11 change_ai_adoption  ⚠ NONE
 *
 * ⚠ DO NOT "COMPLETE THE PATTERN" for slides 10 and 11. Data Analytics & AI Governance
 * and Change Management & AI Adoption are the two domains Scott added in this same
 * deck and they are QUALITATIVE ONLY. They are also the two `UNWEIGHTED_DOMAINS` that
 * recover $0. Giving them a volume box would invent a question he did not ask.
 *
 * ── ⚠ `meaning` EXISTS BECAUSE THE DOLLAR FIELD IS THREE DIFFERENT QUANTITIES ─
 *
 * Sourcing asks dollars **saved**. Contracts asks **spend being tracked**. The other
 * four ask **gross dollars across all lines**. A single `dollars` column would hold
 * three incompatible quantities and a dashboard would happily sum them into a figure
 * that means nothing. So every field carries its own label AND its own recorded
 * meaning, and both are STORED WITH THE ANSWER — see `AssessmentDomainResult.fields`.
 *
 * ── ⚠ THE LABELS ARE VERBATIM FROM THE DECK. DO NOT EDIT THEM ────────────────
 *
 * Including `& 3Way`, the `%` prefixes, the question marks, and the capitalisation.
 * They were read out of the .pptx rather than retyped from the brief's transcription,
 * and `check:assessment-volume` pins every one of them.
 *
 * ── ⚠⚠ THE DECK NEVER SAYS OVER WHAT PERIOD, AND THAT IS A REAL GAP ──────────
 *
 * "Estimated Number of Invoice Lines" — per month? per year? The deck does not say
 * on any of the fifteen slides, and neither does the brief once its banded model was
 * withdrawn (the withdrawn `CountBand` table said "transactions per month"). A count
 * with no period CANNOT be normalised into a rate, so nothing downstream can size
 * from it until Scott names one.
 *
 * ⚠ `period: null` on every field records that deliberately. It is NOT invented into
 * the label — the labels are his — and no period selector is added, because that is a
 * question the deck does not ask. Reported, not fixed.
 */

export type FieldType = "count" | "dollars" | "percent" | "boolean";

export type DomainField = {
  /** Stable key stored in the answers JSON. ⚠ Renaming one orphans stored answers. */
  id: string;
  /** ⚠ VERBATIM from the deck. Pinned by `check:assessment-volume`. */
  label: string;
  type: FieldType;
  /**
   * What the number actually MEANS, in one phrase, stored alongside the value.
   * This is what stops three different dollar quantities being summed.
   */
  meaning: string;
  /**
   * ⚠ ALWAYS NULL TODAY — the deck names no period. See the header note. When Scott
   * names one, this is where it goes and the stored answers gain it from that day
   * forward without rewriting the ones already taken.
   */
  period: null;
};

const f = (
  id: string,
  label: string,
  type: FieldType,
  meaning: string
): DomainField => ({ id, label, type, meaning, period: null });

/**
 * domainKey → the deck's extra fields for that slide, in the deck's own order.
 *
 * ⚠ KEYED BY `domainKey`, THE SAME KEY `maturity` USES, AND JOINED ON THE KEY NEVER
 * ON THE NAME. `P1-J0.4-E157` and the `CapabilityDomain.key` work are both this
 * lesson: the bank and `lib/capability-domains.ts` disagree on the WORDING of six of
 * ten domain names and always have.
 */
export const DOMAIN_FIELDS: Record<string, DomainField[]> = {
  requisitioning: [
    f("requisition_lines", "Estimated Number of Requisition Lines", "count", "requisition lines"),
    f(
      "requisition_line_dollars",
      "Estimated Dollars Across All Requisition Lines",
      "dollars",
      "gross dollars across all requisition lines"
    ),
  ],
  sourcing: [
    f("sourcing_events", "Estimated Number of Sourcing Events", "count", "sourcing events"),
    /* ⚠ SAVED, not flowing. A different quantity from every other dollar field here. */
    f(
      "sourcing_dollars_saved",
      "Estimated Dollars Saved Across All Sourcing Events",
      "dollars",
      "dollars SAVED across sourcing events"
    ),
  ],
  contracts: [
    f("contract_lines", "Estimated Number of Contract Lines", "count", "contract lines"),
    /* ⚠ SPEND UNDER CONTRACT — a third quantity again, neither gross flow nor savings. */
    f(
      "contract_spend_tracked",
      "Estimated Spend on Contract Being Tracked",
      "dollars",
      "spend under contract that is being tracked"
    ),
  ],
  purchase_orders: [
    f("po_lines", "Estimated Number of PO Lines", "count", "purchase-order lines"),
    f(
      "po_line_dollars",
      "Estimated Dollars Across All PO Lines",
      "dollars",
      "gross dollars across all purchase-order lines"
    ),
  ],
  receiving: [
    f("receipt_lines", "Estimated Number of Receipt Lines", "count", "receipt lines"),
    f(
      "receipt_line_dollars",
      "Estimated Dollars Across All Receipt Lines",
      "dollars",
      "gross dollars across all receipt lines"
    ),
    f(
      "pct_services_orders",
      "Percentage of your orders that are services?",
      "percent",
      "share of orders that are services"
    ),
    /*
      ⚠ A YES/NO, NOT A CHECKBOX. An unticked checkbox is indistinguishable from an
      unanswered question, and this field is required — so it is two explicit options.
    */
    f(
      "service_receipts_3way",
      "Do you use service receipts & 3Way on Service Orders?",
      "boolean",
      "service receipts and 3-way match are used on service orders"
    ),
  ],
  invoices: [
    f("invoice_lines", "Estimated Number of Invoice Lines", "count", "invoice lines"),
    f(
      "invoice_line_dollars",
      "Estimated Dollars Across All Invoice Lines",
      "dollars",
      "gross dollars across all invoice lines"
    ),
  ],
  /*
    ⚠ SLIDE 8 IS A MIX, NOT A SIZE. Manual cheques / ACH / wire are one answer in
    three boxes and they must total 100. No volume, no dollars — do not add either.

    ⚠ IT IS THE SAME RAIL SPLIT AS THE PAYMENT ARCHITECTURE IN `decisions-01.md`
    § 2026-08-20. A buyer answering "80% manual cheques" is describing the exact
    problem Panameer's own settlement rail solves; if that decision's rail list ever
    changes, this list is the other half of it.
  */
  payments: [
    f("pct_manual_checks", "% of Manual Checks", "percent", "share of payments made by manual cheque"),
    f("pct_ach_payments", "% of ACH Payments", "percent", "share of payments made by ACH"),
    f("pct_wire_payments", "% of Wire Payments", "percent", "share of payments made by wire"),
  ],
  /* ⚠ COUNTS AND NO DOLLARS. Registrations and qualifications are activity counts;
     do not add a dollars field to make this slide match its neighbours. */
  supplier_risk: [
    f(
      "supplier_registrations",
      "Estimated Number of Supplier Registrations",
      "count",
      "supplier registrations"
    ),
    f(
      "supplier_qualifications",
      "Estimated Number of Supplier Qualifications",
      "count",
      "supplier qualifications"
    ),
  ],
  /* ⚠ THE DECK SLIDES CARRY NO EXTRA FIELDS. Their absence is the design. */
  data_ai_governance: [],
  change_ai_adoption: [],
};

/** The deck's fields for a domain. `[]` for the two qualitative-only domains. */
export const fieldsForDomain = (domainKey: string): DomainField[] =>
  DOMAIN_FIELDS[domainKey] ?? [];

/**
 * ⚠ PERCENT GROUPS THAT MUST TOTAL EXACTLY 100.
 *
 * Slide 8's three payment rails are one answer split across three boxes. The wizard
 * blocks Continue until they total 100 and shows the running total.
 *
 * ⚠ THE THIRD BOX IS NEVER AUTO-FILLED FROM THE OTHER TWO. A buyer who genuinely
 * splits across four rails — cards, for instance — needs to SEE that the deck's model
 * does not fit them. Silently balancing the last box hides exactly the finding that
 * matters.
 *
 * ⚠ `pct_services_orders` IS NOT IN HERE. It is a standalone share of orders, not a
 * member of a partition, and adding it to a group would demand the impossible.
 */
export const PERCENT_SUM_100: Record<string, string[]> = {
  payments: ["pct_manual_checks", "pct_ach_payments", "pct_wire_payments"],
};

/** Every domain in the bank, whether or not it has fields. Derived, never listed. */
export const ALL_DOMAIN_KEYS: string[] = P2P_DOMAINS.map((d) => d.key);

/** Every field on every slide, flattened — 19 today. */
export const ALL_DOMAIN_FIELDS: { domainKey: string; field: DomainField }[] =
  ALL_DOMAIN_KEYS.flatMap((k) => fieldsForDomain(k).map((field) => ({ domainKey: k, field })));

// ---------------------------------------------------------------------------
// Parsing — free text in, a canonical integer or boolean out
// ---------------------------------------------------------------------------

/**
 * ⚠ FREE TEXT WITH TYPED VALIDATION, NOT BANDS — Scott, 2026-08-20: *"free text for
 * most, but there needs to be edits. these fields should also be required. if i ask
 * for lines...edit on number. if i ask for percentages...edit on that."*
 *
 * The brief's earlier `CountBand` table is WITHDRAWN and is not built.
 *
 * ⚠ THE VALIDATION RULE FOLLOWS THE LABEL, AND THE LABEL IS THE CONTRACT. Every
 * `Estimated Number of …` is a count; every `Estimated Dollars …` / `Estimated Spend
 * …` is currency; every `%`/`Percentage` is 0–100. `check:assessment-volume` asserts
 * that mapping from the labels themselves, so a new field whose label says "Number
 * of" but whose type says `dollars` fails the build.
 */
export type ParsedFieldValue = number | boolean;

export type ParseResult =
  | { ok: true; value: ParsedFieldValue }
  | { ok: false; error: string };

/**
 * ⚠ A CAP, BECAUSE `fields` IS JSON AND JSON NUMBERS ARE DOUBLES. Dollars are stored
 * in CENTS, so $1e12 is 1e14 cents — comfortably inside 2^53, where $1e15 would not
 * be. Anyone typing past this has fat-fingered a zero, and a silently-truncated
 * dollar figure on a buyer's report is not a bug anybody notices.
 */
const MAX_COUNT = 1_000_000_000_000;
const MAX_DOLLARS = 1_000_000_000_000;

/** Thousands separators and spaces are accepted on input and stripped. */
const stripGrouping = (s: string) => s.replace(/[,\s ]/g, "");

export function parseFieldValue(type: FieldType, raw: string | boolean): ParseResult {
  if (type === "boolean") {
    if (typeof raw === "boolean") return { ok: true, value: raw };
    if (raw === "true") return { ok: true, value: true };
    if (raw === "false") return { ok: true, value: false };
    return { ok: false, error: "Choose Yes or No." };
  }

  if (typeof raw !== "string") return { ok: false, error: "That doesn’t look right." };
  const t = stripGrouping(raw.trim());
  if (!t) return { ok: false, error: "This is needed before we can size your opportunity." };

  if (type === "count") {
    /* ⚠ NO DECIMALS AND NO CURRENCY SYMBOL — half a requisition line is not a thing. */
    if (!/^\d+$/.test(t)) return { ok: false, error: "Whole numbers only — no decimals or symbols." };
    const n = Number(t);
    if (n > MAX_COUNT) return { ok: false, error: "That looks too large — check for an extra zero." };
    return { ok: true, value: n };
  }

  if (type === "percent") {
    if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, error: "Enter a number between 0 and 100." };
    const n = Number(t);
    if (n > 100) return { ok: false, error: "A percentage cannot be above 100." };
    /* ⚠ AN INTEGER PERCENT, NEVER A FLOAT FRACTION. `50` means 50%, not 0.5. */
    return { ok: true, value: Math.round(n) };
  }

  /* dollars — `$` and separators accepted, letters rejected, STORED IN CENTS. */
  const money = t.replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(money)) {
    return { ok: false, error: "Enter an amount, like 1,250,000 — no letters." };
  }
  const n = Number(money);
  if (n > MAX_DOLLARS) return { ok: false, error: "That looks too large — check for an extra zero." };
  /*
    ⚠ CENTS AS AN INTEGER, the same rule as every other money value in this app
    (`P1-J2-E003`). `Math.round` after scaling, never `parseFloat(x) * 100` left as a
    float: 19.99 * 100 is 1998.9999999999998 in IEEE 754.
  */
  return { ok: true, value: Math.round(n * 100) };
}

// ---------------------------------------------------------------------------
// Canonicalising a whole wizard payload
// ---------------------------------------------------------------------------

/** What the wizard POSTs: domainKey → fieldId → the canonical value. */
export type DomainFieldAnswers = Record<string, Record<string, ParsedFieldValue>>;

/** One stored field, as it lands in `AssessmentDomainResult.fields`. */
export type StoredField = {
  id: string;
  label: string;
  type: FieldType;
  /** ⚠ STORED WITH THE VALUE so a later edit to `meaning` cannot rewrite an old report. */
  meaning: string;
  period: null;
  /** `count` = whole units · `dollars` = CENTS · `percent` = 0–100 · `boolean`. */
  value: ParsedFieldValue;
};

/**
 * The stored rows for one domain, or `null` when the domain was NOT ASKED.
 *
 * ── ⚠ THREE STATES, AND THEY ARE NOT THE SAME THING ──────────────────────────
 *
 *   null   — NOT ASKED. The 13 assessments taken before this brief have no
 *            `domainFields` key at all, and the two qualitative domains never will.
 *   []     — asked, and the slide legitimately has no fields (slides 10 and 11).
 *   [...]  — answered.
 *
 * ⚠ AND NONE OF THEM IS ZERO. A `0` is a real answer that reads as *this domain does
 * nothing* and would size accordingly. Nothing in here may ever turn an absent
 * answer into a 0 — `check:assessment-volume` fails the build over it.
 */
export function storedFieldsFor(
  domainKey: string,
  answers: DomainFieldAnswers | undefined
): StoredField[] | null {
  if (!answers || !(domainKey in answers)) return null;
  const given = answers[domainKey] ?? {};
  return fieldsForDomain(domainKey)
    .filter((field) => field.id in given)
    .map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      meaning: field.meaning,
      period: field.period,
      value: given[field.id],
    }));
}
