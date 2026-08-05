import { guardPage } from "@/lib/guard";
import { getProfileSettings } from "@/lib/settings";
import { membershipBadge } from "@/lib/membership";
import { getMe } from "@/lib/me";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";

/**
 * PROFILE SETTINGS (J2.4 WS-H / E015).
 *
 * Visibility · Project preference · Earnings privacy (Plus) · Categories ·
 * Linked accounts · AI data-training preference.
 *
 * TWO DELIBERATE ABSENCES, both from the Part-1 confirms:
 *
 *   EXPERIENCE LEVEL IS GONE (Confirm #1). The Entry/Intermediate/Expert
 *   self-pick contradicts the locked decision to DERIVE years of experience
 *   from work history and drop the self-report (E068). Re-adding a self-graded
 *   field here would have put two answers to one question in the product, and
 *   the derived one is the honest one.
 *
 *   CATEGORIES ARE PANAMEER'S CATALOG (Confirm #2) — Role → Domain → Skill, as
 *   this provider actually claimed them. Not a competitor's taxonomy, and
 *   read-only here: the picker is a wizard step with its own role filtering and
 *   its own cap, and a second editor for the same rows is how two views of one
 *   dataset drift apart.
 */
export const metadata = { title: "Profile Settings · Panameer" };

export default async function ProfileSettingsPage() {
  const viewer = await guardPage("canProvideServices");
  const [settings, me] = await Promise.all([
    getProfileSettings(viewer),
    getMe(viewer),
  ]);
  const badge = membershipBadge(me);
  const isPlus = !!badge && !badge.endsWith("Basic");

  return <ProfileSettingsForm settings={settings} isPlus={isPlus} />;
}
