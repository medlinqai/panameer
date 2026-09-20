import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { tabsWithUnread, unreadCount } from "@/lib/messages";
import { ConnectHome } from "@/components/community/ConnectHome";
import { CommunityWeb } from "@/components/community/CommunityWeb";
import { getCommunityWeb } from "@/lib/community-web";
import "@/components/community/community-web.css";

/**
 * ── ⚠⚠ `/community` IS THE COMMUNITY PAGE — THE PEOPLE (`P2-J3-E591` WS-A) ──
 *
 * ⚠⚠⚠ ONE ROUTE WAS RENDERING TWO PAGES. This file rendered `ConnectProfile`
 * for a provider and `ConnectHome` for everybody else, so `/community` meant
 * the PROFILE to half its callers and the PEOPLE to the other half.
 * ⚠ **The profile moved to `/connect`.** What is left here is Connect Home,
 * unchanged, which is what this route rendered before `E588` WS-A and what it
 * has always rendered for buyers.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the branch this file carried
 * between `E588` WS-A and `E591` WS-A, and the four data calls that went with
 * it. ⚠⚠ THEY WERE MOVED TO `(app)/connect/page.tsx`, NOT DUPLICATED:
 * //   const profile = viewer ? await getOwnProviderProfileView(viewer.userId, viewer) : null;
 * //   {viewer && profile ? (
 * //     <ConnectProfile
 * //       p={profile}
 * //       taughtPaths={await getPathsTaughtByProfile(profile.id)}
 * //       testimonials={await publicTestimonials(profile.id)}
 * //       community={await getCommunitySignalForProfile(profile.id)}
 * //       colleagueCount={(await getMyCommunity(viewer)).colleagues.length}
 * //       score={await ownerScore(profile.id)}
 * //     />
 * //   ) : ( … the block below … )}
 * ⚠ `ownerScore()` and the `buildCompletenessInput` / `computeProfileScore`
 * imports went with them, for the same reason.
 *
 * ⚠⚠ HOME IS "WHAT NEEDS YOU", NOT A SUMMARY OF THE SECTION. The blocks are
 * Waiting on you · Your colleagues · People you may know · Teams, and every
 * list is CAPPED and hands off to the tab that owns it.
 * ⚠⚠⚠ NO FEED, NO FORUMS BLOCK, NO UNREAD-MESSAGES BLOCK — see `ConnectHome`.
 * A block that duplicates a destination in the menu above it is the pattern
 * being removed.
 *
 * ⚠ THE PAGE ITSELF IS `E591` WS-C's JOB. WS-A is the ROUTE SPLIT and nothing
 * more — this body is byte-for-byte what the fallback rendered yesterday.
 */
export default async function CommunityPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every page
     in this row, so the number is the same wherever you are standing. */
  const unread = viewer ? await unreadCount(viewer) : 0;

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={tabsWithUnread(PAGE_TABS["/connect"], unread)}
        current="/community"
      />
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            My Community
          </h1>
        </header>
        {/*
          ⚠⚠ THE WEB IS THE PAGE'S HERO (`P2-J3-E591` WS-B). ⚠ The FIRST
          picture is server-rendered and handed down as a prop — every later
          cycle is built from `/api/community/web`, so the rebuild is tied to
          re-fetched data rather than to a clock.
          ⚠ WS-C moves it into a two-column layout; WS-B only puts it on the
          page so it can be walked and screenshotted.
        */}
        {viewer && <CommunityWeb initial={await getCommunityWeb(viewer)} />}
        {viewer && <ConnectHome viewer={viewer} />}
      </div>
    </>
  );
}
