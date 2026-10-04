import Link from "next/link";
import { Gauge } from "./Gauge";
import { AREA_META, rowsFor, type MetricDef } from "@/lib/usage-metrics";
import type { Figures } from "@/lib/usage-figures";
import type { Figure } from "@/lib/figure";

/**
 * USAGE v2 — ONE ROW PER AREA, FOUR GAUGES EACH (`P2-A1.1-E815`).
 *
 * Scott's sheet, in its own order: Profile · Learn · Connect · Work · Shop ·
 * Pay. Each row is a magenta eyebrow and a "Go to …" link, then its four gauges
 * in open columns with thin dividers — no boxes.
 *
 * It uses the ONE `Gauge` component (`E585`): twenty-four hand-drawn dials would
 * drift in their arc maths and two gauges showing the same fraction would point
 * at different angles.
 */
export function UsageRows({
  figures,
  isProvider,
}: {
  figures: Figures;
  isProvider: boolean;
}) {
  return (
    <div className="mt-6">
      {rowsFor(isProvider).map(({ area, metrics }) => {
        const meta = AREA_META[area];
        return (
          <section key={area} className="border-t border-line py-5 first:border-t-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-magenta">
                {meta.label}
              </span>
              <Link
                href={meta.href}
                className="text-[13px] font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline"
              >
                {meta.go} →
              </Link>
            </div>

            {/* Four across, two at tablet, one on a phone. Thin dividers, no
                boxes — the open-column style the page already uses. */}
            <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
              {metrics.map((m) => (
                <Cell key={`${area}-${m.label}`} metric={m} figures={figures} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Cell({ metric, figures }: { metric: MetricDef; figures: Figures }) {
  /*
    NOT COUNTED IS A STATE, NOT A ZERO. `counted: false` means nothing writes
    this yet, so the figure is `null` and the gauge draws dashed with the words.
    A metric whose writer exists but has produced nothing shows a real 0, in ink
    — the 2026-09-23 rule that a measured zero and an uncountable figure must
    not look the same.
  */
  const figure: Figure = metric.uncounted
    ? { uncounted: metric.uncounted }
    : (figures[metric.label] ?? 0);
  return (
    <div className="px-0 lg:px-4 lg:first:pl-0" title={metric.hint}>
      <Gauge figure={figure} goal={metric.goal} label={metric.label} />
      <p className="mt-1.5 text-[13px] font-semibold text-ink">{metric.label}</p>
      <p className="text-[12px] text-ink-3">
        {metric.uncounted ? metric.uncounted : `Goal: ${metric.goal.toLocaleString()}`}
      </p>
    </div>
  );
}
