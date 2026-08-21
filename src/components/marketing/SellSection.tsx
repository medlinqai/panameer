import type { ReactNode } from "react";

/**
 * THE ALTERNATING SELL BAND — copy on one side, an illustrative graphic on the other.
 *
 * ── WHY THIS EXISTS AS A COMPONENT ───────────────────────────────────────────
 *
 * Scott, 2026-08-19: "the public facing pages are sales... pretty much only. They are to get
 * you to create an account." `/find-work`, `/hire-talent` and `/buy-services` are getting the
 * same treatment as `/learn`, so the band is a component from the start rather than four
 * hand-rolled copies that drift.
 *
 * ⚠ I CHECKED FOR AN EXISTING ONE FIRST, as the brief asked. `components/marketing/section.tsx`
 * is typography only — `Eyebrow`, `H2`, a subhead — and `components/marketing/sections/` is a
 * folder of one-off named sections (AiMatch, TwoPains, ValueStack…), not a generic band. So
 * this is new.
 *
 * ⚠ AND IT DELIBERATELY DOES NOT TOUCH `/`. The marketing home's sections are walked and
 * stable; rewiring them onto this would put a settled page back in play for no gain. New
 * component, new callers only.
 *
 * ── ⚠ THE TEXT IS ALWAYS FIRST IN SOURCE ORDER, AND THAT IS THE WHOLE TRICK ──
 *
 * Reversal is done with `order` at the breakpoint, never by swapping the markup. Below 900px
 * the grid collapses to one column and the order rules stop applying, so the text leads in
 * EVERY section — including the reversed ones. Writing the graphic first for a reversed band
 * would read correctly on a desktop and put a picture above its own explanation on a phone,
 * which is the failure mode the brief called out.
 *
 * ⚠ 900px VIA AN ARBITRARY VARIANT, NOT `lg:`. Tailwind's `lg` is 1024 and the design
 * collapses at 900; `min-[900px]:` hits the number the rest of this page uses. There was no
 * precedent for arbitrary variants in this codebase, so the computed columns are asserted at
 * 900 and 899 rather than assumed.
 *
 * ── ⚠ THIS COMPONENT NOW CARRIES TEN SECTIONS, NOT FIVE (brief_learn_public_spine) ──
 *
 * `/learn` gained a seven-section teaching spine above its five sell sections, and both use
 * this band. Two props were added for the spine and BOTH ARE OPTIONAL, so the five original
 * callers render byte-identically apart from the eyebrow size below:
 *
 *   · `step`     — the numbered magenta disc beside the eyebrow (spine steps 1–4 only)
 *   · `children` — extra content BELOW the body copy (the spine's instructor-access tiers)
 *
 * ⚠ THE ONE SHARED CHANGE IS THE EYEBROW, AND IT IS DELIBERATE — see below.
 */
export function SellSection({
  eyebrow,
  heading,
  body,
  graphic,
  /** Which side the GRAPHIC sits on at desktop. */
  side = "right",
  /** The alternating light band. */
  shaded = false,
  /**
   * A step number, drawn as a magenta disc to the LEFT of the eyebrow. Only the four
   * sequenced spine sections pass it; everything else omits it and no disc renders.
   */
  step,
  /** Extra content under the body copy. Used only by the spine's `While you are learning`. */
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  graphic: ReactNode;
  side?: "left" | "right";
  shaded?: boolean;
  step?: number;
  children?: ReactNode;
}) {
  return (
    <section
      className={
        "border-t border-line px-6 py-14 min-[900px]:py-[66px] " +
        (shaded ? "bg-bg-soft" : "bg-white")
      }
    >
      <div className="mx-auto grid max-w-[1136px] items-center gap-8 min-[900px]:grid-cols-2 min-[900px]:gap-11">
        <div className="min-w-0">
          {/*
            ⚠ 19px, NOT 13px, AND .14em, NOT .06em — `P1-J3-E015`, and the number is not mine.

            `/` settled this argument first. `P1-J0-E134`, Scott 2026-08-17: "they need to be
            big like HERE'S HOW IT…" — that page's base eyebrow is 13px and FOUR sections
            override to 19px (`home.css:490, 1325, 1852, 1934`). ⚠ HIS REFERENCE STRING THERE
            WAS LITERALLY "HERE'S HOW IT WORKS", which is the eyebrow the spine below now adds
            to this page. Two pages cannot disagree about how big a section kicker is when one
            of them was named as the example for the other.

            The tracking came with it. Learn was .06em and home's base is .14em
            (`home.css:83`); the approved mockup draws .14em, so the two pages now agree on
            size AND tracking rather than half of it. Weight was already 800 on both.

            ⚠ THE GAP BENEATH IS STILL 10px AND THAT WAS RE-CHECKED, NOT LEFT ALONE. Home's
            `.hiw` puts 24px under its 19px eyebrow; the approved mockup puts 10px under
            this one and Scott looked at that composition and said "this is good". The mockup
            wins on layout, so 10px stays and the divergence is reported rather than split.

            ⚠ THIS CHANGES ALL TEN SECTIONS ON THE PAGE, INCLUDING THE FIVE ORIGINAL SELL
            SECTIONS, and that is the intended blast radius — an eyebrow that is 19px in the
            spine and 13px sixty pixels lower would read as a bug. `SellSection` has exactly
            one caller (`LearnPublic.tsx`), verified by grep, so no other page moves.
          */}
          <p className="mb-2.5 flex items-center gap-[9px] text-[19px] font-extrabold uppercase tracking-[0.14em] text-magenta">
            {step !== undefined ? (
              /*
                Announced, NOT `aria-hidden`. The disc is the step's ORDER, which is the one
                thing a sequenced section carries that its heading does not — a reader who
                cannot see the discs otherwise gets seven unordered sections. `normal-case`
                and `tracking-normal` undo the eyebrow's own transform, which would otherwise
                push a single digit off its centre.
              */
              <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-magenta font-display text-[13px] font-bold normal-case leading-none tracking-normal text-white">
                {step}
              </span>
            ) : null}
            {eyebrow}
          </p>
          <h2 className="text-[27px] font-bold leading-[1.14] tracking-[-0.6px] text-ink min-[900px]:text-[34px]">
            {heading}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16.5px] leading-[1.62] text-ink-2">{body}</p>
          {children}
        </div>
        {/* the graphic moves, the source order does not — see the note above */}
        <div className={"min-w-0" + (side === "left" ? " min-[900px]:order-first" : "")}>
          {graphic}
        </div>
      </div>
    </section>
  );
}
