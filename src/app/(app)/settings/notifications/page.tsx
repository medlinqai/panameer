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
  const viewer = await guardPage("canProvideServices");
  const prefs = await getNotificationPrefs(viewer);
  return <NotificationSettings prefs={prefs} />;
}
