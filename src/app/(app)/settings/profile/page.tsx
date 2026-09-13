import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getProfileSettings, SettingsError } from "@/lib/settings";
import { membershipBadge } from "@/lib/membership";
import { getMe } from "@/lib/me";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { CompletenessChecklist } from "@/components/console/CompletenessChecklist";
import { completenessChecklist, VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { buildCompletenessInput } from "@/lib/onboarding";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";

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
  /* ⚠⚠ BACK TO `canProvideServices` (`P2-J1.1-E050`), AND THAT IS NOT A REVERSAL
     OF `E046` — IT IS THE JUDGEMENT `E046` ASKED FOR. Scott opened the tree so
     fit could be judged by USING the pages; he then walked it as a buyer and
     judged this one seller-only.
     ⚠ SUPERSEDED, quoted: `guardPage("authenticated")`, and before that
     `guardPage("canProvideServices")` — the value returns, the reasoning does
     not. ⚠ ONE OF THREE LAYERS: `route-access.ts` narrows the prefix and
     `settings-nav.ts` declares the tab's `requires`. `settings/layout.tsx`
     deliberately STAYS `authenticated` — it gates the whole tree. */
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

  /*
    ── ⚠ THE BREAKDOWN, NOT A SECOND NUMBER (`P1-A1.5-E489`) ─────────────────

    > **Scott:** *"we have 10 objects that can be completed, you have content in
    > 7 of those… your profile is estimated to be at 70%"*

    ⚠⚠ `settings.completeness` IS THE ONLY PERCENTAGE ON THIS PAGE. The existing
    score is WEIGHTED (skills 18, overview 8), so a required-only profile is 88
    while "7 of 10" would read 70 — both on screen, disagreeing, which is `E462`
    rebuilt. What Scott wanted is not a second number but WHICH SECTIONS ARE
    EMPTY, and a list cannot contradict anything.
    ⚠ The checklist reads the SAME input the scorer reads, from
    `buildCompletenessInput`, so the rows cannot drift from the number above them.
  */
  /* ⚠ OWNER-SCOPED: the profile is resolved FROM THE SESSION via
     `ownedProviderProfile`, never taken from client input. */
  const owned = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  const input = owned ? await buildCompletenessInput(owned.id) : null;

  return (
    <>
      {input && (
        <div className="mb-5">
          <CompletenessChecklist
            completeness={settings.completeness}
            rows={completenessChecklist(input)}
            threshold={VISIBILITY_THRESHOLD}
          />
        </div>
      )}
      <ProfileSettingsForm settings={settings} isPlus={isPlus} />
    </>
  );
}
