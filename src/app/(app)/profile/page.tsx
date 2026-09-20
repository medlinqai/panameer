import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { EmployeeProfile } from "@/components/profile/EmployeeProfile";
/*
  ⚠ FIVE IMPORTS LEFT WITH THE PROVIDER BRANCH (`P2-J3-E588` WS-A) — this page
  is a REDIRECT now and fetches nothing. ⚠ SUPERSEDED, quoted not deleted
  (`E164`):
  // import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
  // import { getPathsTaughtByProfile } from "@/lib/learn-home";
  // import { publicTestimonials } from "@/lib/recommendations";
  // import { getCommunitySignalForProfile } from "@/lib/community-signal";
  // import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
  ⚠⚠ `/community/page.tsx` NOW MAKES THE SAME FOUR CALLS. They moved with the
  surface; they were not dropped.
*/

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

  /*
    ── ⚠⚠ THE PROFILE MOVED OUT OF SETTINGS (`P2-J3-E588` WS-A) ──────────────

    ⚠⚠⚠ SCOTT RULED THE OPPOSITE ON 2026-09-17 — *"profile and profile strength
    move under Settings"* — and it was built that way. **Rule 13: the newest
    dated statement from Scott is the live one.** 2026-09-19: *"connect is now
    'build your profile and connect to other profiles'."*

    ⚠⚠ A REDIRECT, NOT A DELETION. `/profile` is linked from the band's account
    menu, from `/stats`, from onboarding and from older briefs; deleting the
    route would 404 every one of them. ⚠ ONE SURFACE, NO SECOND COPY — which is
    the acceptance criterion this satisfies.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the provider branch of this page:
    // const profile = await getOwnProviderProfileView(viewer.userId, viewer);
    // if (!profile) return <EmployeeProfile userId={viewer.userId} />;
    // return (
    //   <ProviderProfileViewPage
    //     p={profile}
    //     taughtPaths={await getPathsTaughtByProfile(profile.id)}
    //     testimonials={await publicTestimonials(profile.id)}
    //     community={await getCommunitySignalForProfile(profile.id)}
    //   />
    // );
    ⚠⚠ `/community` CARRIES THE SAME NON-PROVIDER FALLBACK, so a member with no
    provider profile is not redirected into an empty page — it renders the
    Connect landing for them, exactly as `EmployeeProfile` did here.
  */
  redirect("/community");
}
