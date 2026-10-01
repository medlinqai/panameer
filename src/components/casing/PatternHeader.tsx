import Link from "next/link";
import type { ReactNode } from "react";

/**
 * ── ⚠⚠⚠ THE PATTERN HEADER (brief 8 — `statistics_2026-09-23.html`) ─────
 *
 * ⚠ RULING 23: that mockup is the standard for all six Account Information
 * pages. ⚠⚠ RULING 33d widens it: **it is the application's pattern**, and it
 * governs Community, Groups, Mentors and Teams too. ⚠ RULING 36d adds `/learn`.
 *
 * ⚠⚠⚠ **BUILD IT ONCE.** The header existed THREE times before this file —
 * `ProfileScoreView` (hand-rolled, with its own `pm-score-hero` CSS vocabulary),
 * `CommunityHero` (a real shared component), and `community/groups/page.tsx`
 * (hand-rolled markup **reusing `CommunityHero`'s CSS classes without importing
 * the component**). ⚠⚠ **SHARING A STYLESHEET IS NOT SHARING A COMPONENT:** the
 * classes agreed; the markup, the figure count and the button count did not.
 * That is `E585` in its exact form.
 *
 * ── ⚠⚠⚠ ONE TO THREE FIGURES. IT MUST NOT REQUIRE THREE. ────────────────
 *
 * ⚠ RULING 45(1): *"FEWER FIGURES ON THE PAGES THAT HAVE FEWER… **`PatternHeader`
 * MUST NOT REQUIRE THREE** — a required triple is what forces an invented
 * figure."* ⚠⚠ So `figures` is a 1–3 array and the grid is sized from its
 * LENGTH. ⚠⚠⚠ **A page with two real figures shows two.** It does not pad with a
 * dash, and it does not invent a third.
 *
 * ⚠⚠ **A FIGURE MAY STILL BE UNCOUNTABLE, AND THAT IS DIFFERENT FROM ABSENT.**
 * `value` takes a number OR an `uncounted` reason — a measured zero renders `0`
 * in ink; a figure nothing writes renders a dash AND its reason. **A dash with
 * no reason cannot be expressed in this type** (the counting rules, rule 2).
 *
 * ── ⚠⚠ ONE BUTTON WHERE ONLY ONE ACTION IS REAL ────────────────────────
 *
 * ⚠ RULING 45(4): the second slot is **optional and absent**, never a repeat of
 * a link already on the page. ⚠⚠⚠ `E579` — *a control whose handler refuses is a
 * door onto a wall, and a button that repeats a nearby link is the same failure
 * in a nicer coat.*
 *
 * ── ⚠ THE EYEBROW GOES ON ALL OF THEM (ruling 45(3)) ────────────────────
 *
 * ⚠⚠ It was missing from all three built versions and nobody had ruled it out —
 * a silent drop (ruling 22's third bucket). ⚠ It is **the part that tells a
 * member which of six near-identical pages they are on**, so it is REQUIRED here
 * rather than optional.
 *
 * ⚠⚠ **NOTHING IN THIS HEADER IS A TAG CHIP** (ruling 31e). Its figures stay
 * INK; its buttons are the only magenta in it.
 */

/** ⚠⚠ A number, or the reason it cannot be counted. A dash needs a reason. */
export type HeaderFigure = {
  label: string;
  value: number | { uncounted: string };
};

export type HeaderAction = {
  label: string;
  href: string;
};

