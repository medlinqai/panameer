// WK-E007: one set of words for "Your Next Step: … [button]" or "Waiting on {who}" — the record, its list row and Things You Need to Do.
export type Step = { next: { text: string; label: string; href: string } } | { waiting: string } | null;
const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD"]);
const DONE = new Set(["CLOSED", "FINALLY_CLOSED"]);

export function orderStep(o: { id: string; status: string; party: "BUYER" | "PROVIDER" | "NONE"; buyerAcceptedAt: string | Date | null; providerAcceptedAt: string | Date | null; providerName: string; buyerName: string }): Step {
  const review = { label: "Review", href: `/orders/${o.id}#accept` };
  if (o.party === "BUYER") {
    if (o.status === "ISSUED" && !o.buyerAcceptedAt) return { next: { text: "Review and Accept the Order", ...review } };
    if (o.status === "ISSUED") return { waiting: `Waiting on ${o.providerName} to accept` };
    if (RELEASED.has(o.status)) return { waiting: `Order active · ${o.providerName} is working; approve invoices as they come` };
    if (DONE.has(o.status)) return { next: { text: `Recommend ${o.providerName}`, label: "Recommend", href: `/recommend-order/${o.id}` } };
  }
  if (o.party === "PROVIDER") {
    // The buyer accepts first, then the provider.
    if (o.status === "ISSUED" && !o.buyerAcceptedAt) return { waiting: "Order coming · the buyer is reviewing it" };
    if (o.status === "ISSUED" && !o.providerAcceptedAt) return { next: { text: "Review and Accept the Order", ...review } };
    if (RELEASED.has(o.status)) return { next: { text: "Start the Work, Then Bill", label: "Bill", href: "/payments/payment-requests" } };
    if (DONE.has(o.status)) return { next: { text: `Ask ${o.buyerName} for a Recommendation`, label: "Ask", href: "/connect/recommendations" } };
  }
  return null;
}

export function paymentStep(s: { status: string; party: "BUYER" | "PROVIDER" | "NONE"; providerName: string; total: string }): Step {
  if (s.party === "BUYER") {
    if (s.status === "SUBMITTED") return { next: { text: `Approve ${s.providerName}'s Invoice · ${s.total}`, label: "Approve", href: "#approve" } };
    if (s.status === "APPROVED") return { next: { text: `Pay ${s.total}`, label: "Pay", href: "/pay" } };
    if (s.status === "PAID") return { waiting: `Nothing to do · next invoice when ${s.providerName} bills` };
    if (s.status === "REJECTED") return { waiting: `Waiting on ${s.providerName} to fix and resubmit` };
  }
  if (s.party === "PROVIDER") {
    if (s.status === "DRAFT") return { next: { text: "Submit the Payment Request", label: "Submit", href: "#submit" } };
    if (s.status === "SUBMITTED") return { waiting: "Waiting on the buyer's approval" };
    if (s.status === "APPROVED") return { waiting: "Approved · waiting on the buyer's payment" };
    if (s.status === "PAID") return { waiting: `Paid ${s.total} · next invoice when you bill` };
    if (s.status === "REJECTED") return { next: { text: "Fix and Resubmit", label: "Resubmit", href: "#resubmit" } };
  }
  return null;
}

/** The buyer's Job (and its Request) by stage. */
export function jobStep(j: { id: string; stage: string; asked: number; answered: number; draft?: boolean }): Step {
  const t = (tab: string) => `/work-requests/${j.id}?tab=${tab}`;
  switch (j.stage) {
    case "DRAFT": return { next: { text: "Publish Your Job", label: "Publish", href: t("details") } };
    case "ACTIVE": return { next: { text: "Ask Providers for Availability", label: "Find People", href: t("matches") } };
    case "COMPARING": return j.answered ? { next: { text: `Compare Answers (${j.answered} of ${j.asked} In)`, label: "Compare", href: t("responses") } } : { waiting: `Waiting on ${j.asked} provider${j.asked === 1 ? "" : "s"}` };
    case "REQUEST_TO_HIRE": return { waiting: "Waiting on your approver (or your ERP for a PO)" };
    case "FILLED": return { next: { text: "The Order Is Released", label: "View Order", href: t("work-order") } };
    case "ON_HOLD": return { next: { text: "Resume or Close the Job", label: "Resume", href: `/work-requests/${j.id}` } };
    default: return null;
  }
}

/** The seller's side of a Job, by its Jobs for You stage. */
export function sellerJobStep(stage: string, jobId: string): Step {
  const href = `/find-work/${jobId}`;
  switch (stage) {
    case "You Matched": return { next: { text: "Apply, or Wait to Be Asked", label: "Apply", href } };
    case "They Requested": return { next: { text: "Say If You're Available, With Your Rate", label: "Respond", href } };
    case "You Answered": case "You Applied": return { waiting: "Waiting on the buyer" };
    case "You Interviewed": return { waiting: "Waiting on the buyer's decision" };
    case "Buyer Requested to Hire You · Awaiting Approval": return { waiting: "Waiting on the buyer's approval" };
    case "They Chose You": return { waiting: "Order coming · the buyer is reviewing it" };
    default: return null;
  }
}
