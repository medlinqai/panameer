import type { BillingCycle, PaymentTerms, PaymentTrigger, TransactionType } from "@prisma/client";

// O-E004: billing cycle, payment terms and payment trigger — labels, defaults and the due-date rule.
export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = { WEEKLY: "Weekly", BIWEEKLY: "Every 2 weeks", MONTHLY: "Monthly", EVERY_90_DAYS: "Every 90 days" };
export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = { IMMEDIATE: "Immediate", NET15: "Net 15", NET30: "Net 30", NET45: "Net 45", NET60: "Net 60" };
export const PAYMENT_TRIGGER_LABEL: Record<PaymentTrigger, string> = { TIMESHEET: "Timesheet", PAYMENT_REQUEST: "Payment request", INVOICE: "Invoice", DOWNLOAD: "Download", INSTALLATION: "Installation" };
export const TERMS_DAYS: Record<PaymentTerms, number> = { IMMEDIATE: 0, NET15: 15, NET30: 30, NET45: 45, NET60: 60 };

/** Terms start on submission, not approval. */
export function dueDate(submittedAt: Date, terms: PaymentTerms | null | undefined): Date {
  return new Date(submittedAt.getTime() + TERMS_DAYS[terms ?? "NET30"] * 86_400_000);
}

export type LineTerms = { billing_cycle: BillingCycle | null; payment_terms: PaymentTerms; payment_trigger: PaymentTrigger };

/** Defaults when neither a provider service nor a product names terms. */
export function defaultTerms(type: TransactionType, isProduct: boolean): LineTerms {
  if (isProduct) return { billing_cycle: null, payment_terms: "NET30", payment_trigger: "PAYMENT_REQUEST" };
  if (type === "SERVICE_BY_QTY") return { billing_cycle: "MONTHLY", payment_terms: "NET30", payment_trigger: "TIMESHEET" };
  return { billing_cycle: "MONTHLY", payment_terms: "NET30", payment_trigger: "PAYMENT_REQUEST" };
}

/** One readable line, e.g. "Monthly · Net 30 · Timesheet". */
export function termsLine(t: { billing_cycle?: BillingCycle | null; payment_terms?: PaymentTerms | null; payment_trigger?: PaymentTrigger | null }): string | null {
  const parts = [t.billing_cycle ? BILLING_CYCLE_LABEL[t.billing_cycle] : null, t.payment_terms ? PAYMENT_TERMS_LABEL[t.payment_terms] : null, t.payment_trigger ? PAYMENT_TRIGGER_LABEL[t.payment_trigger] : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
