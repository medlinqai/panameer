import type { BillingCycle, PaymentTerms, PaymentEvent, TransactionType } from "@prisma/client";

// O-E004: billing cycle, payment terms and payment trigger — labels, defaults and the due-date rule.
export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = { WEEKLY: "Weekly", BIWEEKLY: "Every 2 Weeks", MONTHLY: "Monthly", EVERY_90_DAYS: "Every 90 Days" };
export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = { IMMEDIATE: "Immediate", NET15: "Net 15", NET30: "Net 30", NET45: "Net 45", NET60: "Net 60" };
export const PAYMENT_EVENT_LABEL: Record<PaymentEvent, string> = { TIMESHEET: "Approved Timesheet", PAYMENT_REQUEST: "Payment Request", INVOICE: "Invoice", DOWNLOAD: "Download", INSTALLATION: "Installation", ACCEPTANCE: "Acceptance of the Work", ORDER_ACCEPTED: "Order Accepted" };
/** HF-E005: the Work Request / Work Order term lists, in Title Case. */
export const HIRE_PAYMENT_EVENTS = ["TIMESHEET", "INVOICE", "PAYMENT_REQUEST", "ACCEPTANCE", "ORDER_ACCEPTED"] as const satisfies readonly PaymentEvent[];
export const PER_UOM_LABEL = { HOUR: "Per Hour", DAY: "Per Day", WEEK: "Per Week", MONTH: "Per Month" } as const;
export const HIRE_BILLING_CYCLES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const satisfies readonly BillingCycle[];
export const TERMS_DAYS: Record<PaymentTerms, number> = { IMMEDIATE: 0, NET15: 15, NET30: 30, NET45: 45, NET60: 60 };

/** Terms start on submission, not approval. */
export function dueDate(submittedAt: Date, terms: PaymentTerms | null | undefined): Date {
  return new Date(submittedAt.getTime() + TERMS_DAYS[terms ?? "NET30"] * 86_400_000);
}

export type LineTerms = { billing_cycle: BillingCycle | null; payment_terms: PaymentTerms; payment_event: PaymentEvent };

/** Defaults when neither a provider service nor a product names terms. */
export function defaultTerms(type: TransactionType, isProduct: boolean): LineTerms {
  if (isProduct) return { billing_cycle: null, payment_terms: "NET30", payment_event: "PAYMENT_REQUEST" };
  if (type === "SERVICE_BY_QTY") return { billing_cycle: "MONTHLY", payment_terms: "NET30", payment_event: "TIMESHEET" };
  return { billing_cycle: "MONTHLY", payment_terms: "NET30", payment_event: "PAYMENT_REQUEST" };
}

/** One readable line, e.g. "Monthly · Net 30 · Timesheet". */
export function termsLine(t: { billing_cycle?: BillingCycle | null; payment_terms?: PaymentTerms | null; payment_event?: PaymentEvent | null }): string | null {
  const parts = [t.billing_cycle ? BILLING_CYCLE_LABEL[t.billing_cycle] : null, t.payment_terms ? PAYMENT_TERMS_LABEL[t.payment_terms] : null, t.payment_event ? PAYMENT_EVENT_LABEL[t.payment_event] : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
