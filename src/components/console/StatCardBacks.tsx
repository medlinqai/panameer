import Link from "next/link";
import { isCounted, type Figure, type TrendPeriod } from "@/lib/statistics";

/**
 * ── ⚠⚠⚠ THE TWO BACK FACES (`P2-A2-E603` WS-A correction 3) ──────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"Back face, two variants, chosen by the data. Trend back
 * — the same figures over time, for a card whose figures have dates. Action back
 * — one counted credit line, then the two or three links that move this card's
 * figures, for a card with no history yet."*
 * ⚠⚠ **THE DATA PICKS THE VARIANT AND WHICH FACE IS UP:** every figure zero and
 * no history → action back, face up. Otherwise → front up.
 *
 * ⚠⚠⚠ EVERY WORD ON A BACK IS COUNTED, NOT WRITTEN. Scott: *"no fabricated
 * encouragement, no promises, no absolutes."* The credit line below states a
 * number the member produced; it never says "great work", never predicts a
 * result, and never says "always" or "the fastest way".
 */

/*
  ⚠⚠⚠ `TrendPeriod` MOVED TO `lib/statistics.ts` AND IS RE-EXPORTED HERE.
  ⚠ It now sits beside `trendBuckets()`, the function that decides what each
  period MEANS — they were one layer apart, and the distance is how the period
  control came to change the label without changing the data.
  ⚠ The re-export is so every existing importer is unchanged; there is still
  exactly ONE definition.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   /** Only the two periods Scott named. No others, ever. * /
  //   export type TrendPeriod = "90d" | "ytd";
*/
export type { TrendPeriod };

/**
 * ⚠⚠ THE SPARKLINE LIVES HERE, NOT ON THE FRONT (Scott). The front is figures;
 * history is what you turn the card over for.
 *
 * ⚠⚠⚠ A GENUINELY EMPTY SERIES SAYS SO RATHER THAN DRAWING A ZERO LINE. Scott:
 * *"If a series is genuinely empty it says so rather than drawing a zero line."*
 * ⚠ A flat line along the bottom is a CLAIM — "nothing happened, week after
 * week" — and it looks identical to a broken chart. The distinction is the same
 * one the figures make: a measured zero and an absence must not look alike.
 * ⚠ A real flat line (rows exist, all in one bucket) DOES render, unsmoothed.
 */
export function TrendBack({
  title,
  series,
  period,
  subject,
  hrefFor,
}: {
  title: string;
  series: number[] | { uncounted: string };
  period: TrendPeriod;
  /** ⚠⚠ THE SUBJECT ONLY — *"Invitations sent"*, NOT *"Invitations sent each
   *  week."* ⚠⚠⚠ THE GRAIN IS APPENDED HERE, FROM THE PERIOD, because the
   *  buckets are WEEKS under `90d` and CALENDAR MONTHS under `ytd`. A caller
   *  writing *"each week"* by hand would state a grain the chart stopped
   *  using the moment the member pressed `YTD` — the same lie the period
   *  control itself was just fixed for, moved into the copy. */
  subject: string;
  hrefFor: (p: TrendPeriod) => string;
}) {
  const periods: { key: TrendPeriod; label: string }[] = [
    { key: "90d", label: "90 Days" },
    { key: "ytd", label: "YTD" },
  ];
  const counted = Array.isArray(series);
  const total = counted ? series.reduce((a, b) => a + b, 0) : 0;
  /* ⚠ ONE PLACE DECIDES THE WORD, and it is the same place that renders the
     period pills — so the sentence and the highlighted period cannot disagree. */
  const caption = `${subject} each ${period === "ytd" ? "month" : "week"}.`;
  return (
    <div className="flex h-full flex-col">
      <h2 className="font-display text-[16px] font-bold">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{caption}</p>

      <div className="mt-3 min-h-[64px]">
        {!counted ? (
          <p className="text-[13px] leading-relaxed text-ink-2">{series.uncounted}</p>
        ) : total === 0 ? (
          /* ⚠⚠⚠ EMPTY, SAID PLAINLY — NOT A ZERO LINE. */
          <p className="text-[13px] leading-relaxed text-ink-2">
            Nothing recorded in this period yet, so there is no line to draw.
          </p>
        ) : (
          <Sparkline values={series} />
        )}
      </div>

      {/* ⚠ Two periods, as links — a period is shareable and survives a refresh. */}
      <div className="mt-auto flex gap-1.5 border-t border-line pt-2.5">
        {periods.map((p) => (
          <Link
            key={p.key}
            href={hrefFor(p.key)}
            className={
              "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors " +
              (period === p.key ? "bg-ink text-white" : "text-ink-2 hover:text-ink")
            }
          >
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** ⚠ `E433` — the line is a FIGURE drawn, so it is ink-and-magenta as data, and
 *  nothing in it is clickable. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 280;
  const h = 48;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 6)] as const);
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" height="56" role="img"
         aria-label={`${values.reduce((a, b) => a + b, 0)} in total across ${values.length} periods`}>
      <path d={d} fill="none" stroke="var(--color-magenta)" strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill="var(--color-magenta)" />
      ))}
      <line x1="0" y1={h + 1} x2={w} y2={h + 1} stroke="var(--color-line)" strokeWidth="1" />
    </svg>
  );
}

