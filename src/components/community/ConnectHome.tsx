import Link from "next/link";
import { getMyCommunity, type PersonCard } from "@/lib/connections";
import { getColleagueSuggestions } from "@/lib/colleague-suggestions";
import { profileIdsByPersonId } from "@/lib/provider-rates";
import { ConnectControls } from "@/components/community/ConnectControls";
import { MemberRow } from "@/components/community/MemberRow";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ CONNECT HOME — "WHAT NEEDS YOU" (`P2-J3-E557` WS-B) ─────────────────
 *
 * ⚠⚠ NO NEW MODELS. Every block is assembled from `Connection` and
 * `getColleagueSuggestions`, both of which already existed. If this file ever
 * needs a table, the answer is that the block is wrong.
 *
 * ⚠⚠⚠ THERE IS NO FEED, NO FORUMS BLOCK AND NO UNREAD-MESSAGES BLOCK, AND THAT
 * IS THE POINT OF THE REDESIGN — not an omission. Forums has its own tab and
 * Messages becomes its own application (`E560`). ⚠ A BLOCK THAT DUPLICATES A
 * DESTINATION IN THE MENU ABOVE IT IS THE PATTERN BEING REMOVED: it teaches
 * people the tabs are decorative.
 *
 * ⚠ IT IS DELIBERATELY NOT `CommunityBlocks`. That component renders five
 * blocks including Your mentors and the mentor count, and it is still the body
 * of `/community/colleagues`. Home is a SHORTER, ACTIONABLE set — capped lists
 * that hand off to the tab that owns them.
 */

/** ⚠ Home caps every list. It is a landing, not a directory. */
const CAP = 3;

function Heading({
  children,
  seeAll,
}: {
  children: React.ReactNode;
  seeAll?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-[17px] font-bold">{children}</h2>
      {/* ⚠ `See all` GOES TO THE TAB THAT OWNS THE LIST, never to a fourth
          place. The cap is what makes the hand-off honest. */}
      {seeAll && (
        <Link
          href={seeAll.href}
          className="text-[13.5px] font-semibold text-magenta hover:underline"
        >
          {seeAll.label}
        </Link>
      )}
    </div>
  );
}

