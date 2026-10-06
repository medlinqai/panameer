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
          {/* A DASH AND ITS REASON, NEVER A BARE DASH. The reason comes from */}
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
  // SIZED FROM THE LENGTH, CLAMPED AT THREE. A caller passing four does not
  const shown = figures.slice(0, 3);
  const cols =
    shown.length >= 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    // lesson, and `gauges.css` already states it: *"a hard-coded white card is
    <section
      // A STABLE HANDLE, BECAUSE THE CLASS STOPPED BEING ONE
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
          {/* REQUIRED. The one thing that says which page this is. */}
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
              {/* ABSENT UNLESS REAL (ruling 45(4)). There is no `disabled` */}
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
