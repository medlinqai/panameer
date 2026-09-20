import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { tabsWithUnread, unreadCount } from "@/lib/messages";
import Link from "next/link";
/* ⚠ `ConnectHome` IS NO LONGER RENDERED BY THIS PAGE (`E591` WS-C) and is
   NOT deleted (`E164`). It is still the body nothing else imports; see the
   note on `CommunityBody` below.
   // import { ConnectHome } from "@/components/community/ConnectHome"; */
import { CommunityWeb } from "@/components/community/CommunityWeb";
import { CommunityRail } from "@/components/community/CommunityRail";
import { JoinedCard, InvitedCardView, WaitingOnYou } from "@/components/community/ColleagueCards";
import { getMyCommunity } from "@/lib/connections";
import { getCommunityWeb } from "@/lib/community-web";
import { getCommunityPage } from "@/lib/community-page";
import type { Viewer } from "@/lib/access";
import "@/components/community/community-web.css";
import "@/components/community/community-page.css";

/**
 * ── ⚠⚠ `/community` IS THE COMMUNITY PAGE — THE PEOPLE (`P2-J3-E591` WS-A) ──
 *
 * ⚠⚠⚠ ONE ROUTE WAS RENDERING TWO PAGES. This file rendered `ConnectProfile`
 * for a provider and `ConnectHome` for everybody else, so `/community` meant
 * the PROFILE to half its callers and the PEOPLE to the other half.
 * ⚠ **The profile moved to `/connect`.** ⚠⚠ AND SINCE WS-C THIS IS NO LONGER
 * CONNECT HOME EITHER — it is the Community page: the web, the colleague cards,
 * and a rail. ⚠ SUPERSEDED, quoted not deleted (`E164`), true only between WS-A
 * and WS-C:
 * //   What is left here is Connect Home, unchanged, which is what this route
 * //   rendered before `E588` WS-A and what it has always rendered for buyers.
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
 * ⚠⚠ THE RULE THAT SURVIVED FROM `ConnectHome` AND STILL BINDS: NO FEED, NO
 * FORUMS BLOCK, NO UNREAD-MESSAGES BLOCK. ⚠ A block that duplicates a
 * destination in the menu above it is the pattern being removed — it teaches
 * people the tabs are decorative.
 *
 * ⚠⚠⚠ AND WHAT THIS PAGE MUST NEVER GROW: a PROFILE COMPLETION summary
 * (`E590` owns it, and its home is My Profile — WS-C item 2), and ANY RATE
 * BELONGING TO SOMEBODY ELSE (WS-C item 7). Both are gated.
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
        {viewer && <CommunityBody viewer={viewer} />}
      </div>
    </>
  );
}

/**
 * ── ⚠⚠ TWO COLUMNS: COLLEAGUES MAIN, SMALL THINGS IN A RAIL (WS-C 1) ──────
 *
 * ⚠ The web is the hero at the top of the main column; the colleague cards sit
 * under it; Mentors and Teams are in the rail because they are 0–2 rows for
 * almost everybody.
 *
 * ⚠⚠ `ConnectHome` IS NO LONGER RENDERED HERE, AND IT IS NOT DELETED (`E164`).
 * Three of its four blocks are superseded by this page. ⚠⚠⚠ THE FOURTH —
 * *Waiting on You* — IS CARRIED OVER DELIBERATELY, AND NEARLY WAS NOT:
 * `check:connect-walk` failed when it vanished, and the reason it matters is
 * that **nothing else in the app renders an incoming colleague request.**
 * `/community/colleagues` shows the roster, not the pending asks, so dropping
 * this block left no way to accept or decline one at all. ⚠ A wall, not a
 * cosmetic loss.
 * ⚠ *People You May Know* HAS NO SLOT IN THE WS-C LAYOUT and IS dropped —
 * ⚠⚠ REPORTED AT THE GATE, NOT SILENTLY. It strands nothing: it is a discovery
 * aid, not a door, and no one is blocked on it.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this page rendered between
 * `E591` WS-B and WS-C:
 * //   {viewer && <CommunityWeb initial={await getCommunityWeb(viewer)} />}
 * //   {viewer && <ConnectHome viewer={viewer} />}
 */
async function CommunityBody({ viewer }: { viewer: Viewer }) {
  /* ⚠ `getMyCommunity` IS FETCHED ONCE AND PASSED DOWN. The rail wants the
     mentor half and this column wants the incoming half — two calls would be
     two identical round trips for one answer. */
  const [web, page, mine] = await Promise.all([
    getCommunityWeb(viewer),
    getCommunityPage(viewer),
    getMyCommunity(viewer),
  ]);
  const incoming = mine.incoming
    .filter((r) => r.person)
    .map((r) => ({
      connectionId: r.connectionId,
      userId: r.person!.userId,
      name: r.person!.name,
      title: r.person!.title,
      photoUrl: r.person!.photoUrl,
    }));

  return (
    <div className="pm-cm">
      <div className="min-w-0 space-y-5">
        {/* ⚠⚠⚠ FIRST, BECAUSE IT IS THE ONLY BLOCK WHERE SOMEBODY ELSE IS
            BLOCKED ON THIS MEMBER — and because without it an incoming
            colleague request has NO DOOR IN THE APP AT ALL. See the component. */}
        <WaitingOnYou rows={incoming} />
        {/*
          ⚠⚠ THE WEB IS THE PAGE'S HERO (`E591` WS-B). ⚠ The FIRST picture is
          server-rendered and handed down as a prop — every later cycle is built
          from `/api/community/web`, so the rebuild is tied to re-fetched data
          rather than to a clock.
        */}
        <CommunityWeb initial={web} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px] font-bold">Your Colleagues</h2>
            {page.colleagues.length > 0 && (
              <Link
                href="/community/colleagues"
                className="text-[13.5px] font-semibold text-magenta hover:underline"
              >
                See All {page.colleagues.length}
              </Link>
            )}
          </div>

          {page.colleagues.length === 0 && page.invited.length === 0 ? (
            /* ⚠ ONE LINE AND ONE NEXT STEP. An empty grid reads as a thing that
               failed to load. */
            <p className="text-[14px] leading-relaxed text-ink-2">
              Nobody here yet.{" "}
              <Link
                href="/invite-colleague"
                className="font-semibold text-magenta hover:underline"
              >
                Invite a Colleague
              </Link>
              .
            </p>
          ) : (
            <div className="pm-cm-cards">
              {page.colleagues.map((c) => (
                <JoinedCard key={c.connectionId} c={c} />
              ))}
              {/* ⚠⚠ INVITED PEOPLE SIT IN THE SAME GRID, IN A DIFFERENT SHAPE.
                  They are part of the community the page is about — hiding them
                  in a separate section would make an unanswered invitation feel
                  like a failure rather than a state. */}
              {page.invited.map((i) => (
                <InvitedCardView key={i.id} i={i} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CommunityRail viewer={viewer} mine={mine} />
    </div>
  );
}
