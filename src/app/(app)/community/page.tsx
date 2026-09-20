import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { tabsWithUnread, unreadCount } from "@/lib/messages";
import { ConnectHome } from "@/components/community/ConnectHome";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { getPathsTaughtByProfile } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { getMyCommunity } from "@/lib/connections";
/* ⚠ `P2-J3-E590` WS-C — the completion card needs the per-line breakdown, which
   the stored column cannot carry. Computed from `buildCompletenessInput`, the
   one write path, so the card and the score page cannot disagree. */
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";

/**
 * ── ⚠⚠ `/community` IS CONNECT HOME (`P2-J3-E557` WS-B) ────────────────────
 *
 * ⚠ IT WAS THE COLLEAGUES LANDING. That body MOVED to
 * `/community/colleagues` — it was not rewritten and nothing a member could do
 * yesterday is missing today.
 *
 * ⚠⚠ HOME IS "WHAT NEEDS YOU", NOT A SUMMARY OF THE SECTION. The blocks are
 * Waiting on you · Your colleagues · People you may know · Teams, and every
 * list is CAPPED and hands off to the tab that owns it.
 * ⚠⚠⚠ NO FEED, NO FORUMS BLOCK, NO UNREAD-MESSAGES BLOCK — see `ConnectHome`.
 * A block that duplicates a destination in the menu above it is the pattern
 * being removed.
 */
export default async function ConnectHomePage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every page
     in this row, so the number is the same wherever you are standing. */
  const unread = viewer ? await unreadCount(viewer) : 0;

  /*
    ── ⚠⚠ CONNECT HOME IS NOW THE PROFILE (`P2-J3-E588` WS-A) ────────────────

    ⚠⚠⚠ SCOTT, 2026-09-19: *"connect is now 'build your profile and connect to
    other profiles'."*

    ⚠⚠ THE NON-PROVIDER FALLBACK IS NOT A HEDGE, IT IS REQUIRED. `Connect` is in
    the BUYER menu too (`REQUESTER_NAV`), and a requester has no
    `ProviderProfile` — so there is no profile to render for them. They keep the
    landing page. ⚠ A provider gets their profile; everyone else gets what they
    had yesterday, which is also what `ConnectHome`'s own header promises.

    ⚠ `ConnectHome` IS NOT DELETED AND IS STILL IMPORTED (`E164` — every removed
    component stays on disk). It simply stops being what a PROVIDER sees here.
  */
  const profile = viewer ? await getOwnProviderProfileView(viewer.userId, viewer) : null;

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/community")}
        tabs={tabsWithUnread(PAGE_TABS["/community"], unread)}
        current="/community"
      />
      {viewer && profile ? (
        <ConnectProfile
          p={profile}
          taughtPaths={await getPathsTaughtByProfile(profile.id)}
          testimonials={await publicTestimonials(profile.id)}
          community={await getCommunitySignalForProfile(profile.id)}
          colleagueCount={(await getMyCommunity(viewer)).colleagues.length}
          score={await ownerScore(profile.id)}
        />
      ) : (
        /*
          ⚠ SUPERSEDED FOR PROVIDERS, quoted not deleted (`E164`) — this is what
          `/community` rendered for everybody before WS-A, and it is still what a
          buyer or a member with no provider profile sees:
          // <div className="mx-auto max-w-5xl space-y-5">
          //   <header><h1 …>My Community</h1></header>
          //   {viewer && <ConnectHome viewer={viewer} />}
          // </div>
        */
        <div className="mx-auto max-w-5xl space-y-5">
          <header>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
              My Community
            </h1>
          </header>
          {viewer && <ConnectHome viewer={viewer} />}
        </div>
      )}
    </>
  );
}

/**
 * ⚠ The owner's score breakdown, or `null` when the input cannot be built.
 * ⚠⚠ NULL RENDERS NO CARD — better than a ring of zeroes that asserts a
 * provider has answered nothing.
 */
async function ownerScore(profileId: string) {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProfileScore(input) : null;
}
