import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORT_INDEX, reportsFor } from "@/lib/admin-reports";

/**
 * A REPORT SHELL (WS3).
 *
 * One route for every Volume-Over-Time metric the console offers. The brief is
 * explicit that reports are "stubbed placeholders for now — we will fill up the
 * options as we go", so this page's job is to make the navigation real: the
 * tile you clicked lands somewhere that names the metric, says what it will
 * plot, and gets you back.
 *
 * NO CHART IS DRAWN. A plausible-looking line over invented points is the exact
 * failure this console has been avoiding page by page — a chart is read as
 * measurement in a way an empty table isn't.
 *
 * Slugs come from REPORT_INDEX, which is derived from the pages' volume strips,
 * so an unknown slug is a 404 rather than a shell for a metric nobody defined.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ metric: string }>;
}) {
  const { metric: slug } = await params;
  const entry = REPORT_INDEX[slug];
  if (!entry) notFound();

  const siblings = reportsFor(entry.from).filter(
    (r) => r.href !== `/admin/reports/${slug}`
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="rounded-brand border border-line bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
          Volume Over Time
        </p>
        <h2 className="mt-1 font-display text-[24px] font-bold">
          {entry.metric} Over Time
        </h2>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
          This report will plot {entry.metric.toLowerCase()} by period, filterable
          by company and date range.
        </p>

        <div className="mt-5 grid h-56 place-items-center rounded-[12px] border border-dashed border-line bg-bg-soft">
          <p className="px-6 text-center text-[13.5px] text-ink-2">
            No series to plot yet — the data behind{" "}
            <b>{entry.metric.toLowerCase()}</b> isn&apos;t built.
            <br />
            Nothing is charted here rather than charting a placeholder.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Link
            href={entry.from}
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            ← Back to {entry.from === "/admin" ? "the dashboard" : "the page"}
          </Link>
          {siblings.length > 0 && (
            <span className="ml-auto flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-full border border-line px-3 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
                >
                  {s.metric}
                </Link>
              ))}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
