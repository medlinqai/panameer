import { guardPage } from "@/lib/guard";
import { listMentors } from "@/lib/mentors";
/*
  ⚠⚠ FIVE IMPORTS CAME OUT WITH THE UNGATED LIST (`P2-J3-E558` WS-C2), and that
  is not tidying — they were its ONLY consumers on this page.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):

      import Link from "next/link";
      /* ⚠ `P1-ALL-E374` — the platform anchor is parked in `lib/mentors.ts`. The
         rate shown here is the provider's own, through the one decided rule. *\/
      import { rateDisplay, NO_RATE_PUBLISHED } from "@/lib/rate-display";
      import { ConnectControls } from "@/components/community/ConnectControls";
      import { Avatar } from "@/components/Avatar";

  ⚠ `ConnectControls` and `Avatar` still render — inside `FindAMentor`, which
  imports them itself. ⚠⚠ `rateDisplay` DOES NOT, and that is a deliberate
  consequence: the mentor rows no longer print a rate, because a rate beside a
  `Follow as a Mentor` button reads as a price for a session nobody can buy.
  ⚠ `check:community` asserts this file never calls `formatCents`; it still
  does not, and now it does not format money at all.
*/
import { getSessionViewer } from "@/lib/session";
import { getMyCommunity } from "@/lib/connections";
import { getMentoringHome, helpfulAnswersByPerson } from "@/lib/mentoring-home";
import { OpenForMentoringToggle } from "@/components/community/OpenForMentoringToggle";
import { MentoringPanels } from "@/components/community/MentoringPanels";
import { FindAMentor } from "@/components/community/FindAMentor";
/* ⚠ `formatCents` IS NO LONGER IMPORTED HERE (`P1-ALL-E374`). This page used to
   format money itself — a half-range printed as "Their project rate". That is
   now `rateDisplay`'s job, and `check:community` asserts this file does NOT
   call `formatCents`, so the null case cannot be skipped by formatting a value
   straight out of the row. */
// import { formatCents } from "@/lib/display";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
/* ⚠ `P1-ALL-E379` — the unread badge rides on the shared tab row. */
import { tabsWithUnread, unreadCount } from "@/lib/messages";

/**
 * FIND A MENTOR — the directory shell (PHASE 2 / WS2-E).
 *
 * REAL PROVIDERS, NOT FIXTURES. Every card is a marketplace-visible profile read
 * through the same predicate the public marketplace uses, so a card can never
 * show somebody the marketplace itself would hide. A directory of invented
 * experts would be the most damaging fake data in this whole build: it
 * advertises people who cannot be booked.
 *
 * SHELL, and the page says which parts are which. There is no `MentorProfile`
 * yet, so nobody has OPTED IN to mentoring and nobody has priced a session —
 * PHASE 4 adds that model, the storefront and the booking. So these are
 * providers who are ELIGIBLE, labelled as such, and the Book button routes to a
 * placeholder rather than pretending a booking exists.
 *
 * THE RATE ANCHOR IS THE PLATFORM'S, NOT THE PERSON'S. $49.99 / 15 min is the
 * product anchor; it is rendered as the anchor and explicitly not as a quote,
 * because none of these people has set one. Their own published hourly range is
 * shown separately where they have one — that IS theirs.
 */
/* ⚠ THE THIRD PLACE `Find a Mentor` LIVED, AND `E374` MISSED IT (`P1-ALL-E378`).
   The heading and the tab were renamed; this browser-tab title was not, so the
   page said `Mentoring` while the tab strip in the OS said `Find a Mentor`.
   ⚠ `Mentoring` NAMES THE TOPIC, NOT THE PEOPLE — `E374` established that nobody
   is a mentor until asked, so a label presenting people as mentors advertises a
   consent nobody gave. */
