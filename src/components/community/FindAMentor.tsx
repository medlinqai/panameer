import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ConnectControls } from "@/components/community/ConnectControls";
import { OpenForMentoringToggle } from "@/components/community/OpenForMentoringToggle";
import "./member-row.css";

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
  openForMentoring: boolean | null;
  viewerUserId: string | null;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-[17px] font-bold">Find a Mentor</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          {}
          Search people who have opted in to mentoring, by skill.
        </p>
      </div>

      {}
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
          className="bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-surface transition-colors hover:bg-ink-hover"
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
              className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5"
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
                {/* THE SIGNAL, EVEN AT 0 — it is the evaluation basis, and at */}
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
                {/* ONE ACTION, AND IT IS `Follow as a Mentor`. `ConnectControls` */}
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

/** THE EMPTY STATE RECRUITS, IT DOES NOT APOLOGISE ( WS-C2 item 7) */
function EmptyState({
  skill,
  openForMentoring,
}: {
  skill: string;
  openForMentoring: boolean | null;
}) {
  return (
    <div className="space-y-3">
      <div className="border-t border-line py-5">
        <p className="text-[15px] font-bold">
          {skill ? `Nobody open for mentoring matches “${skill}” yet.` : "Nobody has opted in yet."}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          {/* STATES THE MECHANISM, NOT AN APOLOGY. "Nothing found" teaches */}
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
          {/* Someone already opted in still sees an empty list — because THEY */}
          You are open for mentoring. You do not appear in your own search.
        </p>
      )}
    </div>
  );
}
