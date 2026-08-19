import { ShotCard, Avatar, InstructorChip } from "@/components/learn/public/shared";

/**
 * SECTION 4 — the 1:1, as a short DM thread.
 *
 * ⚠ NO MODEL EXISTS FOR ANY OF THIS. There is no instructor-messaging table and no paid-review
 * table in the schema — not a thin one, none. So this section, like section 3, ships copy and
 * graphic only: no button, no link.
 *
 * ⚠ THE TWO CONTROLS BELOW ARE PICTURES OF BUTTONS INSIDE A GRAPHIC, NOT LINKS. They are
 * `<span>`s and they are `aria-hidden` as a group, so nothing announces a control that cannot
 * be operated. That distinction is the whole reason this section can show a `Book a 1:1`
 * affordance at all while obeying the no-dead-CTA rule: a drawing of a button is a drawing.
 *
 * ⚠ `$120` FOR A 45-MINUTE REVIEW IS A PRICE IN MARKETING COPY, attached to a named person.
 * Counsel gate, with the rest.
 */
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

      {/*
        aria-hidden on the ROW, so the two drawn buttons are one decorative unit rather than
        two things a screen reader offers and nothing happens when you pick them.
      */}
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
