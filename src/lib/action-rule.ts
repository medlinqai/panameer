// NC-E001: action or news, one rule. The Worklist holds only what the viewer must act on (a verb button);
// everything else is news for the bell. Messages stay in Messages.
export type Kind = "Action" | "News" | "Messages";

/** The events that are actions. Any other event — whatever its registry flag — never creates a Worklist row. */
export const ACTION_EVENTS = new Set<string>([
  // Accept an Order (and its change orders); Approve a Request, timesheet, settlement or invoice
  "work.order_offered", "work.order_created", "work.change_order_received", "shop.order_received", "work.settlement_approval", "work.request_po_check", "company.join_requested", "group.join_requested",
  // Answer an availability request · Pick an interview time · Take a requested test · Send a requested estimate
  "work.invited_to_propose", "work.sourcing_event_invited", "work.questions_asked", "work.job_amended", "work.interview_requested", "work.interview_slots_offered", "estimate.requested", "estimate.changes_requested",
  // Respond to an offer on your product (or a counter to yours) · Write a requested recommendation · Accept a connection request
  "shop.offer_received", "shop.offer_countered", "recommendation.requested", "colleague.invite_received", "mentor.request_received",
  // Fix a hidden profile · Add a required tax form
  "profile.visibility_off", "profile.details_needed", "profile.country_unknown", "work.tax_banking_needed",
  // A requested test is a derived line ("Take the Test") — the event itself can't be cleared in-app, so it stays news.
  // Things You Need to Do lines derived from data (lib/todo.ts) — already limited to the actions above.
  "todo.item",
]);

export const isAction = (event: string) => ACTION_EVENTS.has(event);

/** Every category, for the record (a category is Action when any of its events is). */
export const CATEGORY_KIND: Record<string, Kind> = {
  "message.received": "Messages",
  "work_request.matched": "Action",
  "work_order.status": "Action",
  "milestone.due": "Action",
  "buyer.proposals.received": "Action",
  "buyer.provider.responded": "Action",
  "buyer.work_order.status": "News",
  "buyer.settlement.approval": "Action",
  "buyer.timesheet.approval": "Action",
  "service_product.offers": "Action",
  "buyer.offers.answered": "Action",
  "support.ticket_status": "News",
  "account.registration": "Action",
  "profile.updates": "News",
  "profile.visibility": "Action",
  "work_tracker.updates": "News",
  "recommendation.received": "News",
  "learn.progress": "News",
  "community.activity": "Action",
  "product.updates": "News",
  "tax.documents": "News",
  "tax.form_required": "Action",
  "payout.sent": "News",
};

/** News in the bell expires after 14 days. */
export const NEWS_DAYS = 14;
