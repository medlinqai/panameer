import { emailConfigured, EMAIL_UNAVAILABLE_NOTE } from "@/lib/email-status";
import { guardPage } from "@/lib/guard";
import { getNotificationPrefs } from "@/lib/settings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

/**
 * NOTIFICATION SETTINGS (J2.4 WS-H / E020).
 *
 * Three tabs — Messages · Email updates · Tax settings — and a CHANNEL choice
 * per notification: In-App · Email · SMS.
 *
 * CATEGORIES MAP TO PANAMEER'S EVENT MODEL, not to a competitor's list: a buyer
 * opening a conversation, a work order moving, a milestone settling, a Learn
 * certification issued. `event_behavior.md` stays the authoritative catalog and
 * rewriting it is explicitly out of scope; this is the UI's view of it, and
 * adding a category later is a data change rather than a migration.
 *
 * SMS IS WIRED TO THE STUBBED TWILIO PATH and the page says so. Push is
 * deferred with the mobile app. A channel that silently never fires is worse
 * than one labelled as not sending yet.
 */
export const metadata = { title: "Notification Settings · Panameer" };

export default async function NotificationsPage() {
  /*
    ⚠⚠ `authenticated`, NOT `canProvideServices` (`P1-ALL`, 2026-09-01).

    ⚠ SUPERSEDED, quoted: `guardPage("canProvideServices")`.

    This page holds the FIVE BUYER CATEGORIES shipped in `98f9675`, and the guard
    meant a buyer could not open the settings page that owns their own
    preferences. Filed as blocking in `event_behavior.md`; this is the fix.
    ⚠ NOT A WEAKENING: the rows are now filtered BY AUDIENCE below, so a seller
    still does not see buyer categories and vice versa. The gate stopped the wrong
    people entering; the filter shows the right people the right rows.
  */
  const viewer = await guardPage("authenticated");
  const prefs = await getNotificationPrefs(viewer);
  return (
    <>
      {/* ⚠ ONE HONEST LINE (`P1-ALL-E382`), shown only while the pipe is down.
          It disappears on its own when `E371` lands — nothing to remember. */}
      {!emailConfigured() && (
        <p className="mb-4 rounded-brand border border-dashed border-line px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
          {EMAIL_UNAVAILABLE_NOTE}
        </p>
      )}
      {/* ⚠ `emailConfigured()` IS THE SAME FUNCTION `notify()` CALLS
          (`P1-ALL-E382`) — read HERE, on the server, because `process.env` is
          empty in the browser. One fact, two readers, never two switches. */}
      <NotificationSettings
        emailEnabled={emailConfigured()}
        prefs={prefs}
        isSeller={viewer.isServiceProvider || viewer.isServiceCoordinator}
        isBuyer={viewer.isServiceBuyer}
      />
    </>
  );
}
