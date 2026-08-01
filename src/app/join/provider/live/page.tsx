import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";

/**
 * PAGE 1 — "You're live" (brief_provider_home_page_v2 WS1, E146.4 / E135).
 *
 * The END of onboarding, and a page in its own right. Publishing used to land
 * on /dashboard, which rendered the full profile view — so the confirmation,
 * the profile and the app hub were one page and none of them read clearly.
 * Now: publish lands HERE, this page says one thing ("you're live, here's what
 * buyers see"), and its CTA hands off to Home.
 *
 * WORK HISTORY IS CONDENSED so the whole thing fits a screen. That is the E146
 * complaint, and it is the difference between a confirmation and a scroll: a
 * provider with seven roles and two lines of description each is three screens
 * deep before the sections below even start. Read More still opens any of them.
 */
export default async function YoureLivePage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fjoin%2Fprovider%2Flive");

  const profile = await getOwnProviderProfileView(viewer.userId, viewer);
  // No provider profile means this page has nothing to confirm.
  if (!profile) redirect("/dashboard");

  return (
    <ProviderProfileViewPage
      p={profile}
      condensedWorkHistory
      banner={
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-brand border border-emerald-500/30 bg-emerald-50/60 p-5">
          <div>
            <p className="text-[17px] font-bold">
              {profile.visible
                ? "🎉 You're live — buyers can find you"
                : `You're published at ${profile.completeness}% — reach ${profile.visibilityThreshold}% to appear in buyer searches`}
            </p>
            <p className="mt-1 text-[14px] text-ink-2">
              {profile.visible
                ? "Keep your profile fresh to stay near the top of buyer searches."
                : "Complete the remaining details to become visible to service buyers."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden w-40 sm:block">
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-magenta transition-[width] duration-500"
                  style={{ width: `${Math.min(100, profile.completeness)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[12px] font-bold text-magenta">
                {profile.completeness}%
              </p>
            </div>
            <Link
              href="/join/provider?step=finish"
              className="rounded-full border-[1.5px] border-line bg-white px-5 py-2.5 font-bold transition-colors hover:border-magenta hover:text-magenta"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      }
      footer={
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-8 text-center">
          <p className="text-[15px] text-ink-2">
            That&apos;s your profile as buyers see it. Now go and use Panameer.
          </p>
          <Link
            href="/dashboard"
            className="rounded-full bg-magenta px-8 py-3 text-[15.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Start searching &amp; learning →
          </Link>
        </div>
      }
    />
  );
}