export const metadata = { title: "Mentoring · Panameer" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  await guardPage("authenticated");
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every
     page that renders this tab row. Zero renders nothing. */
  const unreadViewer = await getSessionViewer();
  const unread = unreadViewer ? await unreadCount(unreadViewer) : 0;
  const { skill } = await searchParams;
  /* ⚠⚠ `P2-J3-E558` WS-C2 — `openOnly` IS THE GATE. Only providers who chose to
     be found as a mentor appear, ever. It defaults to FALSE on the column, so
     this returns nothing until somebody opts in — correct, and the empty state
     recruits rather than the gate widening. */
  const mentors = await listMentors({
    skill: skill?.trim() || undefined,
    openOnly: true,
  });

  /* ⚠ WHO I HAVE ALREADY CONNECTED TO AS A MENTOR, so a card that is already
     connected reads `Disconnect` rather than offering the same action twice.
     ⚠ THIS IS A JOIN BETWEEN TWO LIB READS, NOT A RULE — `getMyCommunity`
     computed `following` and the lib refuses SELF on the way in regardless. */
  const viewer = await getSessionViewer();
  const mine = viewer ? await getMyCommunity(viewer) : null;
  const mentorUserIds = new Set(
    (mine?.following ?? []).filter((f) => f.person).map((f) => f.person!.userId)
  );
  const viewerUserId = viewer?.userId ?? null;

  /* ⚠ `P2-J3-E558` WS-C1 — the panels: demand, who I follow, my signal, and the
     paid-sessions STATE TABLE. */
  const home = viewer ? await getMentoringHome(viewer) : null;

  /*
    ⚠ WS-C2 — the signal for each result row, ONE GROUPED QUERY rather than one
    per card. ⚠⚠ Reads `marked_helpful_at` and only that, the same rule as the
    WS-C1 panel.
    ⚠ SELF IS EXCLUDED: you cannot follow yourself as a mentor, and a row with
    no action on it reads as broken. The empty state says so out loud.
  */
  const visible = mentors.filter((m) => m.userId && m.userId !== viewerUserId);
  const signals = await helpfulAnswersByPerson(visible.map((m) => m.personId));

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs
        eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={tabsWithUnread(PAGE_TABS["/connect"], unread)} current="/community/mentors" />
      <div className="mx-auto max-w-5xl space-y-5">
      <header>
        {/* ⚠⚠ NOBODY ON THIS PAGE IS CALLED A MENTOR, AND THAT IS THE POINT
            (`P1-ALL-E374`). Under Scott's rule a member becomes a mentor when
            somebody ASKS them to be one — *"the determining factor is if anyone
            wants you to be...and therefore makes a request from you."* So a page
            that presents people AS mentors advertises a consent nobody gave,
            which is the exact failure `lib/mentors.ts`'s own header was written
            to avoid. THIS PAGE OFFERS PEOPLE YOU CAN ASK.
            ⚠ THE HEADING KEPT THE WORD `Mentor` ONLY AS THE THING YOU ASK FOR —
            "Ask for mentoring", not "here are mentors". Reported verbatim in the
            `E374` report so Scott can overrule the wording. */}
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Ask for Mentoring
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Every member can be asked. These are practitioners on Panameer whose
          profiles show the work — connect as a mentor and their published rate
          is what applies.
        </p>
      </header>

      {/* ⚠⚠ THE HONEST FRAME, REWRITTEN FOR THE NEW MODEL (`P1-ALL-E374`).
          ⚠ SUPERSEDED, QUOTED NOT DELETED — it used to read: *"Mentoring opens
          in a later release... None has set a price or opted in yet, so nothing
          here is bookable, and the buttons say so."* Every clause of that is now
          wrong: there is no opt-in to wait for, the rate is already set, and
          connecting works today. What has NOT changed is that PAYING is not
          built — that runs on WorkRequest -> WorkOrder -> Settlement and there is
          NO BUY BUTTON anywhere, because a checkout that goes nowhere is worse
          than none. */}
      <section className="rounded-brand border border-dashed border-magenta/30 bg-magenta/[0.03] p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <b className="text-ink">Connecting is free and immediate.</b> Nobody
          here has to accept, opt in or be approved — asking is what makes
          somebody a mentor. Their rate is the one they published. Paying for
          time through Panameer arrives with the rest of the commerce path; until
          then you arrange it between yourselves.
        </p>
      </section>

      {/* ── ⚠⚠ `P2-J3-E558` WS-C1 — THE CONSENT AND THE PANELS ─────────────
          ⚠ The toggle renders only for someone who HAS a provider profile: it
          is a declaration about what THEY will do, so it cannot be offered to
          somebody with nothing to declare it about. */}
      {home?.openForMentoring !== null && home !== null && (
        <OpenForMentoringToggle initial={home.openForMentoring} />
      )}
      {home && (
        <MentoringPanels
          followers={home.followers.map((f) => ({
            connectionId: f.connectionId,
            userId: f.userId,
            name: f.name,
            title: f.title,
            photoUrl: f.photoUrl,
          }))}
          followingMentors={home.followingMentors}
          helpfulAnswers={home.helpfulAnswers}
        />
      )}

      {/*
        ── ⚠⚠ FIND A MENTOR (`P2-J3-E558` WS-C2) ────────────────────────────

        ⚠ SUPERSEDED, QUOTED NOT DELETED (`E164`) — this page used to render an
        UNGATED list of every marketplace-visible provider as mentor candidates,
        with its own empty state:

            {mentors.length === 0 ? (
              <section …>
                {skill ? `Nobody matches “${skill}” yet.` : "No profiles are complete enough yet."}
                A provider appears here once their profile is visible in the
                marketplace — title, role, skills, rate and photo. That gate is
                the same one buyers search against.
              </section>
            ) : ( …the two carousels… )}

        ⚠⚠ THAT LIST PRESENTED PEOPLE AS ASKABLE WHO HAD NEVER AGREED TO BE, which
        is exactly the harm `open_for_mentoring` exists to prevent. The gate is
        now `openOnly: true` and the completeness sentence is gone with it — the
        reason a profile is absent is no longer completeness, it is CONSENT, and
        the empty state says so.
      */}
      <FindAMentor
        skill={skill?.trim() ?? ""}
        openForMentoring={home?.openForMentoring ?? null}
        viewerUserId={viewerUserId}
        results={visible.map((m) => ({
          profileId: m.profileId,
          userId: m.userId,
          personId: m.personId,
          name: m.name,
          headline: m.headline,
          photoUrl: m.photoUrl,
          skills: m.skills,
          helpfulAnswers: signals.get(m.personId) ?? 0,
          alreadyFollowing: mentorUserIds.has(m.userId ?? ""),
        }))}
      />
    </div>
    </>
  );
}
