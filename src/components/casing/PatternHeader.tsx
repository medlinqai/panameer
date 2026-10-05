import Link from "next/link";
import type { ReactNode } from "react";

export type HeaderFigure = {
  label: string;
  value: number | { uncounted: string };
};

export type HeaderAction = {
  label: string;
  href: string;
};

export type PatternHeaderProps = {
  eyebrow: string;
  headline: string;
  lede?: string;
  figures: HeaderFigure[];
  move?: ReactNode;
  primary?: HeaderAction;
  secondary?: HeaderAction;
  picture?: ReactNode;
  figureLead?: boolean;
  squareActions?: boolean;
  open?: boolean;
};

function Figure({ figure, figureLead }: { figure: HeaderFigure; figureLead?: boolean }) {
  const uncounted = typeof figure.value === "object";
  return (
    <div className={figureLead ? "flex flex-col-reverse" : undefined}>
      {}
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
  open,
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
    /*
      ⚠⚠ `open` DROPS THE BOX (`P2-A1.1-E745`). ⚠⚠⚠ **IT ALSO DROPS
      `bg-white`, WHICH WAS A DARK-MODE DEFECT WAITING ITS TURN** — `E723`'s
      lesson, and `gauges.css` already states it: *"a hard-coded white card is
      exactly what broke `/profile` and `/providers/[id]` in dark mode."* ⚠ The
      boxed variant keeps it byte-for-byte so the five other callers do not move.
    */
    <section
      /*
        ── ⚠⚠ A STABLE HANDLE, BECAUSE THE CLASS STOPPED BEING ONE (`E745`) ────

        ⚠⚠⚠ `check:usage` ANCHORED ON `section.rounded-brand` AND `open` TOOK THE
        CLASS AWAY — so the locator matched nothing and the gate **hung** rather
        than failing, which reads as a broken harness instead of a moved anchor.
        ⚠ This file already carries the lesson for the tab row: *"walking up from
        a link to a guessed container is the approach `E560` already recorded as
        failing."* A styling class is the same guess in a different coat — it is
        free to change, and a gate must not depend on it.
        ⚠⚠ `data-testid` IS THE CONTRACT: it survives any restyle, and `PageTabs`
        already uses exactly this (`data-testid="page-tabs"`).
      */
      data-testid="pattern-header"
      className={
        open
          ? "border-b border-line pb-7"
          : "rounded-brand border border-line bg-white"
      }
    >
      <div
        className={
          open
            ? "grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center"
            : "grid gap-0 md:grid-cols-[1.1fr_1fr]"
        }
      >
        {picture ? (
          <div
            className={
              open
                ? ""
                : "border-b border-line p-5 md:border-b-0 md:border-r"
            }
          >
            {picture}
          </div>
        ) : null}
        <div className={open ? "" : "p-5"}>
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
                      ? "inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-white transition-colors hover:bg-ink-hover"
                      : "inline-flex min-h-[44px] items-center bg-magenta px-5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
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
                      ? "inline-flex min-h-[44px] items-center border border-ink bg-surface px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5"
                      : "inline-flex min-h-[44px] items-center border-[1.5px] border-line px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5"
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