/**
 * ⚠⚠ THE ACTION BACK — one counted credit line, then the links that move THIS
 * card's figures.
 * ⚠⚠⚠ THE CREDIT LINE IS A COUNT, NOT A COMPLIMENT. Scott: *"Credit what a
 * member has done the moment they do it."* If they have done nothing it says
 * what the card measures — it does not congratulate them for arriving.
 * ⚠ EVERY LINK HERE ALSO LIVES SOMEWHERE ELSE — a link that exists only behind
 * a flip is a hidden door. Where each one else lives is reported at the gate.
 */
export function ActionBack({
  title,
  credit,
  links,
}: {
  title: string;
  credit: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="font-display text-[16px] font-bold">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{credit}</p>
      <ul className="mt-auto space-y-1.5 border-t border-line pt-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[13.5px] font-bold text-magenta hover:underline">
              {l.label} &rarr;
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ⚠⚠ "EVERY FIGURE ZERO" MEANS EVERY **COUNTED** FIGURE IS ZERO.
 * ⚠⚠⚠ AN UNCOUNTED FIGURE IS NOT A ZERO AND MUST NOT VOTE — a card whose only
 * figures are dashes has no history to show and no achievement to credit, and
 * treating a dash as a zero would flip it to an action back on the strength of
 * something nobody measured.
 */
export function allZero(figures: Figure[]): boolean {
  const counted = figures.filter(isCounted);
  return counted.length > 0 && counted.every((n) => n === 0);
}

/**
 * ── ⚠⚠⚠ THE BREAKDOWN BACK — A DIFFERENT CUT OF THE SAME NUMBER ──────────
 *
 * ⚠ SCOTT, 2026-09-23: *"The old tiles' detail moves to the new card's flip
 * back. That is what a trend back is for: a different cut of the same number."*
 *
 * ⚠⚠⚠ THE SUBSETS ARE DRAWN **FROM** THE TOTAL, NEVER ADDED **TO** IT, AND
 * THAT IS WHY THE REMAINDER IS RENDERED RATHER THAN LEFT IMPLICIT.
 * ⚠ `Offered` IS the total — `interviewRequest.count({ provider_person_id })`,
 * byte-identical to the front's figure. `Taken` is `COMPLETED`; `Declined or
 * cancelled` is `DECLINED + CANCELLED`. ⚠⚠ THE STATES `REQUESTED`,
 * `SLOTS_OFFERED` AND `SCHEDULED` ARE IN NEITHER SUBSET, so the two parts
 * genuinely do not add up to the total and never will.
 * ⚠⚠⚠ SCOTT: *"A breakdown that doesn't add up is a breakdown that's wrong —
 * show the remainder or don't show the split."* The remainder is named and
 * rendered, so the four rows reconcile on screen by inspection.
 *
 * ── ⚠⚠ AND IF IT STILL DOES NOT RECONCILE, IT SAYS SO ────────────────────
 *
 * ⚠ A negative remainder means a subset exceeded its own total — impossible by
 * construction, which is exactly why it must be caught rather than assumed:
 * it would mean the two queries had drifted apart. ⚠⚠ THE CARD THEN REFUSES TO
 * PRINT THE SPLIT and says the figures disagree, rather than showing numbers a
 * reader would have to reconcile themselves and could not.
 */
export function BreakdownBack({
  title,
  totalLabel,
  total,
  parts,
  remainderLabel,
  note,
  links,
}: {
  title: string;
  totalLabel: string;
  total: Figure;
  parts: { label: string; figure: Figure }[];
  /** ⚠ What the unaccounted-for rows ARE — never just "other". */
  remainderLabel: string;
  note?: string;
  links?: { label: string; href: string }[];
}) {
  /* ⚠⚠ ONLY COUNTED FIGURES CAN BE RECONCILED. If the total or any part is a
     dash, there is no arithmetic to do and the split is not shown — an
     uncountable figure is not a zero and must not be treated as one. */
  const countable = isCounted(total) && parts.every((p) => isCounted(p.figure));
  const partSum = countable
    ? parts.reduce((a, p) => a + (p.figure as number), 0)
    : 0;
  const remainder = countable ? (total as number) - partSum : 0;

  return (
    <div className="flex h-full flex-col">
      <h2 className="font-display text-[16px] font-bold">{title}</h2>

      {!countable ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {isCounted(total) ? "Part of this breakdown" : totalLabel} cannot be
          counted, so there is no split to show.
        </p>
      ) : remainder < 0 ? (
        /* ⚠⚠⚠ SAY IT, DO NOT PRINT IT. */
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          These figures disagree — the parts come to {partSum.toLocaleString("en-US")},
          which is more than the {(total as number).toLocaleString("en-US")} counted.
          The split is not shown until they reconcile.
        </p>
      ) : (
        <>
          <div className="mt-2">
            <StatSplitRow label={totalLabel} figure={total} strong />
            {parts.map((p) => (
              <StatSplitRow key={p.label} label={p.label} figure={p.figure} indent />
            ))}
            {/* ⚠ The remainder is a real row, named, so the column adds up. */}
            <StatSplitRow label={remainderLabel} figure={remainder} indent />
          </div>
          {note && <p className="mt-2 text-[12px] leading-snug text-ink-3">{note}</p>}
        </>
      )}

      {links && links.length > 0 && (
        <ul className="mt-auto space-y-1.5 border-t border-line pt-2.5">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-[13px] font-bold text-magenta hover:underline">
                {l.label} &rarr;
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** ⚠ One row of a breakdown. ⚠⚠ A dash still carries its reason here, exactly
 *  as in `StatFigureRow` — the rule does not relax on a back face. */
function StatSplitRow({
  label,
  figure,
  indent,
  strong,
}: {
  label: string;
  figure: Figure;
  indent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={
        "flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0 " +
        (indent ? "pl-3" : "")
      }
    >
      <span className={"text-[13px] " + (strong ? "font-bold text-ink" : "text-ink-2")}>
        {label}
      </span>
      {isCounted(figure) ? (
        <span
          className={
            "font-display leading-none tabular-nums " +
            (strong ? "text-[17px] font-bold" : "text-[15px] font-bold text-ink-2")
          }
        >
          {figure.toLocaleString("en-US")}
        </span>
      ) : (
        <span className="text-[12px] text-ink-3">{figure.uncounted}</span>
      )}
    </div>
  );
}
