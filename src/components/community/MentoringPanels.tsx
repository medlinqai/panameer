import { Avatar } from "@/components/Avatar";
import { ConnectControls } from "@/components/community/ConnectControls";
import "./member-row.css";

type Row = {
  connectionId: string;
  userId: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
};

function PersonRow({ r, children }: { r: Row; children?: React.ReactNode }) {
  return (
    <div className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5">
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
            {}
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
                {}
                <ConnectControls toUserId={r.userId} relation={null} isMentor />
              </PersonRow>
            ))}
          </div>
        </section>
      )}

      {/* ── 3 · THE SIGNAL ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Your Mentor Signal</h2>
        <div className="border-t border-line py-5">
          {}
          <p className="text-[15px]">
            <span className="text-[22px] font-bold text-ink">{helpfulAnswers}</span>{" "}
            <span className="text-ink-2">
              {helpfulAnswers === 1 ? "answer marked helpful" : "answers marked helpful"}
            </span>
          </p>
          {}
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
        {}
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
