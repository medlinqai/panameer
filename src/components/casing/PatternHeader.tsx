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
};

/** ⚠ The figure's own rendering, so the dash rule lives in ONE place. */
function Figure({ figure }: { figure: HeaderFigure }) {
  const uncounted = typeof figure.value === "object";
  return (
    <div>
      <dt className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-ink-2">
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
  picture,
}: PatternHeaderProps) {
  /*
    ⚠⚠ SIZED FROM THE LENGTH, CLAMPED AT THREE. ⚠⚠⚠ A caller passing four does
    not silently render four in a three-wide grid — it renders the first three,
    and `check:pattern-header` fails the build on a caller that passes more, so
    the truncation is a belt rather than the rule.
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
                <Figure key={f.label} figure={f} />
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
                  className="inline-flex min-h-[44px] items-center rounded-full bg-magenta px-5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
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
                  className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-line px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5"
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