export type PatternHeaderProps = {
  /** ⚠ REQUIRED (ruling 45(3)) — which of six near-identical pages this is. */
  eyebrow: string;
  headline: string;
  /** ⚠ One sentence under the headline. Optional; never a promise. */
  lede?: string;
  /** ⚠⚠ ONE TO THREE. The grid is sized from the length (ruling 45(1)). */
  figures: HeaderFigure[];
  /**
   * ⚠ The derived sentence — what is quiet, and the one next move.
   * ⚠⚠ DERIVED BY THE CALLER FROM ITS OWN FIGURES, never canned here: this
   * component cannot know what a page's quiet cell is.
   */
  move?: ReactNode;
  /** ⚠⚠ The filled action. Optional — a page with no honest action shows none. */
  primary?: HeaderAction;
  /** ⚠⚠⚠ ABSENT unless a SECOND action is genuinely real (ruling 45(4)). */
  secondary?: HeaderAction;
  /** ⚠ The picture — the web, a ring, a chart. Optional. */
  picture?: ReactNode;
  /**
   * ⚠⚠ THE MOCKUP'S FIGURE ORDER — big number, label underneath (`E731`).
   * ⚠ Opt-in, so `/learn`, `/community` and `/account-health` are byte-unchanged. ⚠⚠⚠ IT IS
   * A PROP RATHER THAN A GLOBAL FLIP BECAUSE CHANGING EVERY HEADER AT ONCE IS A DECISION
   * ABOUT FOUR PAGES AND THIS BRIEF NAMES ONE.
   */
  figureLead?: boolean;
  /**
   * ⚠⚠ SQUARE ACTIONS — 4px radius, solid INK rather than magenta (`E731`).
   * ⚠ **SCOTT: *"Buttons: square, 4px radius: Finish My Profile (solid ink, when
   * incomplete) and Invite a Colleague (white, ink border)."*** ⚠⚠⚠ ALSO OPT-IN, and for
   * the same reason: the pill-and-magenta pair is what the other three headers ship today.
   */
  squareActions?: boolean;
};

/** ⚠ The figure's own rendering, so the dash rule lives in ONE place. */
function Figure({ figure, figureLead }: { figure: HeaderFigure; figureLead?: boolean }) {
  const uncounted = typeof figure.value === "object";
  return (
    /*
      ── ⚠⚠⚠ `figureLead` FLIPS THE ORDER IN CSS, NOT IN THE MARKUP (`E731`) ────────

      ⚠ **SCOTT, 2026-10-01: *"Figures as in the mockup: big number, label underneath."***
      ⚠⚠ **THE `<dt>` STILL COMES BEFORE ITS `<dd>` IN THE DOM**, because that is what a
      description list MEANS and a screen reader reads the term before the definition.
      ⚠⚠⚠ **`column-reverse` MOVES THE PAINT, NOT THE READING ORDER** — so the mockup's
      look costs nothing in the accessibility tree. Swapping the tags would have given a
      definition with no term in front of it.
      ⚠ `min-h` ON THE LABEL IS DROPPED IN THIS MODE: it exists to keep three numbers on
      one baseline when the LABEL is on top and wraps. With the number on top the numbers
      already share a baseline, and the reserved line would open a gap under the row.
    */
    <div className={figureLead ? "flex flex-col-reverse" : undefined}>
      {/*
        ⚠⚠ THE LABEL RESERVES TWO LINES, AND THAT IS AN ALIGNMENT FIX, NOT
        PADDING. ⚠ MEASURED AT 390px ON `/learn`: `CERTIFICATES` fits one line
        while `LESSONS DONE` and `PATHS ENROLLED` wrap to two — so the three
        FIGURES sat at three different heights and the row read as ragged.
        ⚠⚠⚠ Caught by looking at the screenshot; nothing overflowed, so no
        measurement would have flagged it. **A row of numbers that do not share
        a baseline is harder to compare, which is the one thing a figure row is
        for.**
      */}
      <dt
        className={`text-[12.5px] font-semibold uppercase leading-[1.2] tracking-[0.07em] text-ink-2${
          figureLead ? " mt-1" : " min-h-[2.4em]"
        }`}
      >
        {figure.label}
      </dt>
      {uncounted ? (
        <>
          {/*
            ⚠⚠⚠ A DASH AND ITS REASON, NEVER A BARE DASH. The reason comes from
            the TYPE, so a dash with no reason is unrepresentable — that is the
            counting rule, enforced by the shape rather than by remembering.
            ⚠ And a measured `0` is NOT this branch: it renders as `0`, in ink.
          */}
          <dd className="font-display text-[26px] font-bold leading-none text-ink-2" aria-hidden>
            &mdash;
          </dd>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">
            {(figure.value as { uncounted: string }).uncounted}
          </p>
        </>
      ) : (
        <dd className="font-display text-[26px] font-bold leading-none text-ink">
          {figure.value as number}
        </dd>
      )}
    </div>
  );
}

