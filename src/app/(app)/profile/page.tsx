import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { getPathsTaughtByProfile } from "@/lib/learn-home";
import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
import { EmployeeProfile } from "@/components/profile/EmployeeProfile";

/**
 * MY PROFILE (WS7 / WS8, E004 / E006 / E155).
 *
 * TWO PROFILE TYPES, chosen by who is asking:
 *
 *   Panameer employee  → EmployeeProfile: name, title, contact, company. No
 *                        résumé, rates, skills or work history, because an
 *                        admin performing setup has none of those in the
 *                        marketplace sense. Patterned after Medlinq's
 *                        MEDLINQ_ADMIN.
 *   Provider           → the BRANDED ProviderProfileView.
 *
 * E155 is fixed by that second line. This page used to render
 * `@/components/ProfileView` — the older greyscale component whose text is
 * white on white in the app shell, so the content was present but invisible.
 * ProviderProfileView is the branded one every other surface already uses, so
 * "my profile" and "what buyers see" stop being two different renderings of
 * the same record.
 *
 * Server-rendered now rather than fetching client-side: it already knows who is
 * asking, and the old version's loading skeleton existed only because it didn't.
 */
export default async function MyProfilePage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fprofile");

  // A Panameer employee gets the employee profile even if a seeded provider row
  // still exists behind them — the row is demo noise, not their identity.
  if (viewer.isSystemAdmin) return <EmployeeProfile userId={viewer.userId} />;

  const profile = await getOwnProviderProfileView(viewer.userId, viewer);
  if (!profile) return <EmployeeProfile userId={viewer.userId} />;

  return (
    <ProviderProfileViewPage
      p={profile}
      taughtPaths={await getPathsTaughtByProfile(profile.id)}
    />
  );
}
