import Link from "next/link";
import { getMyCommunity, type PersonCard } from "@/lib/connections";
import { getColleagueSuggestions } from "@/lib/colleague-suggestions";
import { profileIdsByPersonId } from "@/lib/provider-rates";
import { ConnectControls } from "@/components/community/ConnectControls";
import { MemberRow } from "@/components/community/MemberRow";
import type { Viewer } from "@/lib/access";

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
      {}
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

  const [colleagueFacts, suggestionFacts, incomingFacts] = await Promise.all([
    profileIdsByPersonId(shownColleagues.map((c) => c.person!.personId)),
    profileIdsByPersonId(shownSuggestions.map((s) => s.person.personId)),
    profileIdsByPersonId(incoming.map((r) => r.person!.personId)),
  ]);

  return (
    <div className="space-y-6">
      {}
      <section className="space-y-3">
        <Heading>Waiting on You</Heading>
        {incoming.length === 0 ? (
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