export function PatternHeader({
  eyebrow,
  headline,
  lede,
  figures,
  move,
  primary,
  secondary,
  figureLead,
  squareActions,
  picture,
}: PatternHeaderProps) {
  /*
    ⚠⚠ SIZED FROM THE LENGTH, CLAMPED AT THREE. A caller passing four does not
    render four in a three-wide grid — it renders the first three.

    ⚠⚠⚠ **`check:pattern-header` DOES NOT EXIST, AND THIS COMMENT CLAIMED IT
    DID** (found `P2-A2-E659`, 2026-09-26, while mounting this on `/stats`).
    ⚠ There is no such npm script and **nothing in `scripts/` mentions
    `PatternHeader` at all.** ⚠⚠ So the sentence below was not a belt — **the
    truncation IS the only rule**, and a caller passing four figures loses the
    fourth SILENTLY.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   …and `check:pattern-header` fails the build on a caller that passes
    //   more, so the truncation is a belt rather than the rule.
    ⚠⚠ **THIS IS THE `check:support-count` DEFECT, INHERITED RATHER THAN
    AUTHORED** — a gate named in prose before it was built. A stated rule that
    nothing enforces is the half the next person trusts (the 2026-09-23 rules,
    6). ⚠⚠⚠ **THE HONEST FIX IS A TUPLE TYPE, NOT A GATE** — `[HeaderFigure]`
    | `[…, …]` | `[…, …, …]` would make a fourth a COMPILE error, the pattern
    Scott asks to be reached for before a check. ⚠ **NOT DONE HERE:** it
    changes a shared component's public type and every existing caller's array
    literal would have to be re-typed. **Filed, not smuggled into a page brief.**
  */
  const shown = figures.slice(0, 3);
  const cols =
    shown.length >= 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <section className="rounded-brand border border-line bg-white">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        {picture ? (
          <div className="border-b border-line p-5 md:border-b-0 md:border-r">{picture}</div>
        ) : null}
        <div className="p-5">
          {/* ⚠ REQUIRED. The one thing that says which page this is. */}
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-bold tracking-[-0.3px] text-ink">
            {headline}
          </h2>
          {lede ? (
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{lede}</p>
          ) : null}

          {shown.length > 0 ? (
            <dl className={`mt-4 grid gap-4 ${cols}`}>
              {shown.map((f) => (
                <Figure key={f.label} figure={f} figureLead={figureLead} />
              ))}
            </dl>
          ) : null}

          {move ? (
            <p className="mt-4 border-t border-line pt-3.5 text-[14px] leading-relaxed text-ink-2">
              {move}
            </p>
          ) : null}

          {primary || secondary ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {primary ? (
                <Link
                  href={primary.href}
                  className={
                    squareActions
                      ? "inline-flex min-h-[44px] items-center rounded-[4px] bg-ink px-5 text-[14px] font-bold text-white transition-colors hover:bg-ink-hover"
                      : "inline-flex min-h-[44px] items-center rounded-full bg-magenta px-5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
                  }
                >
                  {primary.label}
                </Link>
              ) : null}
              {/*
                ⚠⚠⚠ ABSENT UNLESS REAL (ruling 45(4)). There is no `disabled`
                branch here on purpose: a greyed second button would be the door
                onto a wall the ruling names, and this component gives a caller
                no way to render one.
              */}
              {secondary ? (
                <Link
                  href={secondary.href}
                  className={
                    squareActions
                      ? "inline-flex min-h-[44px] items-center rounded-[4px] border border-ink bg-surface px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5"
                      : "inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-line px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5"
                  }
                >
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
