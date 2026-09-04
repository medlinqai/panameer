import { getMyCommunity, searchMembers, type PersonCard } from "@/lib/connections";
import { getColleagueSuggestions } from "@/lib/colleague-suggestions";
import { ratesByPersonId } from "@/lib/provider-rates";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import { MemberRow } from "@/components/community/MemberRow";
import type { Viewer } from "@/lib/access";

/**
 * THE `/community` BLOCKS (`P1-ALL-E374` WS-1 + WS-2).
 *
 * ⚠⚠ `E372` BUILT THE WHOLE ENGINE AND NOTHING RENDERED IT. This file is that
 * rendering and almost nothing else — every decision it appears to make was
 * already made in `lib/connections.ts`, `lib/colleague-suggestions.ts` and
 * `lib/rate-display.ts`, which is where `check:community` can see them.
 *
 * ⚠ THE ONLY THING RESOLVED HERE IS WHICH INCOMING REQUEST BELONGS TO WHICH
 * SEARCH RESULT, and that is a join between two lib reads, not a rule: a
 * `PENDING` row I did not send is one I can accept, and `getMyCommunity`
 * already separated `incoming` from `outgoing` to say which is which.
 *
 * ⚠⚠ THE WORD `FOLLOW` APPEARS IN NO RENDERED STRING IN THIS FILE. The verb is
 * `Connect as mentor` / `Disconnect`. `followMentor` and `"FOLLOWING"` keep
 * their names in the lib deliberately — see `ConnectControls`.
 */

function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="font-display text-[17px] font-bold">
      {children}
      {count !== undefined && <span className="ml-2 text-[14px] text-ink-2">{count}</span>}
    </h2>
  );
}

/* ── SEARCH RESULTS — replaces the blocks while a query is live ─────────── */
export async function SearchResults({ viewer, query }: { viewer: Viewer; query: string }) {
  const [results, mine] = await Promise.all([
    searchMembers(viewer, query),
    getMyCommunity(viewer),
  ]);

  /* ⚠ WHICH PENDING ROWS ARE MINE TO ACCEPT. `relation` alone cannot say — it
     is `"PENDING"` whether I sent it or they did — and the ACCEPT button needs
     the connection id regardless. Both come from `incoming`, which the lib
     already isolated. */
  const incomingByUser = new Map(
    mine.incoming
      .filter((r) => r.person)
      .map((r) => [r.person!.userId, r.connectionId] as const)
  );
  const mentorUserIds = new Set(
    mine.following.filter((f) => f.person).map((f) => f.person!.userId)
  );
  const facts = await ratesByPersonId(results.map((r) => r.personId));

  if (results.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading>Search</SectionHeading>
        <p className="rounded-brand border border-line bg-white p-5 text-[14px] text-ink-2">
          {query.trim().length < 2
            ? "Type at least two characters."
            : `No members match "${query}".`}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <SectionHeading count={results.length}>Search results</SectionHeading>
      <div className="space-y-2">
        {results.map((r) => {
          const f = facts.get(r.personId);
          return (
            <MemberRow key={r.userId} person={r} rate={f?.rate ?? null} profileId={f?.profileId}>
              <ConnectControls
                toUserId={r.userId}
                relation={r.relation as Relation}
                incomingConnectionId={incomingByUser.get(r.userId) ?? null}
                isMentor={mentorUserIds.has(r.userId)}
              />
            </MemberRow>
          );
        })}
      </div>
    </section>
  );
}

