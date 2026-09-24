/*
  ── ⚠⚠ RULING 1: THE WORD IS "GROUPS" (`P2-A3-E619` WS-C) ────────────────
  ⚠ SCOTT, 2026-09-22: *"The word is Groups everywhere. **Forum** and **Room**
  disappear from the interface** — the menu, the page, the headings, the
  buttons and the empty states."* ⚠⚠ DATA AND TABLE NAMES STAY (`ForumBoard`,
  `forum_boards`, `forums.ts`); only the words people READ change.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   Answering questions in the forums of paths you are in is how this fills in.
*/
import { Avatar } from "@/components/Avatar";
import { ConnectControls } from "@/components/community/ConnectControls";
import "./member-row.css";

/**
 * ── ⚠⚠ THE MENTORING PANELS (`P2-J3-E558` WS-C1) ──────────────────────────
 *
 * ⚠⚠ THE LABELS ARE THE RULING. Scott, 2026-09-18:
 *   · `Members Following You as a Mentor` — ⚠ NOT *"People You Mentor"*. That
 *     asserts a relationship the person never agreed to. This panel is DEMAND:
 *     who raised a hand, so the mentor can see the ask.
 *   · `Mentors You Follow` — ⚠ NOT *"People Who Mentor You"*. Same reason, other
 *     direction: FOLLOWING SOMEONE IS NOT BEING MENTORED BY THEM.
 *
 * ⚠⚠⚠ NOTHING HERE PROMISES A SESSION, A BOOKING OR A PAYMENT. No processor is
 * chosen, `MICRO_SESSION_PRICE` is commented out (`mentors.ts:141`), no
 * entitlement object exists and no meter exists. ⚠ The public Learn page
 * already sells "Book a 1:1" at a price the database cannot honour — a second
 * such promise is exactly what this workstream must not add.
 */

type Row = {
  connectionId: string;
  userId: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
};

function PersonRow({ r, children }: { r: Row; children?: React.ReactNode }) {
  return (
    <div className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4">
      <Avatar
        firstName={r.name.split(" ")[0] ?? ""}
        lastName={r.name.split(" ").slice(1).join(" ")}
        photoUrl={r.photoUrl}
        size={44}
      />
      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">{r.name}</p>
        {r.title && <p className="text-[13px] text-ink-2">{r.title}</p>}
      </div>
      {children && (
        <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function MentoringPanels({
  followers,
  followingMentors,
  helpfulAnswers,
}: {
  followers: Row[];
  followingMentors: Row[];
  helpfulAnswers: number;
}) {
  return (
    <div className="space-y-6">
      {/* ── 1 · DEMAND ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">
          Members Following You as a Mentor
        </h2>
        {followers.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-ink-2">
            Nobody yet. When someone follows you as a mentor, they appear here —
            that is the ask.
          </p>
        ) : (
          <div className="space-y-2">
            {/* ⚠⚠ NO ACCEPT AND NO DECLINE, DELIBERATELY. A MENTOR row is a
                FOLLOW, written ACCEPTED because *"There was a response — it is
                'none needed'."* There is no pending state a button could act
                on, and inventing one would invent a consent cycle Scott ruled
                against. The consent is the toggle above. */}
            {followers.map((r) => (
              <PersonRow key={r.connectionId} r={r} />
            ))}
          </div>
        )}
      </section>

      {/* ── 2 · WHO I FOLLOW ──────────────────────────────────────────────── */}
      {followingMentors.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-[17px] font-bold">Mentors You Follow</h2>
          <div className="space-y-2">
            {followingMentors.map((r) => (
              <PersonRow key={r.connectionId} r={r}>
                {/* ⚠ THE VERB IS `Disconnect`, NEVER `Unfollow` — one verb, and
                    `check:community` fails the build if `Follow` returns to a
                    rendered string. */}
                <ConnectControls toUserId={r.userId} relation={null} isMentor />
              </PersonRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 3 · THE SIGNAL ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Your Mentor Signal</h2>
        <div className="rounded-brand border border-line bg-white p-5">
          {/* ⚠⚠ RENDERED EVEN AT 0. Nobody buys time with a mentor they cannot
              evaluate, and hiding a zero is how a page starts flattering people.
              ⚠ `E433` — the number is a FIGURE, so it is ink, never magenta. */}
          <p className="text-[15px]">
            <span className="text-[22px] font-bold text-ink">{helpfulAnswers}</span>{" "}
            <span className="text-ink-2">
              {helpfulAnswers === 1 ? "answer marked helpful" : "answers marked helpful"}
            </span>
          </p>
          {/* ⚠⚠ THE CONDITION IS ANSWERS MARKED HELPFUL, NEVER POST COUNT
              (`P1-J2.4-E024`) — a volume metric on a public profile produces
              volume. ⚠ IT READS `marked_helpful_at` AND ONLY THAT:
              `instructor_confirmed_*` does NOT feed it (`E558` WS-B ruling),
              because an instructor's CORRECTNESS judgement is not the asker's
              RESOLUTION judgement. */}
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            Counted when the person who asked a question marks your answer as the
            one that helped. Not post count — answering a lot is not the same as
            answering well.
          </p>
          {helpfulAnswers === 0 && (
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              No evidence yet. Answering questions in the groups of paths you are
              in is how this fills in.
            </p>
          )}
        </div>
      </section>

      {/* ── 4 · PAID SESSIONS — THE STATE TABLE ───────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Paid Sessions</h2>
        {/*
          ⚠⚠⚠ A STATE TABLE, NOT A BOOK BUTTON. This is the brief's instruction
          and the reason is specific: the public Learn page already sells
          "Book a 1:1" at a price the database cannot honour, and a second
          promise would double a defect rather than add a feature.
          ⚠ EVERY ROW IS A FACT ABOUT THE BUILD, not a roadmap date — nothing
          here says "coming soon", because nobody has scheduled it.
          ⚠ `E433` — nothing in this table is interactive, so nothing is magenta.
        */}
        <div className="overflow-hidden rounded-brand border border-line bg-white">
          <table className="w-full text-[13.5px]">
            <tbody className="divide-y divide-line">
              {[
                ["A price you set", "Not built — no rate field for mentoring"],
                ["Taking payment", "Not built — no payment processor is chosen"],
                ["Booking a block of time", "Not built — no scheduling exists"],
                ["Tracking time used", "Not built — no meter exists"],
              ].map(([what, state]) => (
                <tr key={what}>
                  <td className="px-4 py-2.5 font-semibold text-ink">{what}</td>
                  <td className="px-4 py-2.5 text-ink-2">{state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-2">
          Following as a mentor is the whole of it today: someone raises a hand
          and you see it. Anything you agree beyond that, you arrange between
          yourselves.
        </p>
      </section>
    </div>
  );
}
