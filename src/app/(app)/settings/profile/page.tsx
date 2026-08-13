import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getProfileSettings, SettingsError } from "@/lib/settings";
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

  /*
    WS-3 — DEGRADE, DON'T THROW.

    `getProfileSettings` calls `ownIds`, which throws SettingsError(NOT_FOUND)
    when the viewer is flagged `is_service_provider` but has no ProviderProfile
    row. Nothing caught it, so the page returned a 500 — found on the
    consolidation walk with a probe account in exactly that state.

    That state is REACHABLE, which is why this is a fix and not a guard against
    the impossible: the seller flag lives on Person and the profile is created
    by onboarding, so anyone flagged before finishing onboarding — an admin
    setting the flag by hand, a seeded account, an abandoned signup — lands
    here. A 500 tells them the product is broken; the truth is that they have
    one step left.

    Only NOT_FOUND is swallowed. INVALID and GATED still throw, because those
    mean something went wrong rather than something has not happened yet.
  */
  let settings: Awaited<ReturnType<typeof getProfileSettings>> | null = null;
  try {
    settings = await getProfileSettings(viewer);
  } catch (e) {
    if (!(e instanceof SettingsError) || e.code !== "NOT_FOUND") throw e;
  }

  if (!settings) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.4px]">
          Let&rsquo;s build your provider profile
        </h1>
        <p className="mt-3 text-[15.5px] text-ink-2">
          Your account is set up as a service provider, but there&rsquo;s no profile
          behind it yet — so there are no profile settings to show. Building it takes a
          few minutes and it&rsquo;s what buyers actually search.
        </p>
        <Link
          href="/join/provider/start"
          className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Build my profile ›
        </Link>
        <Link
          href="/dashboard"
          className="mt-3 block text-[14.5px] font-semibold text-ink-2 underline underline-offset-2 hover:text-magenta"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const me = await getMe(viewer);
  const badge = membershipBadge(me);
  const isPlus = !!badge && !badge.endsWith("Basic");

  return <ProfileSettingsForm settings={settings} isPlus={isPlus} />;
}
