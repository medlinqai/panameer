/**
 * What Panameer can tell you about (J2.4 WS-H / E020).
 *
 * MAPPED TO PANAMEER'S EVENT MODEL, not to a competitor's notification list.
 * The three tabs the brief asks for — Messages, Email updates, Tax settings —
 * are the GROUPS below; the categories inside them are things this product
 * actually does or is about to: a buyer opening a conversation, a work order
 * moving, a milestone settling, a certification issued by Learn.
 *
 * `event_behavior.md` remains the authoritative event catalog and a full
 * rewrite of it is explicitly out of scope here. This is the UI's view of it:
 * enough categories to configure meaningfully, each one traceable to something
 * real, and adding to it later is a data change rather than a migration —
 * preferences are rows keyed by category, and an absent row means the defaults
 * declared here.
 */
export type NotificationGroup = "messages" | "email" | "tax";

export type NotificationCategory = {
  key: string;
  group: NotificationGroup;
  label: string;
  blurb: string;
  defaults: { inApp: boolean; email: boolean; sms: boolean };
  /** Some things you don't get to switch off. */
  locked?: boolean;
};

export const NOTIFICATION_GROUPS: {
  id: NotificationGroup;
  label: string;
  blurb: string;
}[] = [
  {
    id: "messages",
    label: "Messages",
    blurb: "People trying to reach you about work.",
  },
  {
    id: "email",
    label: "Email Updates",
    blurb: "What Panameer sends you when you're not here.",
  },
  {
    id: "tax",
    label: "Tax Settings",
    blurb: "Documents and deadlines tied to being paid.",
  },
];

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: "message.received",
    group: "messages",
    label: "New message from a buyer",
    blurb: "Someone started or replied to a conversation with you.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_request.matched",
    group: "messages",
    label: "A work request matches your profile",
    blurb: "A buyer posted work your skills and packages fit.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_order.status",
    group: "messages",
    label: "Work order status changes",
    blurb: "A work order you're on was issued, amended or closed.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "milestone.due",
    group: "messages",
    label: "Milestone and timesheet deadlines",
    blurb: "Something you owe a buyer is due, or a submitted milestone was approved.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "profile.visibility",
    group: "email",
    label: "Profile and visibility",
    blurb:
      "Your profile went live, dropped below the visibility threshold, or is going stale.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "recommendation.received",
    group: "email",
    label: "Recommendations and validations",
    blurb: "Someone you asked wrote you a recommendation, or confirmed a project.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "learn.progress",
    group: "email",
    label: "Learn — courses and certifications",
    blurb: "A certification was issued, or a path you're enrolled in was updated.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "product.updates",
    group: "email",
    label: "Product news from Panameer",
    blurb: "New features, and occasional research invitations. Never sales mail.",
    defaults: { inApp: false, email: false, sms: false },
  },
  {
    key: "tax.documents",
    group: "tax",
    label: "Tax documents",
    blurb: "Your annual summary is ready, or a form on file needs renewing.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "tax.form_required",
    group: "tax",
    label: "A tax form is required before payout",
    blurb:
      "Panameer can't pay you until a W-9 or W-8 is on file. This one can't be switched off.",
    defaults: { inApp: true, email: true, sms: false },
    locked: true,
  },
  {
    key: "payout.sent",
    group: "tax",
    label: "Withdrawals and payouts",
    blurb: "Money left Panameer for your account, or a withdrawal failed.",
    defaults: { inApp: true, email: true, sms: false },
  },
];

export function categoriesFor(group: NotificationGroup): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter((c) => c.group === group);
}

export function findCategory(key: string): NotificationCategory | undefined {
  return NOTIFICATION_CATEGORIES.find((c) => c.key === key);
}
