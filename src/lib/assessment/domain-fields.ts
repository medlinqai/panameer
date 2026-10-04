import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

export type FieldType = "count" | "dollars" | "percent" | "boolean";

export type DomainField = {
  id: string;
  label: string;
  type: FieldType;
  meaning: string;
  period: null;
};

const f = (
  id: string,
  label: string,
  type: FieldType,
  meaning: string
): DomainField => ({ id, label, type, meaning, period: null });

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
    f(
      "sourcing_dollars_saved",
      "Estimated Dollars Saved Across All Sourcing Events",
      "dollars",
      "dollars SAVED across sourcing events"
    ),
  ],
  contracts: [
    f("contract_lines", "Estimated Number of Contract Lines", "count", "contract lines"),
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
  payments: [
    f("pct_manual_checks", "% of Manual Checks", "percent", "share of payments made by manual cheque"),
    f("pct_ach_payments", "% of ACH Payments", "percent", "share of payments made by ACH"),
    f("pct_wire_payments", "% of Wire Payments", "percent", "share of payments made by wire"),
  ],
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
  data_ai_governance: [],
  change_ai_adoption: [],
};

/** The deck's fields for a domain. `[]` for the two qualitative-only domains. */
export const fieldsForDomain = (domainKey: string): DomainField[] =>
  DOMAIN_FIELDS[domainKey] ?? [];

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

export type ParsedFieldValue = number | boolean;

export type ParseResult =
  | { ok: true; value: ParsedFieldValue }
  | { ok: false; error: string };

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
    if (!/^\d+$/.test(t)) return { ok: false, error: "Whole numbers only — no decimals or symbols." };
    const n = Number(t);
    if (n > MAX_COUNT) return { ok: false, error: "That looks too large — check for an extra zero." };
    return { ok: true, value: n };
  }

  if (type === "percent") {
    if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, error: "Enter a number between 0 and 100." };
    const n = Number(t);
    if (n > 100) return { ok: false, error: "A percentage cannot be above 100." };
    return { ok: true, value: Math.round(n) };
  }

  /* dollars — `$` and separators accepted, letters rejected, STORED IN CENTS. */
  const money = t.replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(money)) {
    return { ok: false, error: "Enter an amount, like 1,250,000 — no letters." };
  }
  const n = Number(money);
  if (n > MAX_DOLLARS) return { ok: false, error: "That looks too large — check for an extra zero." };
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
  meaning: string;
  period: null;
  /** `count` = whole units · `dollars` = CENTS · `percent` = 0–100 · `boolean`. */
  value: ParsedFieldValue;
};

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
