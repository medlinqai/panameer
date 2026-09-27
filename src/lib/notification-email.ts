import {
  NOTIFICATION_EVENTS,
  type NotificationEventKey,
} from "@/lib/notification-events";
import { emailConfigured } from "@/lib/email-status";
import { finishLaterTemplate } from "@/lib/email/templates/finish-later";
import { notificationEmail } from "@/lib/email/templates/notification";

/**
 * ── ⚠⚠⚠ THE EVENT ALLOWLIST. **ONE EVENT IS ON.** ─────────────────────────
 *
 * `P0-E689`. ⚠ **Scott, 2026-09-27:** *"Ship the sender behind an explicit
 * allowlist of event keys, starting with one."*
 *
 * ⚠⚠ **CORRECTED (rule 6 / §6) — THIS BLOCK SAID "IT SHIPS EMPTY" AND THAT IS
 * NO LONGER TRUE.** WS-B shipped it empty on purpose, because Scott was away and
 * **which event goes first was his to name.** ⚠ He named it in WS-C:
 * `account.finish_later`. **A comment that still said "empty" would send the
 * next reader looking for a bug in the sender.**
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   THE EVENT ALLOWLIST. IT SHIPS EMPTY, AND THAT IS THE DELIVERABLE.
 * //   AND FOR THIS RUN HE IS AWAY, SO IT STARTS WITH NONE: the SUPER RUN says
 * //   WS-B ships with the event allowlist EMPTY - the sender exists, the wiring
 * //   is proved under capture, and no event is switched on.
 *
 * ── ⚠⚠⚠ WHY AN ALLOWLIST AND NOT "JUST READ THE PREFERENCE" ────────────────
 *
 * ⚠ **MEASURED 2026-09-27: 18 categories, ALL 18 defaulting `email: true`, and
 * `NotificationPreference` holds ZERO ROWS.** So every member on this build is
 * on defaults, and a sender that trusted the preference alone **would email
 * everybody for every event they trigger, the moment it merged.**
 * ⚠⚠ **AND THE DEFAULTS MAY NOT BE CHANGED TO STOP THAT — `E382` FORBIDS IT**
 * (*"it silently rewrites what every user is opted into"*), and ruling 34b's
 * `check:notify-prefs` already overruled one attempt to ship `email: false`.
 * ⚠⚠⚠ **SO THE ALLOWLIST IS WHAT MAKES THE SENDER SAFE TO MERGE WITHOUT
 * TOUCHING A SINGLE MEMBER'S RECORDED INTENT.** Every event not on it records
 * intent and does not send — **which is exactly today's behaviour preserved, not
 * a new suppression.**
 *
 * ── ⚠⚠ ADDING A KEY HERE IS A PRODUCT DECISION, NOT A REFACTOR ─────────────
 *
 * ⚠ It turns real email on, to real members, from a database that also serves
 * production (ruling 38). ⚠⚠ **BEFORE ADDING ONE:** confirm the event's `href`
 * is reachable by the recipient's own capability (`E680(b)` — an href can send a
 * member to a page they cannot open), and run the gate, which checks exactly
 * that for every key in this list.
 */
export const NOTIFICATION_EMAIL_EVENTS: readonly NotificationEventKey[] = [
  /*
    ── ⚠⚠⚠ THE FIRST EVENT. **SCOTT NAMED IT, 2026-09-27.** ─────────────────

    ⚠ *"`account.finish_later` is the first event. Turn it on AND remove the
    transactional send in the SAME commit — it is the only genuine double-send,
    so the member's experience is unchanged: one email before, one after."*

    ⚠⚠ **IT IS THE ONLY EVENT THAT CAN GO FIRST WITHOUT CHANGING ANYBODY'S MAIL
    VOLUME**, because it is the only one where a transaction and a notification
    already fire for the same person on the same act. Every other allowlisted
    event would be a NEW email to somebody.
  */
  "account.finish_later",
];

/**
 * ⚠⚠ THE ONE QUESTION THE SENDER ASKS. ⚠ A function rather than an inline
 * `.includes` so there is one definition to find, one to mutate, and one for the
 * gate to name as the catcher (`E585`, `E607`).
 */
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
  /** The `template` literal on the receipt — `E522` requires one per sender. */
  template: string;
};

/**
 * ── ⚠⚠⚠ ONE TEMPLATE PER EVENT, **WHERE AN EVENT HAS EARNED ONE** (`P0-E689` WS-C)
 *
 * ⚠⚠ **WS-B DEFERRED THIS AND SAID SO. WS-C IS WHERE IT EARNS ITS KEEP.** The
 * brief's WS-B item 5 reads *"Templates: one per event"*; WS-B shipped the
 * row-driven renderer instead, because 40+ templates for an EMPTY allowlist
 * would have been `E585` built on purpose. ⚠ **Now there is a live event, and it
 * turns out to need its own.**
 *
 * ── ⚠⚠⚠ WHY `account.finish_later` COULD NOT USE THE GENERIC RENDERER ──────
 *
 * ⚠⚠ **SCOTT'S RULING WAS THAT THE MEMBER'S EXPERIENCE IS UNCHANGED — *"one
 * email before, one after."*** ⚠ The link is genuinely unchanged: the registry's
 * `href` is `/join/requester/steps`, **byte-identical** to the `resumeUrl` the
 * transactional send used. ⚠⚠⚠ **BUT THE WORDS ARE NOT.** The registry says
 * *"Continue your registration"* / *"You saved your registration for later. Pick
 * up where you left off."*; the shipped email says *"New Service Buyer —
 * Continue Your Registration on Panameer"* and carries **Scott's verbatim copy**,
 * which `finish-later.ts`'s own docblock protects by name: *"THE COPY IS
 * SCOTT'S, VERBATIM, AND IS NOT PARAPHRASED."*
 * ⚠⚠ **SO ROUTING IT THROUGH THE GENERIC RENDERER WOULD HAVE SWAPPED HIS WORDS
 * FOR A PARAPHRASE WHILE REPORTING "UNCHANGED."** The count would have been
 * right and the email would have been different — ⚠⚠⚠ **and "one email" is a
 * claim about the member's experience, not about a number.**
 *
 * ⚠ **THE REGISTRY'S SHORTER WORDING IS NOT WASTED AND MUST NOT BE "FIXED" TO
 * MATCH:** it is the BELL entry, where a one-line title is correct. **Two
 * surfaces, two lengths, one event** — that is not `E585`, because they are
 * genuinely different renderings and neither is derived from the other.
 */
