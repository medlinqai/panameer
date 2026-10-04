import { getMyCommunity, searchMembers, type PersonCard } from "@/lib/connections";
import { getColleagueSuggestions } from "@/lib/colleague-suggestions";
import { ratesByPersonId } from "@/lib/provider-rates";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import { MemberRow } from "@/components/community/MemberRow";
import type { Viewer } from "@/lib/access";

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
      <SectionHeading count={results.length}>Search Results</SectionHeading>
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
  const mentorUserIds = new Set(following.map((f) => f.person!.userId));

  return (
    <>
      {/* ── 1 · REQUESTS WAITING ON YOU — first, and only when there are any ── */}
      {incoming.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={incoming.length}>Requests Waiting on You</SectionHeading>
          <div className="space-y-2">
            {incoming.map((r) => (
              <MemberRow
                key={r.connectionId}
                person={r.person as PersonCard}
                profileId={colleagueFacts.get(r.person!.personId)?.profileId}
              >
                {}
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
        <SectionHeading count={colleagues.length}>Your Colleagues</SectionHeading>
        {colleagues.length === 0 ? (
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
              >
                {}
                <ConnectControls
                  toUserId={c.person!.userId}
                  relation="ACCEPTED"
                  isMentor={mentorUserIds.has(c.person!.userId)}
                />
              </MemberRow>
            ))}
          </div>
        )}

        {}
        {outgoing.length > 0 && (
          <p className="text-[13px] text-ink-2">
            Waiting on them: {outgoing.map((o) => o.person!.name).join(", ")}
          </p>
        )}
      </section>

      {/* ── 3 · PEOPLE YOU MAY KNOW ───────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={suggestions.length}>People You May Know</SectionHeading>
          {}
          <div className="space-y-2">
            {suggestions.map((s) => (
              <MemberRow
                key={s.person.userId}
                person={s.person}
                reason={s.reason}
                profileId={suggestionFacts.get(s.person.personId)?.profileId}
              >
                {}
                <ConnectControls toUserId={s.person.userId} relation={null} />
              </MemberRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 4 · YOUR MENTORS ──────────────────────────────────────────────── */}
      {following.length > 0 && (
        <section className="space-y-3">
          <SectionHeading count={following.length}>Your Mentors</SectionHeading>
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
                  {}
                  <ConnectControls toUserId={f.person!.userId} relation={null} isMentor />
                </MemberRow>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5 · MEMBERS WHO CONNECTED TO YOU AS A MENTOR ──────────────────── */}
      {}
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