/* ── THE FIVE BLOCKS ───────────────────────────────────────────────────── */
export async function CommunityBlocks({ viewer }: { viewer: Viewer }) {
  const mine = await getMyCommunity(viewer);
  const suggestions = await getColleagueSuggestions(viewer);

  const ratePersonIds = [
    ...mine.following.filter((f) => f.person).map((f) => f.person!.personId),
  ];
  const [mentorFacts, colleagueFacts, suggestionFacts] = await Promise.all([
    ratesByPersonId(ratePersonIds),
    ratesByPersonId(mine.colleagues.filter((c) => c.person).map((c) => c.person!.personId)),
    ratesByPersonId(suggestions.map((s) => s.person.personId)),
  ]);

  const incoming = mine.incoming.filter((r) => r.person);
  const outgoing = mine.outgoing.filter((r) => r.person);
  const colleagues = mine.colleagues.filter((c) => c.person);
  const following = mine.following.filter((f) => f.person);

  return (
    <>
      {/* ── 1 · REQUESTS WAITING ON YOU — first, and only when there are any ── */}
      {incoming.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={incoming.length}>Requests waiting on you</SectionHeading>
          <div className="space-y-2">
            {incoming.map((r) => (
              <MemberRow
                key={r.connectionId}
                person={r.person as PersonCard}
                profileId={colleagueFacts.get(r.person!.personId)?.profileId}
              >
                {/* ⚠⚠ `Decline` IS A REAL BUTTON, NOT A HIDDEN MENU ITEM, and it
                    is SINGLE-CLICK with no confirm. `E372` made `DECLINED`
                    first-class on purpose: a colleague request means "I vouch
                    for this person", and a decline is the true signal that
                    protects it. Burying it produces silent ignores, which teach
                    the platform nothing. Nothing is destroyed by a mis-click —
                    the row is UPDATED, never deleted. */}
                <ConnectControls
                  toUserId={r.person!.userId}
                  relation="PENDING"
                  incomingConnectionId={r.connectionId}
                  showDecline
                />
              </MemberRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 2 · YOUR COLLEAGUES ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading count={colleagues.length}>Your colleagues</SectionHeading>
        {colleagues.length === 0 ? (
          /* ⚠ THE EMPTY STATE SAYS WHAT A COLLEAGUE IS AND POINTS AT SEARCH. It
             does not apologise — there is nothing wrong with a new account. */
          <p className="rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
            A colleague is someone who accepted your request — a mutual
            connection, so it says something that a stranger&apos;s cannot.
            Search above for people you have worked with.
          </p>
        ) : (
          <div className="space-y-2">
            {colleagues.map((c) => (
              <MemberRow
                key={c.connectionId}
                person={c.person as PersonCard}
                profileId={colleagueFacts.get(c.person!.personId)?.profileId}
              />
            ))}
          </div>
        )}

        {/* ⚠ `outgoing` IS A QUIET LINE WITH NO BUTTONS — it is THEIR turn, and a
            button here would be a lie about who can act.
            ⚠⚠ `declinedCount` IS RENDERED NOWHERE. The lib's own comment: putting
            "3 people said no" on somebody's own page would be cruelty with no
            purpose. */}
        {outgoing.length > 0 && (
          <p className="text-[13px] text-ink-2">
            Waiting on them: {outgoing.map((o) => o.person!.name).join(", ")}
          </p>
        )}
      </section>

      {/* ── 3 · PEOPLE YOU MAY KNOW ───────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={suggestions.length}>People you may know</SectionHeading>
          {/* ⚠⚠ EVERY CARD CARRIES ITS REASON, RENDERED VERBATIM, AND SOME OF
              THEM READ AS NONSENSE — *"You were both at Founder & Principal
              Consultant"*. THAT IS EXPECTED AND THEY SHIP ANYWAY.
              `P1-J1.4-E373`: `Employer.name` holds job titles for consultants.
              ⚠ NO HEURISTIC HIDES THEM. A "does this look like a job title"
              filter is fragile, would suppress real employers, and would MASK a
              data defect that needs fixing. Measured for `E374`: 38 of 91 live
              suggestions name a title rather than a company — from just two
              distinct offenders. That number is the argument for E373. */}
          <div className="space-y-2">
            {suggestions.map((s) => (
              <MemberRow
                key={s.person.userId}
                person={s.person}
                reason={s.reason}
                profileId={suggestionFacts.get(s.person.personId)?.profileId}
              >
                {/* ⚠ ONE CLICK SENDS IT, and the card then reads `Requested` and
                    STAYS PUT rather than vanishing — a card that disappears on
                    click reads as an error. */}
                <ConnectControls toUserId={s.person.userId} relation={null} />
              </MemberRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 4 · YOUR MENTORS ──────────────────────────────────────────────── */}
      {following.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={following.length}>Your mentors</SectionHeading>
          <div className="space-y-2">
            {following.map((f) => {
              const facts = mentorFacts.get(f.person!.personId);
              return (
                <MemberRow
                  key={f.connectionId}
                  person={f.person as PersonCard}
                  rate={facts?.rate ?? null}
                  profileId={facts?.profileId}
                >
                  {/* ⚠ THE VERB IS `Disconnect`, NEVER `Unfollow`. */}
                  <ConnectControls toUserId={f.person!.userId} relation={null} isMentor />
                </MemberRow>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5 · MEMBERS WHO CONNECTED TO YOU AS A MENTOR ──────────────────── */}
      {/* ⚠⚠ THIS IS NOT A COURTESY — IT IS THE MECHANISM. Scott: *"everyone CAN
          be. the determining factor is if anyone wants you to be...and therefore
          makes a request from you."* THIS LINE IS THE ONLY PLACE IN THE PRODUCT
          WHERE A MEMBER FINDS OUT THEY ARE A MENTOR.
          ⚠ NO BUTTONS, NO INBOX, NO APPROVAL — being asked IS the qualification,
          and a MENTOR row is written ACCEPTED, so there is no pending state a
          button could act on.
          ⚠ HIDDEN ENTIRELY AT ZERO: *"0 members connected to you as a mentor"*
          tells a new member they are unwanted, which is useless and untrue this
          early. The lib still returns the honest 0. */}
      {mine.mentorConnectionCount > 0 && (
        <section className="rounded-brand border border-magenta/25 bg-magenta/[0.04] p-5">
          <p className="text-[15px] font-semibold">
            {mine.mentorConnectionCount}{" "}
            {mine.mentorConnectionCount === 1 ? "member" : "members"} connected to
            you as a mentor.
          </p>
        </section>
      )}
    </>
  );
}
