import type { NotificationEventKey } from "@/lib/notification-events";

/**
 * ── ⚠⚠⚠ THE EVENT ALLOWLIST. **IT SHIPS EMPTY, AND THAT IS THE DELIVERABLE.**
 *
 * `P0-E689` WS-B. ⚠ **Scott, 2026-09-27:** *"Ship the sender behind an explicit
 * allowlist of event keys, starting with one."* ⚠⚠ **AND FOR THIS RUN HE IS
 * AWAY, SO IT STARTS WITH NONE:** the SUPER RUN says **WS-B ships with the event
 * allowlist EMPTY — the sender exists, the wiring is proved under capture, and
 * no event is switched on. Which event goes first is Scott's.**
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
export const NOTIFICATION_EMAIL_EVENTS: readonly NotificationEventKey[] = [];

/**
 * ⚠⚠ THE ONE QUESTION THE SENDER ASKS. ⚠ A function rather than an inline
 * `.includes` so there is one definition to find, one to mutate, and one for the
 * gate to name as the catcher (`E585`, `E607`).
 */
export function notificationEmailAllowed(event: NotificationEventKey): boolean {
  return NOTIFICATION_EMAIL_EVENTS.includes(event);
}
