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

/**
 * ⚠⚠ WHICH SIDE OF THE MARKETPLACE A CATEGORY BELONGS TO (`P1-ALL`, 2026-09-01).
 *
 * Filed as blocking in `event_behavior.md`: the model had NO audience concept, so
 * `NotificationSettings` rendered every category to everyone. A buyer was shown
 * *"Panameer can't pay you until a W-9 or W-8 is on file"*, and a seller was shown
 * *"A settlement request needs your approval"*.
 *
 * ⚠ A TS FIELD, NOT A MIGRATION. The categories live in this file and
 * `NotificationPreference.category` is a plain string, so nothing in the database
 * changes.
 * ⚠ `both` IS NOT A COP-OUT — messages, Learn and product news genuinely reach
 * both sides. Only use it where that is true.
 */
export type NotificationAudience = "seller" | "buyer" | "both";

export type NotificationCategory = {
  key: string;
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
    audience: "both",
    group: "messages",
    label: "New message from a buyer",
    blurb: "Someone started or replied to a conversation with you.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_request.matched",
    audience: "seller",
    group: "messages",
    label: "A work request matches your profile",
    blurb: "A buyer posted work your skills and packages fit.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "work_order.status",
    audience: "seller",
    group: "messages",
    label: "Work order status changes",
    blurb: "A work order you're on was issued, amended or closed.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "milestone.due",
    audience: "seller",
    group: "messages",
    label: "Milestone and timesheet deadlines",
    blurb: "Something you owe a buyer is due, or a submitted milestone was approved.",
    defaults: { inApp: true, email: true, sms: false },
  },
  /*
    ── ⚠⚠ THE BUYING SIDE (`P1-ALL-E032`, 2026-08-30) ──────────────────────────

    Everything above this block is written from the SELLER's point of view —
    "New message from a buyer", "A work request matches your profile", "Your
    profile went live". There was no buyer-facing category anywhere: nothing said
    a provider had responded to your work request, that proposals were waiting,
    or that a settlement needed your approval. The catalog covered one side of a
    two-sided marketplace.

    ── ⚠⚠ WHERE THESE NAMES CAME FROM, BECAUSE THE BRIEF'S SOURCE DOES NOT EXIST

    `E032` said to derive the events from `work_request_to_settlement_flow.md`
    and called it *"the authoritative lifecycle"*. ⚠ THAT FILE DOES NOT EXIST
    anywhere in the workspace. And `event_behavior.md` — which the docblock at
    the top of THIS file calls *"the authoritative event catalog"* — is a
    SKELETON: its own status line says so and its event table reads
    *"none defined yet"*.

    ⚠ SO THESE ARE DERIVED FROM `WORK_STEPS` in `lib/work-steps.ts`, which is the
    only authoritative buyer lifecycle that actually exists in the codebase —
    Scott's own five step names, asserted by `e2e §45` and governed by his
    3-4-word rule (`P1-J0-E286`):

        1 Create Work Request  2 Accept Proposal  3 Release Work Order
        4 Approve Settlement Request              5 Pay Panameer

    Steps 1-4 map to the five categories below. ⚠⚠ STEP 5 HAS NO CATEGORY AND
    THAT IS DELIBERATE — see the note after this block.

    ⚠⚠ THE LABELS ARE CC'S AND ARE AWAITING SCOTT'S APPROVAL. `E032` says *"the
    names are Scott's to approve"*. They are wired so the settings page can be
    walked, and renaming any of them is a one-line change in this file with no
    migration — an absent preference row means the defaults declared here, so no
    backfill is needed either way.

    ── ⚠ `email: false` ON EVERY ONE, ON PURPOSE ───────────────────────────────

    Every seller category above defaults `email: true`, and EMAIL CANNOT SEND —
    `RESEND_API_KEY` is still commented out. The settings page is honest about
    SMS (*"SMS is recorded but not yet sending"*) and silent about email, so the
    existing rows quietly promise a channel that will not fire. ⚠ THE NEW ROWS DO
    NOT REPEAT THAT: they default to in-app only, which is the only channel that
    actually works today. The inconsistency with the seller rows above is
    REPORTED, not silently fixed — their defaults are Scott's to change.

    ── ⚠⚠ AND THESE RENDER TO EVERYONE, WHICH IS A PRE-EXISTING GAP ────────────

    `NotificationCategory` HAS NO AUDIENCE FIELD and `NotificationSettings.tsx`
    renders `categoriesFor(tab)` with no filter, so a seller will now see "A
    settlement request needs your approval". ⚠ THAT ASYMMETRY ALREADY EXISTED IN
    THE OTHER DIRECTION — a buyer today sees `tax.form_required` telling them
    *"Panameer can't pay you until a W-9 or W-8 is on file"*. These rows make the
    existing gap symmetric rather than creating it. The fix is an `audience`
    field plus a filter, which needs the viewer's side plumbed into that
    component. REPORTED, NOT BUILT — it is a bigger change than this brief.
  */
  {
    key: "buyer.proposals.received",
    audience: "buyer",
    group: "messages",
    label: "Proposals on your work request",
    blurb: "A provider responded to work you posted.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "buyer.provider.responded",
    audience: "buyer",
    group: "messages",
    label: "A provider accepted or declined",
    blurb: "Someone you invited to your work request answered.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "buyer.work_order.status",
    audience: "buyer",
    group: "messages",
    label: "Your work order status changes",
    blurb: "A work order you released was accepted, amended or closed.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "buyer.settlement.approval",
    audience: "buyer",
    group: "messages",
    label: "A settlement request needs your approval",
    blurb: "A provider submitted work for you to approve before it can be paid.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "buyer.timesheet.approval",
    audience: "buyer",
    group: "messages",
    label: "A timesheet needs approving",
    blurb: "Hours were submitted against a work order you own.",
    defaults: { inApp: true, email: false, sms: false },
  },
  /*
    ── ⚠⚠ STEP 5, "Pay Panameer", HAS NO CATEGORY. STOPPED AND REPORTED. ───────

    A buyer-side money category — invoices raised, payment due, payment failed —
    fits NONE of the three tabs, and `E032` was explicit: *"if it does not fit,
    STOP AND REPORT rather than inventing a fourth tab."*

      · `messages` is *"People trying to reach you about work."* An invoice is
        not a person reaching out.
      · `email` is *"What Panameer sends you when you're not here."* That is a
        CHANNEL, not a topic.
      · `tax` is *"Documents and deadlines tied to being paid."* ⚠ TIED TO BEING
        **PAID** — it is framed entirely around the seller receiving money. A
        buyer PAYS. Filing "your invoice is due" under it would put an outgoing
        payment under a heading about incoming ones.

    So no category is declared for it, no fourth tab was invented, and no
    existing tab was re-blurbed to make room. ⚠ THIS IS THE ONE PART OF `E032`
    THAT DID NOT SHIP, and it needs Scott to either name a fourth group or widen
    `tax`'s blurb to cover money in both directions.
  */
  {
    key: "profile.visibility",
    audience: "seller",
    group: "email",
    label: "Profile and visibility",
    blurb:
      "Your profile went live, dropped below the visibility threshold, or is going stale.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "recommendation.received",
    audience: "seller",
    group: "email",
    label: "Recommendations and validations",
    blurb: "Someone you asked wrote you a recommendation, or confirmed a project.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "learn.progress",
    audience: "both",
    group: "email",
    label: "Learn — courses and certifications",
    blurb: "A certification was issued, or a path you're enrolled in was updated.",
    defaults: { inApp: true, email: false, sms: false },
  },
  /*
    ⚠⚠ THE ONE CATEGORY I ADDED, AND SCOTT HAS NOT NAMED IT (`P1-ALL`, 2026-09-01).

    `event_behavior.md` defines `community.joined` and `community.content_added`,
    and NO existing category covers them — the sixteen shipped rows are seller
    lifecycle, buyer lifecycle, tax and product news. The spec's own instruction is
    *"Map new events onto existing categories before creating any"*, and I did:
    nothing fits.

    ⚠ THE ALTERNATIVE WAS WORSE. Leaving them uncategorised would either point
    registry rows at a category that does not exist — which `check:notifications`
    fails the build on, correctly — or drop two events the spec defines, which the
    same harness also fails. So the category exists and the NAME is flagged.
    ⚠ CATEGORY NAMES HAVE BEEN SCOTT'S TO APPROVE SINCE `P1-ALL-E032`. This one is
    CC's. Renaming it is one line here plus two `category:` values in
    `notification-events.ts`; no migration, because preferences key on a string and
    an absent row means these defaults.
    ⚠ `email: false` — email cannot send. Consistent with the buyer rows.
  */
  {
    key: "community.activity",
    audience: "both",
    group: "messages",
    label: "Community activity",
    blurb: "You joined, or something new was added where you follow.",
    defaults: { inApp: true, email: false, sms: false },
  },
  {
    key: "product.updates",
    audience: "both",
    group: "email",
    label: "Product news from Panameer",
    blurb: "New features, and occasional research invitations. Never sales mail.",
    defaults: { inApp: false, email: false, sms: false },
  },
  {
    key: "tax.documents",
    audience: "seller",
    group: "tax",
    label: "Tax documents",
    blurb: "Your annual summary is ready, or a form on file needs renewing.",
    defaults: { inApp: true, email: true, sms: false },
  },
  {
    key: "tax.form_required",
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

/**
 * The categories one person should be offered.
 *
 * ⚠ SOMEBODY WHO IS BOTH SEES BOTH SIDES, which is correct — a dual-role account
 * genuinely receives both kinds of notification. ⚠ AND SOMEBODY WHO IS NEITHER
 * still sees the `both` rows rather than an empty page.
 */
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
