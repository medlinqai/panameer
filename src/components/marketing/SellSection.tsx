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
}: {
  eyebrow: string;
  heading: string;
  body: string;
  graphic: ReactNode;
  side?: "left" | "right";
  shaded?: boolean;
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
          <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
            {eyebrow}
          </p>
          <h2 className="text-[27px] font-bold leading-[1.14] tracking-[-0.6px] text-ink min-[900px]:text-[34px]">
            {heading}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16.5px] leading-[1.62] text-ink-2">{body}</p>
        </div>
        {/* the graphic moves, the source order does not — see the note above */}
        <div className={"min-w-0" + (side === "left" ? " min-[900px]:order-first" : "")}>
          {graphic}
        </div>
      </div>
    </section>
  );
}
