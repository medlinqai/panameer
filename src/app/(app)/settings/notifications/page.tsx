import { emailConfigured } from "@/lib/email-status";
import {
  categoryEmailSends,
  categoriesThatSendEmail,
} from "@/lib/notification-email";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";
import { guardPage } from "@/lib/guard";
import { getNotificationPrefs } from "@/lib/settings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export const metadata = { title: "Notification Settings · Panameer" };

export default async function NotificationsPage() {
  const viewer = await guardPage("authenticated");
  const prefs = await getNotificationPrefs(viewer);
  return (
    <>
      {}
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
