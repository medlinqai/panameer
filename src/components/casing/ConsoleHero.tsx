/**
 * THE CONSOLE HERO — a dark brand header a console page can wear
 * (`P2-J1.1-E048` / `E049`).
 *
 * Modelled on `learn/app/MyLearning.tsx`'s hero, which is the pattern Scott
 * approved and asked Settings to carry. What is copied is the MECHANISM, not the
 * palette:
 *
 *   · full-bleed via negative margins that exactly cancel `AppShell`'s padded
 *     `main` (`px-5 py-6 sm:px-8`), so the header meets the rail with no gutter;
 *   · `overflow-hidden`, which is load-bearing — the radial wash is deliberately
 *     wider than the box;
 *   · a generous BOTTOM PADDING so the row beneath can sit ON the gradient's
 *     lower edge rather than below it. That padding and the following row's
 *     negative top margin are one mechanism, which is why both live here.
 *   · a fade into `--color-canvas` at the bottom, so the header DISSOLVES into
 *     the page instead of ending on a line.
 *
 * ── ⚠⚠ THE PALETTE IS BRAND TOKENS, AND THAT IS THE POINT (`E049`) ───────────
 *
 * SCOTT, 2026-09-07, with a screenshot: *"it is cut up a bit… Should we match the
 * color to the left rail (yes)"* and *"it is not using my branding colors
 * exactly."* HE IS RIGHT, AND THE SEAM AND THE BRANDING ARE THE SAME PROBLEM.
 *
 * Learn's hero is built from a LEARN-SPECIFIC palette — `--color-learn-night`
 * (#0f0b1c) and `--color-learn-plum` (#241546), plus TWO RAW HEXES inline in its
 * class (`#3d1560`, `#5c1668`) that are not tokens at all. The rail is
 * `--color-rail`, a warm dark ink. TWO DIFFERENT DARKS MEETING AT AN EDGE IS THE
 * "CUT UP" HE SEES.
 *
 * ⚠⚠ SO THIS STARTS AT THE RAIL'S OWN TOKEN AND NEVER AT A HEX THAT MATCHES IT
 * TODAY. `AppShell` records that *"a company theme exists — `bg-rail` and
 * `bg-canvas` already read these vars"*, so a hardcoded `#272334` would agree
 * with the rail by LUCK and diverge the moment a company theme is applied. One
 * token, not two values that happen to match.
 *
 * ⚠ NO `--color-learn-*` TOKEN AND NO RAW HEX APPEARS BELOW. Every colour is
 * `--color-rail`, `--color-magenta`, `--color-magenta-dark` or `--color-canvas`.
 * The translucency that Learn writes as `rgba(215,44,214,0.42)` is expressed as
 * `color-mix(… var(--color-magenta) …)` instead, so even the wash's alpha is
 * derived from the token rather than from a re-typed channel triple.
 *
 * ⚠ EXTRACTED, AND DELIBERATELY USED ON ONE PAGE. `E048` blesses the extraction
 * — *"if you find yourself extracting a shared header component, that is fine and
 * probably right"* — and forbids applying it to a third page in that brief.
 * Settings is the only caller. Learn keeps its own hero and its own palette,
 * which is a REPORTED follow-on, not this row's work.
 */
export function ConsoleHero({
  eyebrow,
  title,
  children,
}: {
  /** ⚠ THE PAGE NAME. Scott: *"the top left text is the page name."* */
  eyebrow: string;
  /** ⚠ A NODE, not a string: a page whose title depends on the route supplies a
      small client component here rather than making this whole hero a client. */
  title: React.ReactNode;
  /**
   * The row that sits ON the gradient's lower edge — Learn puts four stat cards
   * here. ⚠ It is rendered by the CALLER, below the section, so it can overlap:
   * see `ConsoleHeroRow`.
   */
  children?: React.ReactNode;
}) {
  return (
    <div className="-mx-5 -mt-6 sm:-mx-8">
      <section
        className="
          relative overflow-hidden px-5 pt-7 pb-[78px] text-white sm:px-8
          bg-[radial-gradient(900px_340px_at_84%_-10%,color-mix(in_srgb,var(--color-magenta)_42%,transparent),transparent_62%),linear-gradient(118deg,var(--color-rail)_0%,color-mix(in_srgb,var(--color-rail)_82%,var(--color-magenta-dark))_46%,color-mix(in_srgb,var(--color-rail)_58%,var(--color-magenta-dark))_100%)]
        "
      >
        <div className="relative z-[2] min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {eyebrow}
          </p>
          {/*
            ⚠⚠ NO DESCRIPTIVE PARAGRAPH, AND IT MUST NOT GAIN ONE. Learn carries
            *"12 learning paths, 305 lessons…"* under its headline; Scott asked
            for this one WITHOUT it — *"remove the text… so it should become
            shorter and give us a good page to work with rather than eating away
            a ton of space."* The height difference is the missing paragraph,
            not a smaller box with a gap: the padding matches Learn's exactly, so
            this is shorter BECAUSE it says less.
          */}
          <h1 className="max-w-[560px] font-display text-[26px] font-bold leading-[1.16] tracking-[-0.4px] sm:text-[31px]">
            {title}
          </h1>
        </div>

        {/*
          ⚠ THE CANVAS FADE IS KEPT, NOT REPLACED. It is what makes the header
          dissolve into the page instead of ending on a hard line — the same job
          it does on Learn, at the same height.
        */}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[70px] bg-[linear-gradient(to_bottom,transparent,var(--color-canvas))]"
          aria-hidden
        />
      </section>
      {children}
    </div>
  );
}

/**
 * The row that overlaps the hero's lower edge — where Learn puts its stat cards.
 *
 * ⚠ THE NEGATIVE TOP MARGIN IS HALF OF ONE MECHANISM. The hero's `pb-[78px]`
 * reserves the space and this pulls the row up into it; changing either alone
 * breaks the overlap. Both values are Learn's, unchanged — `E048` says to match
 * the existing hero's proportions rather than invent a new set of numbers.
 */
export function ConsoleHeroRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[3] -mt-[52px] px-5 sm:px-8">{children}</div>
  );
}
