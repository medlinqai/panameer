import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import Link from "next/link";
/* ⚠ `ConnectHome` IS NO LONGER RENDERED BY THIS PAGE (`E591` WS-C) and is
   NOT deleted (`E164`). It is still the body nothing else imports; see the
   note on `CommunityBody` below.
   // import { ConnectHome } from "@/components/community/ConnectHome"; */
import { CommunityHero } from "@/components/community/CommunityHero";
import { CommunityRail } from "@/components/community/CommunityRail";
/* ⚠ `WaitingOnYou` IS NO LONGER IMPORTED HERE — it moved to the rail
   (`P2-A3-E596` WS-C item 1) and an unused import is a lint warning, i.e.
   one NEW problem against a baseline whose rule is zero. ⚠ SUPERSEDED,
   quoted not deleted (`E164`):
   //   import { JoinedCard, InvitedCardView, WaitingOnYou } from "@/components/community/ColleagueCards";
   ⚠⚠ THE MOVE IS STILL RECORDED where the component used to render, a few
   lines down — that quote is the one a reader needs. */
import { JoinedCard, InvitedCardView } from "@/components/community/ColleagueCards";
import { getMyCommunity } from "@/lib/connections";
import { getCommunityWeb } from "@/lib/community-web";
import { getCommunityHero } from "@/lib/community-hero";
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
        tabs={connectTabs(viewer, unread)}
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
  const [web, page, mine, hero] = await Promise.all([
    getCommunityWeb(viewer),
    getCommunityPage(viewer),
    getMyCommunity(viewer),
    /* ⚠ Fetched alongside the rest, not in a nested await — four independent
       reads for one screen. */
    getCommunityHero(viewer),
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
    <>
      {/*
        ⚠⚠⚠ THE HERO SPANS THE FULL WIDTH, **ABOVE** THE TWO-COLUMN BODY
        (`P2-A3-E601` WS-B). ⚠ That is the approved mockup's structure — a
        split card across the top, then `Colleagues` and the rail underneath —
        and Scott's WS-B item 2 says the rail comes *"underneath"*.
        ⚠⚠ IT WAS FIRST BUILT INSIDE THE MAIN COLUMN, WHICH PUT THE RAIL BESIDE
        THE HERO and squeezed the picture to 403px on a 1440px screen. ⚠ Caught
        by rendering it at desktop width and comparing against the mockup, not
        by any gate — the markup was valid and typechecked either way.
      */}
      <CommunityHero web={web} hero={hero} />

      <div className="pm-cm">
        <div className="min-w-0 space-y-5">
          {/*
          ── ⚠⚠ `Waiting on You` MOVED TO THE RAIL (`P2-A3-E596` WS-C item 1) ──

          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   {/* ⚠⚠⚠ FIRST, BECAUSE IT IS THE ONLY BLOCK WHERE SOMEBODY ELSE IS
          //       BLOCKED ON THIS MEMBER — and because without it an incoming
          //       colleague request has NO DOOR IN THE APP AT ALL. * /}
          //   <WaitingOnYou rows={incoming} />

          ⚠⚠ THE REASON IT WAS FIRST STILL STANDS — it is still the only door to
          an incoming request in the whole app — which is why it moved to the TOP
          OF THE RAIL rather than down the page. Scott: it *"returns the web to
          the top"*, and on a phone the rail now leads (`order: -1`), so the
          block gets MORE prominent there, not less.
        */}
        {/*
          ⚠⚠ THE WEB IS THE PAGE'S HERO (`E591` WS-B). ⚠ The FIRST picture is
          server-rendered and handed down as a prop — every later cycle is built
          from `/api/community/web`, so the rebuild is tied to re-fetched data
          rather than to a clock.

          ⚠⚠⚠ IT IS NOW THE LEFT HALF OF A SPLIT CARD (`P2-A3-E601` WS-B item 1).
          Scott: *"Split-card at the top, cleanly structured underneath."* The
          picture keeps every behaviour it had — its legend, its drawn-line and
          `E600` WS-D's 15-second rebuild badge all live inside `CommunityWeb`
          and are untouched. ⚠ ONLY THE FRAME AROUND IT IS NEW.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <CommunityWeb initial={web} />
        */}
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

        <CommunityRail viewer={viewer} mine={mine} incoming={incoming} />
      </div>
    </>
  );
}
