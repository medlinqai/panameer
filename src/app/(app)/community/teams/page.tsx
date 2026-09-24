/*
  ⚠⚠ THREE IMPORTS CAME OUT WITH THE OLD SINGLE-VIEW BODY (`P2-J3-E558` WS-D) —
  they were its only consumers here. ⚠ SUPERSEDED, quoted not deleted (`E164`):

      import Link from "next/link";
            
  ⚠ `Avatar` still renders — inside `TeamSections`, which imports it itself.
  ⚠⚠ `relativeDay` DOES NOT, and that is a consequence worth naming: the roster
  rows show CONSENT STATE rather than a date. "Awaiting" is the fact that
  matters; "invited 3 days ago" invites a reader to judge somebody for being
  slow to answer, which is not a judgement this page should prompt.
*/
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { getMyTeams, incomingRosterInvites, rosterCoverage } from "@/lib/teams";
import { hasCapability } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  ProviderTeamSections,
  RecruiterTeamSections,
} from "@/components/community/TeamSections";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
/* ⚠ `P1-ALL-E379` — the unread badge rides on the shared tab row. */
import { unreadCount } from "@/lib/messages";

/**
 * MY TEAMS (PHASE 2 / WS2-D) — REAL, reading data that already existed.
 *
 * brief_I built the Service Coordinator model and `/coordinator` has been
 * rendering a roster off it. What was missing was anywhere for the OTHER side
 * to see it: a provider on somebody's roster had no way to know, and the
 * relationship only appeared in a console non-coordinators cannot open.
 *
 * So this reads both directions — who you represent, and who represents you —
 * and each half renders independently because a person can be both, one, or
 * neither. Nothing is fabricated: a person with no team sees an honest empty
 * state that says what a team is and how one starts.
 */
export const metadata = { title: "My Teams · Panameer" };

export default async function MyTeamsPage() {
  await guardPage("authenticated");
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every
     page that renders this tab row. Zero renders nothing. */
  const unreadViewer = await getSessionViewer();
  const unread = unreadViewer ? await unreadCount(unreadViewer) : 0;
  const viewer = await getSessionViewer();
  const teams = viewer
    ? await getMyTeams(viewer)
    : { represents: [], pendingInvites: [], representedBy: null, isCoordinator: false };

  /* ⚠⚠ GATED ON CAPABILITIES, INDEPENDENTLY — never on `roleWord()`. */
  const canProvide = viewer ? hasCapability(viewer, "canProvideServices") : false;
  const canCoordinateTeams = viewer ? hasCapability(viewer, "canCoordinate") : false;

  const invites = viewer ? await incomingRosterInvites(viewer) : [];

  /* ⚠ THE RECRUITER'S OWN PERSON ID, so coverage rolls up their roster. */
  const mePerson = viewer
    ? await prisma.person.findUnique({
        where: { user_id: viewer.userId },
        select: { id: true },
      })
    : null;
  const coverage =
    canCoordinateTeams && mePerson ? await rosterCoverage(mePerson.id) : [];

  /*
    ⚠⚠ ONE ROSTER LIST WITH ITS CONSENT STATE, not two lists side by side.
    Accepted members come from `represents` (they set `coordinator_person_id`,
    so acceptance is a fact); awaiting ones are the PENDING invites this person
    sent. ⚠ "Nobody is added silently" is only checkable if both states appear in
    the SAME list — two separate lists let a reader miss one.
  */
  const roster = [
    ...teams.represents.map((m) => ({
      key: m.profileId,
      name: m.name,
      headline: m.headline,
      photoUrl: m.photoUrl,
      consent: "accepted" as const,
    })),
    ...teams.pendingInvites.map((i) => ({
      key: i.id,
      name: i.name ?? i.email,
      headline: null,
      photoUrl: null,
      consent: "awaiting" as const,
    })),
  ];

  /* ⚠ `Recruiters you know` — the coordinator representing me, plus anyone who
     has asked. ⚠⚠ NOT A DIRECTORY: it is people with an actual relation to this
     viewer, which is the same scoping rule the Colleagues roster follows. */
  const recruitersKnown = [
    ...(teams.representedBy ? [teams.representedBy] : []),
    ...invites.map((i) => i.recruiter),
  ];

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      {/* ⚠⚠ ACTIVE TAB = `Community`: this page is a SECTION of it since
          `E593` WS-A. An unmatched `current` lights nothing. ⚠ SUPERSEDED
          (`E164`): current="/community/teams" */}
      {/* ⚠⚠ `P2-A3-E612` Q16 — THE SAME FIX `E609` MADE FOR SETTINGS. The
          Connect tab row clipped at 390px: measured 2026-09-23, "Service…" was
          cut off at the right edge. ⚠ `wrap` is opt-in per caller, so this is
          the Connect set and nothing else — an app-wide sweep of every
          `PageTabs` caller is its own brief. */}
      <PageTabs
        wrap
        eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/community" />
      <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          My Teams
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          The providers you represent, and the recruiter who represents you.
        </p>
      </header>

      {/*
        ── ⚠⚠ TWO SECTION SETS, GATED INDEPENDENTLY (`P2-J3-E558` WS-D) ──────

        ⚠⚠⚠ NOT AN EITHER/OR. 10 PEOPLE HOLD BOTH A COORDINATOR AND A PROVIDER
        JOB (measured 2026-09-18; the brief said 8). Each set is gated on its own
        `hasCapability()` call, so a dual-role person sees BOTH in one render.
        ⚠ NEVER `roleWord()` — it is the one-word header badge, single-valued on
        purpose, and gating on it would force the either/or the data says is
        wrong for 10 people.

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — this page rendered ONE
        undifferentiated view with a combined "You're not on a team yet" empty
        state and an `isCoordinator` boolean deciding a single CTA:

            {nothingAtAll && ( …"You're not on a team yet."… )}
            {teams.representedBy && ( …UP: who represents me… )}
            {teams.represents.length > 0 && ( …DOWN: who I represent… )}

        ⚠⚠ THAT SHAPE COULD NOT SHOW BOTH SETS, which is the whole point of WS-D.
      */}
      {canProvide && (
        <ProviderTeamSections
          representedBy={teams.representedBy}
          invites={invites}
          recruitersKnown={recruitersKnown}
        />
      )}

      {canCoordinateTeams && (
        <RecruiterTeamSections roster={roster} coverage={coverage} />
      )}

      {!canProvide && !canCoordinateTeams && (
        <p className="text-[14px] leading-relaxed text-ink-2">
          Teams are for providers and recruiters. Your account is neither, so
          there is nothing here for you yet.
        </p>
      )}
    </div>
    </>
  );
}
