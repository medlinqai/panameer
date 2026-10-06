import {
  NOTIFICATION_EVENTS,
  type NotificationEventKey,
} from "@/lib/notification-events";
import { emailConfigured } from "@/lib/email-status";
import { finishLaterTemplate } from "@/lib/email/templates/finish-later";
import { notificationEmail } from "@/lib/email/templates/notification";

export const NOTIFICATION_EMAIL_EVENTS: readonly NotificationEventKey[] = [
  "account.finish_later",
  "colleague.invite_received",
  "message.received",
  "work.settlement_approval",
  "payment.sent",
  // Scott 2026-10-04: every action-needed event emails by default (members can switch each off).
  "profile.visibility_off",
  "profile.details_needed",
  "profile.country_unknown",
  "group.join_requested",
  "company.join_requested",
  "company.join_approved",
  "company.join_declined",
  "group.question_asked",
  "work.proposal_received",
  "work.invited_to_propose",
  "work.interview_requested",
  "work.test_requested",
  "work.order_offered",
  "shop.offer_received",
  "shop.offer_accepted",
  "shop.offer_denied",
];

export function notificationEmailAllowed(event: NotificationEventKey): boolean {
  return NOTIFICATION_EMAIL_EVENTS.includes(event);
}

/** What the sender hands a renderer: the row, plus who is receiving it. */
export type NotificationMailInput = {
  firstName: string | null;
  title: string;
  body: string | null;
  /** The row's `href`, already resolved to an absolute URL. */
  link: string | null;
  logoUrl: string;
};
export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
  template: string;
};

const PER_EVENT: Partial<
  Record<NotificationEventKey, (i: NotificationMailInput) => RenderedMail>
> = {
  "account.finish_later": (i) => {
    const t = finishLaterTemplate({
      firstName: i.firstName ?? "",
      resumeUrl: i.link ?? "/join/requester/steps",
      audience: "buyer",
      logoUrl: i.logoUrl,
    });
    return { ...t, template: "finish-later" };
  },
};

export function renderNotificationMail(
  event: NotificationEventKey,
  input: NotificationMailInput
): RenderedMail {
  const own = PER_EVENT[event];
  if (own) return own(input);
  const generic = notificationEmail({
    firstName: input.firstName,
    title: input.title,
    body: input.body,
    href: input.link,
    logoUrl: input.logoUrl,
  });
  return { ...generic, template: "notification" };
}

export const PER_EVENT_TEMPLATE_KEYS = Object.keys(PER_EVENT) as NotificationEventKey[];

export function categoryEmailSends(categoryKey: string): boolean {
  if (!emailConfigured()) return false;
  return NOTIFICATION_EMAIL_EVENTS.some(
    (k) => (NOTIFICATION_EVENTS[k] as { category?: string } | undefined)?.category === categoryKey
  );
}

export function categoriesThatSendEmail(): string[] {
  return [
    ...new Set(
      NOTIFICATION_EMAIL_EVENTS.map(
        (k) => (NOTIFICATION_EVENTS[k] as { category?: string } | undefined)?.category
      ).filter((c): c is string => !!c)
    ),
  ];
}