const PER_EVENT: Partial<
  Record<NotificationEventKey, (i: NotificationMailInput) => RenderedMail>
> = {
  "account.finish_later": (i) => {
    const t = finishLaterTemplate({
      firstName: i.firstName ?? "",
      /* ⚠ THE ROW'S OWN `href`, not a second copy of the path. If the registry
         ever moves the wizard, the email follows it — the drift `E585` is about.
         ⚠⚠ The fallback is the wizard, never `/dashboard`: `check:email` asserts
         that this button *"lands on the wizard, never /dashboard"*. */
      resumeUrl: i.link ?? "/join/requester/steps",
      /*
        ⚠⚠ `buyer` IS CORRECT AND IT IS MEASURED, NOT ASSUMED. The template
        supports a provider variant and `check:email` tests both, but **only one
        route has ever called it** — `api/onboarding/requester/finish-later` —
        and it passed `audience: "buyer"`. ⚠ There is no provider finish-later
        caller anywhere in `src/`. ⚠⚠⚠ **IF ONE IS EVER ADDED, THIS LINE IS THE
        THING THAT HAS TO CHANGE**, and it will not announce itself — the event
        key is shared, so the provider would silently receive buyer wording.
      */
      audience: "buyer",
      logoUrl: i.logoUrl,
    });
    return { ...t, template: "finish-later" };
  },
};

/**
 * ⚠ The renderer for an event: its own template when it has one, the row-driven
 * one otherwise. ⚠⚠ **ONE ENTRY POINT, so the sender never branches on the event
 * key itself** — adding a template is an edit to the map above and nowhere else.
 */
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

/** ⚠ Read by the gate so it can assert the map without importing its internals. */
export const PER_EVENT_TEMPLATE_KEYS = Object.keys(PER_EVENT) as NotificationEventKey[];

/**
 * ── ⚠⚠⚠ DOES THIS CATEGORY'S EMAIL ACTUALLY SEND? (`P0-E689` WS-D) ─────────
 *
 * ⚠⚠ **SCOTT, 2026-09-27, REJECTING MY PARK AS MIS-SPECIFIED:** *"`emailConfigured()`
 * is GLOBAL; the allowlist is PER-EVENT. With one event on, the honest screen is
 * neither 'email works' nor 'email doesn't' — it is per-category: one sends,
 * seventeen record intent."*
 *
 * ⚠⚠⚠ **THAT IS WHAT CLOSES `E658` RATHER THAN RESTATING IT.** The old predicate
 * was *"is there a key"* — `emailConfigured()`, `Boolean(RESEND_API_KEY)` — which
 * has been **true for weeks while the notification layer sent nothing**, so the
 * Email column was already live and already lying. ⚠ The new predicate is **"is
 * this category's event on the allowlist"**, which is the question the member's
 * toggle is actually asking.
 *
 * ⚠ **BOTH HALVES ARE REQUIRED AND NEITHER IS REDUNDANT:** a key with no
 * allowlisted event sends nothing, and an allowlisted event with no key sends
 * nothing either. ⚠⚠ **THE GLOBAL FACT IS NOT REPLACED, IT IS NARROWED** —
 * `emailConfigured()` keeps its job and `email-status.ts` keeps being the one
 * place that answers it.
 *
 * ⚠ **A CATEGORY WITH NO EVENTS AT ALL ANSWERS `false`, CORRECTLY** — and there
 * are **seven** of them today (`milestone.due`, `buyer.provider.responded`,
 * `buyer.work_order.status`, `buyer.timesheet.approval`, `product.updates`,
 * `tax.documents`, `tax.form_required`). ⚠⚠ **THEY ARE A STRONGER FORM OF
 * "RECORDS INTENT": nothing fires for them in ANY channel, not even the bell.**
 * Reported at the WS-D gate as its own finding; **not given a third UI state,
 * because Scott named two.**
 */
export function categoryEmailSends(categoryKey: string): boolean {
  if (!emailConfigured()) return false;
  return NOTIFICATION_EMAIL_EVENTS.some(
    (k) => (NOTIFICATION_EVENTS[k] as { category?: string } | undefined)?.category === categoryKey
  );
}

/**
 * ⚠ Every category that sends today, for the gate and for the screen's summary
 * line. ⚠⚠ Derived, never listed by hand — a hand-kept second list is the
 * `E585` this whole module exists to avoid.
 */
export function categoriesThatSendEmail(): string[] {
  return [
    ...new Set(
      NOTIFICATION_EMAIL_EVENTS.map(
        (k) => (NOTIFICATION_EVENTS[k] as { category?: string } | undefined)?.category
      ).filter((c): c is string => !!c)
    ),
  ];
}
