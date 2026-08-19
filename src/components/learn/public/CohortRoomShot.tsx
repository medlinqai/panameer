import { ShotCard, Avatar, InstructorChip } from "@/components/learn/public/shared";

/**
 * SECTION 3 — the room, as a thread.
 *
 * ⚠ THIS SECTION SHIPS WITH NO BUTTON AND NO LINK, and that is deliberate. There is no
 * per-course room in the schema: `ForumThread`/`ForumBoard` exist but they are the COMMUNITY
 * forums at `/community/forums`, not a room attached to a course. `HomeFooter`'s standing rule
 * (Scott, 2026-08-14) is that a link ships only when its destination exists — not dimmed, not
 * stubbed, omitted. So the section describes the intent and offers nothing to click.
 *
 * The copy is not softened to match the schema either; Scott approved it knowing the gap.
 */
const REPLIES = [
  { who: "Jordan M.", initials: "JM", text: "That was it. Two BUs, one hierarchy. Fixed." },
  { who: "Sam P.", initials: "SP", text: "Same — thank you. Does this change with Redwood?" },
] as const;

export function CohortRoomShot() {
  return (
    <ShotCard>
      {/* the instructor's message carries the tint — it is the answer, not one of the replies */}
      <div className="flex gap-3 rounded-[12px] bg-magenta/8 p-3.5">
        <Avatar initials="DW" tone="magenta" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[12.5px] font-bold text-ink">Dana Whitfield</span>
            <InstructorChip />
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-ink-2">
            Lesson 4 trips everyone up — the approval hierarchy is per business unit, not per
            requisition. Post your setup and I&rsquo;ll look.
          </p>
        </div>
      </div>

      {REPLIES.map((r) => (
        <div key={r.who} className="mt-3 flex gap-3 px-1">
          <Avatar initials={r.initials} tone="slate" size={30} />
          <div className="min-w-0">
            <p className="font-display text-[12px] font-bold text-ink">{r.who}</p>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-2">{r.text}</p>
          </div>
        </div>
      ))}

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3.5">
        {/* four overlapping avatars — the room has people in it before you post */}
        <span aria-hidden className="flex">
          {["AR", "TK", "MS", "PL"].map((i, n) => (
            <span key={i} className={n === 0 ? "" : "-ml-2.5"}>
              <span className="block rounded-full ring-2 ring-white">
                <Avatar initials={i} tone={n % 2 ? "slate" : "ink"} size={26} />
              </span>
            </span>
          ))}
        </span>
        <span className="text-[11.5px] text-ink-2">412 learners in this cohort</span>
      </div>
    </ShotCard>
  );
}
