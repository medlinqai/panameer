import type { PaymentEvent, TransactionType, WorkOrderStyle, WorkRequestSource } from "@prisma/client";

// WS-E001–E006: Oracle Cloud document styles and line types. One rule table — client-safe (no DB).
export const STYLE_LABEL: Record<WorkOrderStyle, string> = { TIME_AND_MATERIALS: "Time & Materials", FIXED_PRICE: "Fixed Price", PRODUCT: "Product", RETAINER: "Retainer" };
export const LINE_TYPE_LABEL: Record<TransactionType, string> = { SERVICE_BY_QTY: "Service – Rate", SERVICE_BY_AMT: "Service – Fixed Price", PRODUCT_BY_QTY: "Product" };
/** WS-E005: the tax flag only — Panameer does not calculate or collect tax. */
export const TAX_FLAG: Record<TransactionType, "Services" | "Goods"> = { SERVICE_BY_QTY: "Services", SERVICE_BY_AMT: "Services", PRODUCT_BY_QTY: "Goods" };
export const TAX_NOTE = "Taxes, if any, are handled between the buyer and the provider.";

/** WS-E002: which line types each style allows (Retainer also needs a billing cycle on every line). */
export const STYLE_LINE_TYPES: Record<WorkOrderStyle, TransactionType[]> = {
  TIME_AND_MATERIALS: ["SERVICE_BY_QTY"],
  FIXED_PRICE: ["SERVICE_BY_AMT"],
  PRODUCT: ["PRODUCT_BY_QTY"],
  RETAINER: ["SERVICE_BY_QTY", "SERVICE_BY_AMT"],
};

type LineLike = { transaction_type: TransactionType; billing_cycle?: string | null; uom?: string | null; recurringProduct?: boolean };
/** A retainer line: a billing cycle on a monthly / weekly unit or a subscription product (same rule as the Recurring chip). */
export const isRetainerLine = (l: LineLike) => !!l.billing_cycle && (l.uom === "MONTH" || l.uom === "WEEK" || !!l.recurringProduct);

/** WS-E001/E002: the style one line belongs to. */
export function styleForLine(l: LineLike): WorkOrderStyle {
  if (isRetainerLine(l)) return "RETAINER";
  return l.transaction_type === "PRODUCT_BY_QTY" ? "PRODUCT" : l.transaction_type === "SERVICE_BY_AMT" ? "FIXED_PRICE" : "TIME_AND_MATERIALS";
}
/** A document's style from its lines (mixed lines: T&M beats Fixed Price beats Product; any retainer line → Retainer). */
export function styleForLines(lines: LineLike[]): WorkOrderStyle | null {
  if (!lines.length) return null;
  const styles = new Set(lines.map(styleForLine));
  for (const s of ["RETAINER", "TIME_AND_MATERIALS", "FIXED_PRICE", "PRODUCT"] as WorkOrderStyle[]) if (styles.has(s)) return s;
  return null;
}

export class StyleError extends Error {}
/** WS-E002: block a line type the style doesn't allow, with a clear message. */
export function assertLineAllowed(style: WorkOrderStyle, l: LineLike) {
  if (!STYLE_LINE_TYPES[style].includes(l.transaction_type))
    throw new StyleError(`A ${STYLE_LABEL[style]} Work Order can't hold a "${LINE_TYPE_LABEL[l.transaction_type]}" line. Allowed: ${STYLE_LINE_TYPES[style].map((t) => LINE_TYPE_LABEL[t]).join(" or ")}.`);
  if (style === "RETAINER" && !l.billing_cycle) throw new StyleError("A Retainer line needs a billing cycle (weekly, every 2 weeks, monthly…).");
}

/** WS-E003: the Payment Event a line type settles on when none was chosen. */
export function defaultPaymentEvent(t: TransactionType, productEvent?: PaymentEvent | null): PaymentEvent {
  if (t === "SERVICE_BY_QTY") return "TIMESHEET";
  if (t === "SERVICE_BY_AMT") return "PAYMENT_REQUEST";
  return productEvent === "DOWNLOAD" || productEvent === "INSTALLATION" ? productEvent : "ACCEPTANCE";
}

/** WS-E004 / OJ-E006: the Origin label (JOB_HIRE → Compare Providers when the job had a Sourcing Event, else Hire Directly). */
const SOURCE_LABEL: Record<WorkRequestSource, string> = { JOB_HIRE: "Hire Directly", SHOP: "Shop", ESTIMATE: "Estimate", OFFER: "Offer", EXTERNALLY_SOURCED: "Externally Sourced", PUNCHOUT: "Punchout" };
export const originLabel = (source: WorkRequestSource | null | undefined, hadSourcingEvent: boolean) => (source === "JOB_HIRE" && hadSourcingEvent ? "Compare Providers" : source ? SOURCE_LABEL[source] : "—");
