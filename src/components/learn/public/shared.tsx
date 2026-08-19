import type { ReactNode } from "react";

/**
 * SHARED PARTS FOR THE FIVE `/learn` PUBLIC GRAPHICS.
 *
 * ⚠ EVERY CLASS IN THIS FOLDER IS SCOPED WITH A `lp-` PREFIX ON PURPOSE. Descendant-selector
 * collisions have bitten this codebase four times — `.who span{display:block}` flattened an
 * avatar, `.expert span` flattened a badge, `.pm-home .hero-right p` silently beat a
 * class-only colour, and a bare `.av` squared a round avatar. These five components introduce
 * avatars, chips and message bubbles that look exactly like existing ones, which is the
 * setup for a fifth.
 *
 * These are Tailwind utilities rather than a stylesheet, so there is no descendant selector
 * to collide in the first place — but the avatars are asserted from the DOM anyway, because
 * "it should be fine" is what the previous four had in common.
 *
 * ⚠ ALL FIVE ARE STATIC ILLUSTRATIVE UI. No fetching, no props from the database. Every
 * number in them is an illustration and none may ever be swapped for a real query — a real
 * count of 0 is worse than a drawing. Same status as the named people on `/`'s
 * `GetTheTalentShot`.
 */

/** The card every graphic sits in. */
export function ShotCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-[16px] border border-line bg-white p-5 shadow-[0_24px_56px_-30px_rgba(23,30,62,0.45)] " +
        className
      }
    >
      {children}
    </div>
  );
}

/**
 * Initials avatar. ⚠ ROUND for a person, and the size is explicit so a stray global cannot
 * quietly restyle it. `leading-none` because a 13px glyph in a 34px grid cell otherwise sits
 * a pixel low and reads as misaligned.
 */
export function Avatar({
  initials,
  tone = "ink",
  size = 34,
}: {
  initials: string;
  tone?: "ink" | "magenta" | "slate";
  size?: number;
}) {
  const bg =
    tone === "magenta" ? "bg-magenta" : tone === "slate" ? "bg-[#5b6478]" : "bg-ink";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid flex-none place-items-center rounded-full ${bg} font-display text-[12.5px] font-bold leading-none text-white`}
    >
      {initials}
    </span>
  );
}

/** The `INSTRUCTOR` chip. */
export function InstructorChip() {
  return (
    <span className="rounded-full bg-magenta/10 px-2 py-[3px] font-display text-[8.5px] font-bold uppercase tracking-[0.1em] text-magenta-dark">
      Instructor
    </span>
  );
}

/** ⚠ INLINE SVG, NEVER A GLYPH — `▦ ◔ ▤ ◈ ⚙` and `⌘` all failed to render on real boxes. */
export function Check({ className = "h-[11px] w-[11px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden focusable="false">
      <path
        d="M3.6 10.4l4.2 4.2 8.6-9.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
