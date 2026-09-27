import { emailConfigured } from "@/lib/email-status";
import {
  categoryEmailSends,
  categoriesThatSendEmail,
} from "@/lib/notification-email";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";
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
      {/*
        ── ⚠⚠⚠ THE PREDICATE CHANGED, AND THAT IS WHAT CLOSES `E658` (`P0-E689` WS-D)

        ⚠⚠ **SCOTT, 2026-09-27:** *"`emailConfigured()` is GLOBAL; the allowlist is
        PER-EVENT. With one event on, the honest screen is neither 'email works'
        nor 'email doesn't' — it is per-category: one sends, seventeen record
        intent."*

        ⚠⚠⚠ **THE OLD LINE WAS ALREADY LYING AND HAD BEEN FOR WEEKS.** It showed
        `EMAIL_UNAVAILABLE_NOTE` only when `!emailConfigured()` — i.e. only when
        `RESEND_API_KEY` was absent — and that key has been set since long before
        the notification layer could send anything. ⚠ **So the note was hidden,
        the Email column was live, and every toggle on it controlled nothing.
        That IS `E658`.**

        ⚠ **THE FACT IS NOW ASKED PER CATEGORY**, on the server, because
        `process.env` is empty in the browser. ⚠⚠ `emailConfigured()` is NOT
        replaced — `categoryEmailSends()` calls it first, so the global fact still
        has exactly one home (`E382`) and the per-event fact is layered on top.
        **One fact, one place, narrowed — not two switches.**

        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   {!emailConfigured() && (<p …>{EMAIL_UNAVAILABLE_NOTE}</p>)}
        //   <NotificationSettings emailEnabled={emailConfigured()} …/>
      */}
      <NotificationSettings
        emailSendsFor={Object.fromEntries(
          NOTIFICATION_CATEGORIES.map((c) => [c.key, categoryEmailSends(c.key)])
        )}
        emailConfigured={emailConfigured()}
        sendingCount={categoriesThatSendEmail().length}
        totalCategories={NOTIFICATION_CATEGORIES.length}
        prefs={prefs}
        isSeller={viewer.isServiceProvider || viewer.isServiceCoordinator}
        isBuyer={viewer.isServiceBuyer}
      />
    </>
  );
}
