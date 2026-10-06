import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";

export const MIN_GAP_PCT = 12;

export function assignRows(ats: number[], minGapPct = MIN_GAP_PCT): number[] {
  const lastOn = [-Infinity, -Infinity];
  return ats.map((at) => {
    const row = at - lastOn[0] >= minGapPct ? 0 : at - lastOn[1] >= minGapPct ? 1 : 0;
    lastOn[row] = at;
    return row;
  });
}

export function BuildLine({
  phases,
  releases,
  now,
}: {
  phases: PublicPhase[];
  releases: PublicRelease[];
  now: number;
}) {
  const dated = phases
    .map((p) => ({ p, t: p.start ? Date.parse(p.start) : NaN }))
    .filter((x) => Number.isFinite(x.t));
  const undated = phases.filter((p) => !p.start);

  if (dated.length === 0) {
    return (
      <section aria-label="Build line" className="mt-7 border-t border-line pt-5">
        <div className="h-[3px] w-full rounded-full bg-line" />
        <p className="mt-3 text-[13px] text-ink-2">No dates set</p>
      </section>
    );
  }

  const starts = dated.map((x) => x.t);
  const first = Math.min(...starts);
  const endTimes = dated.map((x) => (x.p.end ? Date.parse(x.p.end) : NaN)).filter(Number.isFinite);
  const releaseTimes = releases
    .filter((r) => r.date)
    .map((r) => Date.parse(r.date!))
    .filter(Number.isFinite);
  const last = Math.max(...starts, ...endTimes, ...releaseTimes, now);
  const span = Math.max(1, last - first);
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - first) / span) * 100));
  const todayPct = pct(now);

  const marks = Array.from(
    dated.reduce((acc, { p, t }) => {
      const key = p.start as string;
      const row = acc.get(key) ?? { date: key, at: pct(t), names: [] as string[], current: false };
      row.names.push(p.name);
      row.current = row.current || p.current;
      acc.set(key, row);
      return acc;
    }, new Map<string, { date: string; at: number; names: string[]; current: boolean }>()),
  ).map(([, v]) => v);

  const rows = assignRows(marks.map((m) => m.at));
  const twoRows = rows.some((r) => r === 1);

  return (
    <section aria-label="Build line" className="mt-7 border-t border-line pt-6">
      <div className="relative h-[3px] w-full rounded-full bg-line">
        {}
        <div
          className="absolute left-0 top-0 h-[3px] rounded-full bg-magenta"
          style={{ width: `${todayPct}%` }}
        />
        {/* (the brief's rule), and the dot is still there, just still. */}
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-magenta motion-safe:animate-pulse"
          style={{ left: `${todayPct}%` }}
        />
        {/* A release with no target date cannot be placed, so it is simply not */}
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

      {/* THE AXIS CARRIES LABELS ONLY WHERE THERE IS ROOM */}
      <div className={"relative mt-3 hidden sm:block " + (twoRows ? "h-[72px]" : "h-10")}>
        {marks.map((m, i) => (
          <span
            key={m.date}
            className={
              "absolute whitespace-nowrap text-[11px] " +
              // The second row sits below the first, with a leader line drawn by
              (rows[i] === 1
                ? "top-[34px] before:absolute before:-top-[30px] before:left-1/2 before:h-[26px] before:w-px before:bg-line "
                : "top-0 ") +
              // A LABEL AT EITHER END IS ALIGNED, NOT CENTRED, AND THIS WAS A
              (m.at <= 2 ? "" : m.at >= 98 ? "-translate-x-full" : "-translate-x-1/2") +
              " " +
              (m.current ? "font-bold text-ink" : "text-ink-2")
            }
            style={{ left: `${m.at}%` }}
          >
            {m.names.join(" · ")}
            <span className="block text-[10px] text-ink-3">{m.date}</span>
          </span>
        ))}
      </div>

      {/* The same marks, stacked, for phone. One source, two arrangements. */}
      <ul className="mt-3 sm:hidden">
        {marks.map((m) => (
          <li
            key={m.date}
            className={
              "flex items-baseline justify-between gap-3 py-0.5 text-[12px] " +
              (m.current ? "font-bold text-ink" : "text-ink-2")
            }
          >
            <span>{m.names.join(" · ")}</span>
            <span className="text-[11px] text-ink-3">{m.date}</span>
          </li>
        ))}
      </ul>

      {/* THE UNDATED PHASES, AFTER THE LINE AND IN ORDER . THEY ARE */}
      {undated.length > 0 && (
        <p className="mt-1 text-[12px] text-ink-3">
          {undated.map((p) => p.name).join(" · ")} — dates to come
        </p>
      )}

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
