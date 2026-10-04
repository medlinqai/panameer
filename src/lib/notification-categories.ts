export type NotificationGroup = "messages" | "email" | "tax";

export type NotificationAudience = "seller" | "buyer" | "both";

export type NotificationLane = "work" | "community";

export type NotificationCategory = {
  key: string;
  lane: NotificationLane;
  audience: NotificationAudience;
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
    lane: "community",
    audience: "both",
    group: "messages",
    label: "New message from a buyer",
    blurb: "Someone started or replied to a conversation with you.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_request.matched",
    lane: "work",
    audience: "seller",
    group: "messages",
    label: "A work request matches your profile",
    blurb: "A buyer posted work your skills and service products fit.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_order.status",
    lane: "work",
    audience: "seller",
    group: "messages",
    label: "Work order status changes",
    blurb: "A work order you're on was issued, amended or closed.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "milestone.due",
    lane: "work",
    audience: "seller",
    group: "messages",
    label: "Milestone and timesheet deadlines",
    blurb: "Something you owe a buyer is due, or a submitted milestone was approved.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.proposals.received",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "Proposals on your work request",
    blurb: "A provider responded to work you posted.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.provider.responded",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "A provider accepted or declined",
    blurb: "Someone you invited to your work request answered.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.work_order.status",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "Your work order status changes",
    blurb: "A work order you released was accepted, amended or closed.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.settlement.approval",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "A settlement request needs your approval",
    blurb: "A provider submitted work for you to approve before it can be paid.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.timesheet.approval",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "A timesheet needs approving",
    blurb: "Hours were submitted against a work order you own.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "service_product.offers",
    lane: "work",
    audience: "seller",
    group: "messages",
    label: "Offers on your service products",
    blurb: "A buyer offered below your list price on something you published.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "buyer.offers.answered",
    lane: "work",
    audience: "buyer",
    group: "messages",
    label: "Answers to your offers",
    blurb: "A provider accepted or declined an offer you made on a service product.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "support.ticket_status",
    lane: "community",
    audience: "both",
    group: "messages",
    label: "Updates on tickets you reported",
    blurb: "Panameer moved one of your support tickets to a new status.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "account.registration",
    lane: "community",
    audience: "both",
    group: "email",
    label: "Finishing your registration",
    blurb: "You saved your registration part-way and can pick it up again.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "profile.updates",
    lane: "community",
    audience: "seller",
    group: "email",
    label: "Get Notified of Profile Updates",
    blurb:
      "A section of your profile was saved, or a résumé rebuild finished.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "profile.visibility",
    lane: "community",
    audience: "seller",
    group: "email",
    label: "Profile and visibility",
    blurb:
      "Your profile went live, dropped below the visibility threshold, or is going stale.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_tracker.updates",
    lane: "community",
    audience: "both",
    group: "email",
    label: "Panameer build updates",
    blurb: "What shipped, gates passed, and milestones reached on the public Work Tracker.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "recommendation.received",
    lane: "community",
    audience: "seller",
    group: "email",
    label: "Recommendations and validations",
    blurb: "Someone you asked wrote you a recommendation, or confirmed a project.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "learn.progress",
    lane: "community",
    audience: "both",
    group: "email",
    label: "Learn — courses and certifications",
    blurb: "A certification was issued, or a path you're enrolled in was updated.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "community.activity",
    lane: "community",
    audience: "both",
    group: "messages",
    label: "Community activity",
    blurb: "You joined, or something new was added where you follow.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "product.updates",
    lane: "community",
    audience: "both",
    group: "email",
    label: "Product news from Panameer",
    blurb: "New features, and occasional research invitations. Never sales mail.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "tax.documents",
    lane: "work",
    audience: "seller",
    group: "tax",
    label: "Tax documents",
    blurb: "Your annual summary is ready, or a form on file needs renewing.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "tax.form_required",
    lane: "work",
    audience: "seller",
    group: "tax",
    label: "A tax form is required before payout",
    blurb:
      "Panameer can't pay you until a W-9 or W-8 is on file. This one can't be switched off.",
    defaults: { inApp: true, email: true, sms: false },
    locked: true,
  },
  {
    key: "payout.sent",
    lane: "work",
    audience: "seller",
    group: "tax",
    label: "Withdrawals and payouts",
    blurb: "Money left Panameer for your account, or a withdrawal failed.",
    defaults: { inApp: true, email: true, sms: false },
  },
];

export function categoriesFor(group: NotificationGroup): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter((c) => c.group === group);
}

export function categoriesForAudience(
  group: NotificationGroup,
  opts: { isSeller: boolean; isBuyer: boolean }
): NotificationCategory[] {
  return categoriesFor(group).filter(
    (c) =>
      c.audience === "both" ||
      (c.audience === "seller" && opts.isSeller) ||
      (c.audience === "buyer" && opts.isBuyer)
  );
}

export function findCategory(key: string): NotificationCategory | undefined {
  return NOTIFICATION_CATEGORIES.find((c) => c.key === key);
}
