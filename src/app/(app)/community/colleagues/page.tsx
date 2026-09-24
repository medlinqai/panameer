import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { getColleagueRoster } from "@/lib/colleague-roster";
import { ColleagueRoster } from "@/components/community/ColleagueRoster";
import { INVITE_LIMIT_PER_HOUR, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";

/**
 * ── ⚠⚠ `/community/colleagues` — A ROSTER, NOT A DIRECTORY (`P2-J3-E558` WS-A)
 *
 * ⚠ SCOTT, 2026-09-17: *"the search has to be throttled based on class."*
 * ⚠⚠ THE MEMBER-WIDE SEARCH IS GONE FROM THIS PAGE. It is the route 145
 * providers take to reach 13 buyers. `getColleagueRoster` reads only the
 * viewer's own ACCEPTED colleagues, and the search filters that list in memory
 * — there is no endpoint behind the box that could be widened later.
 *
 * ⚠⚠ NO REQUESTS ON THIS PAGE. Accept/Decline live on Home (`E557`). A roster
 * that also handles requests is two jobs in one list.
 */
export default async function ColleaguesPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const rows = viewer ? await getColleagueRoster(viewer) : [];

  return (
    <>
      {/* ⚠⚠ `P2-A3-E612` Q16 — THE SAME FIX `E609` MADE FOR SETTINGS. The
          Connect tab row clipped at 390px: measured 2026-09-23, "Service…" was
          cut off at the right edge. ⚠ `wrap` is opt-in per caller, so this is
          the Connect set and nothing else — an app-wide sweep of every
          `PageTabs` caller is its own brief. */}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        /* ⚠⚠ THE ACTIVE TAB IS `Community`, BECAUSE THIS PAGE IS NOW A SECTION OF
           IT (`P2-J3-E593` WS-A). ⚠ The tab it used to light no longer exists,
           and `PageTabs` matches `current` against a tab's href — an unmatched
           value lights NOTHING, so the row would silently lose its "you are
           here". ⚠ SUPERSEDED, quoted not deleted (`E164`):
           //   current="/community/colleagues" */
        current="/community"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Colleagues
          </h1>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <ColleagueRoster
            rows={rows.map((r) => ({
              connectionId: r.connectionId,
              userId: r.userId,
              name: r.name,
              title: r.title,
              company: r.company,
              /* ⚠ SEARCH-ONLY, and resolved on the SERVER via `E517`'s
                 `shownSkills` (`P2-A3-E596` WS-E). */
              skillNames: r.skillNames,
              photoUrl: r.photoUrl,
              reason: r.reason,
              reasonKind: r.reasonKind,
              buySide: r.buySide,
            }))}
          />

          {/* ── ⚠ INVITE A COLLEAGUE — THE RIGHT RAIL CARD ──────────────────
              ⚠⚠ THE ACCOUNT-MENU REMOVAL IS `E559` WS-D, NOT THIS BRIEF —
              one brief owns `PERSONA_NAV_SECONDARY`. This adds the card; it
              does not take the menu item away. */}
          <aside className="space-y-3">
            <div className="rounded-brand border border-line bg-white p-5">
              <h2 className="font-display text-[15px] font-bold">Invite a Colleague</h2>
              {/*
                ⚠⚠⚠ NO COPY HERE CLAIMS THE INVITEE "ARRIVES ALREADY CONNECTED".
                ⚠ MEASURED 2026-09-17: ACCEPTING CREATES NOTHING.
                `app/invite/colleague/[token]/page.tsx` says so in as many words
                — *"Nothing has been created for you, and {inviter} can't see…"*.
                ⚠ An early draft of the mockup claimed otherwise and was wrong.
                This states what the invitation IS: an invitation from a named
                person, nothing more.
              */}
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                Send someone an invitation from you by name. It is an invitation,
                not a connection — if they join, you still send a colleague
                request like anyone else.
              </p>
              <Link
                href="/invite-colleague"
                className="mt-3 inline-block rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Invite a Colleague
              </Link>
              {/* ⚠ THE REAL LIMITS, BOTH COUNTED IN THE DATABASE. An in-process
                  counter resets every deploy and is per-instance, which on
                  serverless is no limit at all — so the numbers shown here are
                  the ones actually enforced.
                  ⚠ `E433` — figures, so ink rather than magenta. */}
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
                Up to {INVITE_LIMIT_PER_HOUR} an hour and {INVITE_LIMIT_PER_DAY} a
                day.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