export async function ConnectHome({ viewer }: { viewer: Viewer }) {
  const mine = await getMyCommunity(viewer);
  const suggestions = await getColleagueSuggestions(viewer);

  const incoming = mine.incoming.filter((r) => r.person);
  const colleagues = mine.colleagues.filter((c) => c.person);

  const shownColleagues = colleagues.slice(0, CAP);
  const shownSuggestions = suggestions.slice(0, CAP);

  /*
    ── ⚠⚠⚠ IT ASKS FOR THE LINK, NOT THE RATE (`P2-J3-E591` WS-C item 7) ────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   Rates are fetched only for the rows actually rendered — a capped list
    //   that queries the whole set is a cap in the UI and not in the work.
    //   const [colleagueFacts, suggestionFacts, incomingFacts] = await Promise.all([
    //     ratesByPersonId(shownColleagues.map((c) => c.person!.personId)),
    //     ratesByPersonId(shownSuggestions.map((s) => s.person.personId)),
    //     ratesByPersonId(incoming.map((r) => r.person!.personId)),
    //   ]);

    ⚠⚠ THE CAPPING REASONING ABOVE IS STILL TRUE AND STILL APPLIES — only the
    QUESTION changed. ⚠⚠⚠ THESE THREE CALLS READ `hourly_rate_cents`,
    `rate_min_cents`, `rate_max_cents` AND `currency` OFF EVERY PERSON SHOWN,
    formatted them, and then used ONLY `.profileId`. No rate string ever reached
    the DOM — ⚠ but Scott's rule is about the QUERY, because a rate omitted from
    a render and present in a payload is still disclosed, and the formatted
    string was sitting one prop away from `MemberRow`'s `rate`.
    ⚠ `profileIdsByPersonId` selects two columns and cannot carry one.
  */
  const [colleagueFacts, suggestionFacts, incomingFacts] = await Promise.all([
    profileIdsByPersonId(shownColleagues.map((c) => c.person!.personId)),
    profileIdsByPersonId(shownSuggestions.map((s) => s.person.personId)),
    profileIdsByPersonId(incoming.map((r) => r.person!.personId)),
  ]);

  return (
    <div className="space-y-6">
      {/* ── 1 · WAITING ON YOU ──────────────────────────────────────────────
          ⚠⚠ FIRST, BECAUSE IT IS THE ONLY BLOCK WHERE SOMEBODY ELSE IS BLOCKED
          ON THIS MEMBER. Everything below is an invitation; this is a debt. */}
      <section className="space-y-3">
        <Heading>Waiting on You</Heading>
        {incoming.length === 0 ? (
          /*
            ⚠⚠ THE EMPTY STATE MATTERS MORE THAN THE FULL ONE, and it is ONE
            LINE PLUS ONE NEXT STEP — never an empty container. A bordered box
            with nothing in it reads as a thing that failed to load.
            ⚠ ONE next step, not three: a landing that offers a menu of things
            to do when nothing needs you is a second menu.
          */
          <p className="text-[14px] leading-relaxed text-ink-2">
            Nothing is waiting on you.{" "}
            <Link
              href="/community/colleagues"
              className="font-semibold text-magenta hover:underline"
            >
              Find people you have worked with
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {incoming.map((r) => (
              <MemberRow
                key={r.connectionId}
                person={r.person as PersonCard}
                profileId={incomingFacts.get(r.person!.personId)}
              >
                {/* ⚠ `showDecline` — `Decline` IS A REAL BUTTON (`E374`), not a
                    hidden menu item, and it is single-click with no confirm.
                    Nothing is destroyed: the row is UPDATED, never deleted. */}
                <ConnectControls
                  toUserId={r.person!.userId}
                  relation="PENDING"
                  incomingConnectionId={r.connectionId}
                  showDecline
                />
              </MemberRow>
            ))}
          </div>
        )}
      </section>

      {/* ── 2 · YOUR COLLEAGUES ─────────────────────────────────────────── */}
      {colleagues.length > 0 && (
        <section className="space-y-3">
          <Heading
            seeAll={
              colleagues.length > CAP
                ? { href: "/community/colleagues", label: `See all ${colleagues.length}` }
                : undefined
            }
          >
            Your Colleagues
          </Heading>
          <div className="space-y-2">
            {shownColleagues.map((c) => (
              <MemberRow
                key={c.connectionId}
                person={c.person as PersonCard}
                profileId={colleagueFacts.get(c.person!.personId)}
              >
                {/* ⚠ `relation="ACCEPTED"` IS A FACT, NOT A GUESS —
                    `getMyCommunity` builds `colleagues` by filtering
                    `kind === "COLLEAGUE" && status === "ACCEPTED"`. */}
                <ConnectControls toUserId={c.person!.userId} relation="ACCEPTED" />
              </MemberRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 3 · PEOPLE YOU MAY KNOW ─────────────────────────────────────── */}
      {shownSuggestions.length > 0 && (
        <section className="space-y-3">
          <Heading>People You May Know</Heading>
          {/* ⚠⚠ EVERY CARD CARRIES ITS REASON VERBATIM, and some read as
              nonsense — *"You were both at Founder & Principal Consultant"*.
              THAT IS EXPECTED AND THEY SHIP ANYWAY (`P1-J1.4-E373`):
              `Employer.name` holds job titles for consultants. ⚠ NO HEURISTIC
              HIDES THEM — it would mask a data defect that needs fixing. */}
          <div className="space-y-2">
            {shownSuggestions.map((s) => (
              <MemberRow
                key={s.person.userId}
                person={s.person}
                reason={s.reason}
                profileId={suggestionFacts.get(s.person.personId)}
              >
                <ConnectControls toUserId={s.person.userId} relation={null} />
              </MemberRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 4 · TEAMS ───────────────────────────────────────────────────────
          ⚠ AN EXPLAINER, NOT AN EMPTY LIST. The viewer is on no team and there
          is no join flow yet, so a bordered box with a zero in it would be a
          feature pretending to exist. This says what a team IS and points at
          the tab that owns it. */}
      <section className="space-y-3">
        <Heading>Teams</Heading>
        <div className="rounded-brand border border-line bg-white p-5">
          <p className="text-[14px] leading-relaxed text-ink-2">
            A team is a group of providers who take work together, so a buyer
            can hire the group rather than assemble one.{" "}
            <Link
              href="/community/teams"
              className="font-semibold text-magenta hover:underline"
            >
              See how teams work
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
