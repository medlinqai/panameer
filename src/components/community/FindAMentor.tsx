import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ConnectControls } from "@/components/community/ConnectControls";
import { OpenForMentoringToggle } from "@/components/community/OpenForMentoringToggle";
import "./member-row.css";

/**
 * ── ⚠⚠ FIND A MENTOR (`P2-J3-E558` WS-C2) ─────────────────────────────────
 *
 * ⚠ SCOTT, 2026-09-18: *"there needs to be a separate button on the CONNECT page
 * where someone clicks to search for a mentor. ONLY those who have checked the
 * box to be open for mentoring will appear and the user will then search by
 * skill."*
 *
 * ⚠⚠ DISTINCT FROM THE COLLEAGUES SEARCH, and they are not the same job:
 * Colleagues filters a roster the viewer already has, in memory, and can never
 * reach a stranger. THIS one queries providers the viewer does not know — which
 * is exactly why the opt-in gate carries the whole weight here.
 *
 * ⚠⚠⚠ THE ROW ACTION IS `Follow as a Mentor`. NOT Book, NOT Request, NOT
 * Message. No processor is chosen, `MICRO_SESSION_PRICE` is commented out
 * (`mentors.ts:141`), and the honest end of the flow today is *follow* → the
 * mentor sees demand.
 */

export type MentorResult = {
  profileId: string;
  userId: string | null;
  personId: string;
  name: string;
  headline: string;
  photoUrl: string | null;
  skills: string[];
  helpfulAnswers: number;
  alreadyFollowing: boolean;
};

export function FindAMentor({
  results,
  skill,
  openForMentoring,
  viewerUserId,
}: {
  results: MentorResult[];
  skill: string;
  /** ⚠ NULL when the viewer has no provider profile — no toggle is offered. */
  openForMentoring: boolean | null;
  viewerUserId: string | null;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-[17px] font-bold">Find a Mentor</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          {/* ⚠ SAYS THE GATE OUT LOUD. A search that silently omits most of the
              directory teaches people the directory is small; saying "opted in"
              teaches them what the list means. */}
          Search people who have opted in to mentoring, by skill.
        </p>
      </div>

      {/* ⚠ A GET FORM, so the search is a URL — shareable, back-buttonable, and
          it needs no client state. */}
      <form method="GET" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="skill"
          defaultValue={skill}
          placeholder="Search by skill — Payables, Core HR, PL/SQL"
          aria-label="Search mentors by skill"
          className="min-w-[240px] flex-1 rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
        />
        <button
          type="submit"
          className="rounded-full bg-magenta px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Search
        </button>
      </form>

      {results.length === 0 ? (
        <EmptyState
          skill={skill}
          openForMentoring={openForMentoring}
        />
      ) : (
        <div className="space-y-2">
          {results.map((m) => (
            <div
              key={m.profileId}
              className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4"
            >
              <Avatar
                firstName={m.name.split(" ")[0] ?? ""}
                lastName={m.name.split(" ").slice(1).join(" ")}
                photoUrl={m.photoUrl}
                size={44}
              />
              <div className="min-w-[180px] flex-1">
                <p className="text-[15px] font-bold">
                  <Link href={`/providers/${m.profileId}`} className="hover:text-magenta">
                    {m.name}
                  </Link>
                </p>
                {m.headline && <p className="text-[13px] text-ink-2">{m.headline}</p>}
                {m.skills.length > 0 && (
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {m.skills.slice(0, 4).join(" · ")}
                  </p>
                )}
                {/* ⚠⚠ THE SIGNAL, EVEN AT 0 — it is the evaluation basis, and at
                    0 it honestly says there is no evidence yet.
                    ⚠ `E433` — a figure, so ink, never magenta. */}
                <p className="mt-0.5 text-[12.5px] text-ink-2">
                  {m.helpfulAnswers === 0 ? (
                    "No evidence yet — no answers marked helpful"
                  ) : (
                    <>
                      <span className="font-bold text-ink">{m.helpfulAnswers}</span>{" "}
                      {m.helpfulAnswers === 1
                        ? "answer marked helpful"
                        : "answers marked helpful"}
                    </>
                  )}
                </p>
              </div>
              <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
                {/* ⚠⚠ ONE ACTION, AND IT IS `Follow as a Mentor`. `ConnectControls`
                    with `isMentor` renders exactly that, and `Disconnect` once
                    following — the verb is never `Unfollow` (`check:community`
                    fails the build if `Follow` returns as a bare verb).
                    ⚠ NOTHING HERE OFFERS A BOOKING, A SESSION OR A PAYMENT. */}
                {m.userId && m.userId !== viewerUserId && (
                  <ConnectControls
                    toUserId={m.userId}
                    relation={null}
                    isMentor
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * ── ⚠⚠ THE EMPTY STATE RECRUITS, IT DOES NOT APOLOGISE (`E558` WS-C2 item 7) ─
 *
 * ⚠⚠ `open_for_mentoring` DEFAULTS TO FALSE, SO THIS SURFACE RETURNS NOTHING ON
 * DAY ONE. That is correct, not a defect, and it MUST NOT be papered over by
 * widening the gate — widening it would mean presenting people as mentors who
 * never agreed to be, which is the exact harm the flag exists to prevent.
 *
 * ⚠ SO THE EMPTY STATE SAYS WHY IT IS EMPTY and, for someone who could fix it,
 * offers the fix in place. ⚠⚠ THE TOGGLE IS THE SAME COMPONENT AND THE SAME
 * ENDPOINT AS WS-C1 — `POST /api/provider/mentoring`. NO SECOND ENDPOINT WAS
 * BUILT, and no second copy of the consent rule exists.
 * ⚠ OFFERED ONLY TO SOMEONE WITH A PROVIDER PROFILE, the same rule as the WS-C1
 * panel: it is a declaration about what THEY will do.
 */
function EmptyState({
  skill,
  openForMentoring,
}: {
  skill: string;
  openForMentoring: boolean | null;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-brand border border-line bg-white p-5">
        <p className="text-[15px] font-bold">
          {skill ? `Nobody open for mentoring matches “${skill}” yet.` : "Nobody has opted in yet."}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          {/* ⚠ STATES THE MECHANISM, NOT AN APOLOGY. "Nothing found" teaches
              nothing; "mentoring is opt-in and nobody has opted in" tells the
              reader both why the list is empty and what would change it. */}
          Mentoring is opt-in. People appear here only after they choose to be
          found as a mentor, so an empty list means nobody has chosen yet — not
          that nobody is qualified.
        </p>
      </div>

      {openForMentoring === false && (
        <>
          <p className="text-[13.5px] font-semibold text-ink">
            You could be the first.
          </p>
          <OpenForMentoringToggle initial={false} />
        </>
      )}
      {openForMentoring === true && (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          {/* ⚠ Someone already opted in still sees an empty list — because THEY
              are excluded from their own search. Saying so stops it reading as
              a broken toggle. */}
          You are open for mentoring. You do not appear in your own search.
        </p>
      )}
    </div>
  );
}
