import { ShotCard, Avatar, InstructorChip } from "@/components/learn/public/shared";

export function MentorDmShot() {
  return (
    <ShotCard>
      <div className="flex gap-3">
        <Avatar initials="JM" tone="slate" />
        <div className="min-w-0">
          <p className="font-display text-[12.5px] font-bold text-ink">You</p>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-ink-2">
            Can you look at my sourcing config before the client call Thursday?
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex gap-3 rounded-[12px] bg-magenta/8 p-3.5">
        <Avatar initials="DW" tone="magenta" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[12.5px] font-bold text-ink">Dana Whitfield</span>
            <InstructorChip />
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-ink-2">
            Send it over. I do 45-minute reviews — $120, or free if you&rsquo;re on my path.
          </p>
        </div>
      </div>

      {}
      <div aria-hidden className="mt-4 grid grid-cols-2 gap-2.5">
        <span className="rounded-[9px] border-[1.5px] border-magenta px-3 py-2.5 text-center font-display text-[12px] font-bold text-magenta-dark">
          Book a 1:1
        </span>
        <span className="rounded-[9px] border border-line px-3 py-2.5 text-center font-display text-[12px] font-bold text-ink-2">
          Message
        </span>
      </div>
    </ShotCard>
  );
}
