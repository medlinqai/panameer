import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";

/**
 * ── ⚠⚠⚠ THE BUILD LINE (`P2-ALL-E757`, mockup v5) ────────────────────────────
 *
 * A rail with a magenta fill to today, six phase labels at their start dates,
 * gate diamonds at the phase boundaries, a pulsing TODAY dot and a flag per release.
 *
 * ⚠⚠⚠ **IF ANY PHASE DATE IS MISSING, THE LINE RENDERS WITHOUT POSITIONS AND
 * SAYS `Dates coming soon` — NEVER INVENTED DATES.** That is the brief's rule and
 * it is not decoration: a test once left an invented `2026-05-01` in Define's
 * start column and this page printed it to the public as fact.
 *
 * ⚠ Positions are a pure function of the dates, computed server-side, so there is
 * no layout that depends on JavaScript having run.
 */
export function BuildLine({
  phases,
  releases,
  now,
}: {
  phases: PublicPhase[];
  /** ⚠ A flag per RELEASE at its target date (`E765`), replacing milestones. */
  releases: PublicRelease[];
  /**
   * ⚠⚠⚠ `now` IS PASSED IN, NOT READ HERE, AND THAT IS NOT STYLE.
   * `Date.now()` during render is an impure call — lint says so — and on a page
   * with `revalidate = 60` it would also differ between the prerender and the
   * HTML a visitor receives, so the TODAY dot could sit at a position the markup
   * was not built for. ⚠ The page passes `generatedAt`, the same instant every
   * other figure on the page was measured at, so the whole page agrees with
   * itself.
   */
  now: number;
}) {
  /* ⚠ Every phase needs a start for the axis to mean anything. One missing date
     makes every position a guess, so the whole line degrades rather than placing
     five labels correctly and one wherever. */
  const starts = phases.map((p) => (p.start ? Date.parse(p.start) : null));
  const complete = starts.every((s): s is number => s !== null);

  if (!complete) {
    return (
      <section aria-label="Build line" className="mt-7 border-t border-line pt-5">
        <div className="h-[3px] w-full rounded-full bg-line" />
        <p className="mt-3 text-[13px] text-ink-2">Dates coming soon</p>
      </section>
    );
  }

  const first = Math.min(...starts);
  const lastRelease = releases.length
    ? Math.max(...releases.filter((r) => r.date).map((r) => Date.parse(r.date!)))
    : first;
  const last = Math.max(...starts, lastRelease, now);
  const span = Math.max(1, last - first);
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - first) / span) * 100));
  const todayPct = pct(now);

  return (
    <section aria-label="Build line" className="mt-7 border-t border-line pt-6">
      <div className="relative h-[3px] w-full rounded-full bg-line">
        {/* ⚠ The fill stops at TODAY, not at the end — it is elapsed time, not
            progress, and conflating the two would overstate the build. */}
        <div
          className="absolute left-0 top-0 h-[3px] rounded-full bg-magenta"
          style={{ width: `${todayPct}%` }}
        />
        {/* ⚠⚠ `motion-safe:` ONLY — reduced motion turns the pulse off entirely
            (the brief's rule), and the dot is still there, just still. */}
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-magenta motion-safe:animate-pulse"
          style={{ left: `${todayPct}%` }}
        />
        {/* ⚠ A release with no target date cannot be placed, so it is simply not
            flagged — never pinned to "today" or to the end of the line. */}
        {releases
          .filter((r) => r.date)
          .map((r) => (
            <span
              key={`${r.code ?? r.name}-${r.date}`}
              title={`${r.code ? `${r.code} — ` : ""}${r.name} — ${r.date}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface"
              style={{ left: `${pct(Date.parse(r.date!))}%` }}
            />
          ))}
      </div>

      <div className="relative mt-3 h-10">
        {phases.map((p, i) => (
          <span
            key={p.name}
            className={
              "absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] " +
              (p.current ? "font-bold text-ink" : "text-ink-2")
            }
            style={{ left: `${pct(starts[i])}%` }}
          >
            {p.name}
            <span className="block text-[10px] text-ink-3">{p.start}</span>
          </span>
        ))}
      </div>

      {releases.length > 0 && (
        <p className="mt-1 text-[12px] text-ink-2">
          {releases
            .filter((r) => r.date)
            .map((r) => `${r.code ? `${r.code} ` : ""}${r.name} · ${r.date}`)
            .join("  ·  ")}
        </p>
      )}
    </section>
  );
}
