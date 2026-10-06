import type { ChecklistRow } from "@/lib/completeness";

export function CompletenessChecklist({
  completeness,
  rows,
  threshold,
}: {
  completeness: number;
  rows: ChecklistRow[];
  threshold: number;
}) {
  const done = rows.filter((r) => r.done);
  const missing = rows.filter((r) => !r.done).sort((a, b) => b.points - a.points);
  const visible = completeness >= threshold;

  return (
    <section className="rounded-brand border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        {}
        <b className="font-display text-[26px] font-bold leading-none text-ink">
          {completeness}%
        </b>
        <span className="text-[14px] text-ink-2">complete</span>
        <span
          className={
            "ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold " +
            (visible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")
          }
        >
          {visible ? "Visible in the marketplace" : `Visible at ${threshold}%`}
        </span>
      </div>

      {missing.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {missing.map((r) => (
            <li key={r.key} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
              <span aria-hidden className="text-ink-2">
                ○
              </span>
              <b className="text-ink">{r.label}</b>
              <span className="text-ink-2">
                {r.hint} <b className="text-ink">Gain {r.points} points.</b>
              </span>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {done.map((r) => (
            <li key={r.key} className="text-[13px] text-ink-2">
              <span aria-hidden className="text-emerald-600">
                ✓
              </span>{" "}
              {r.label}
              {/* A COUNT ONLY WHERE ONE MEANS SOMETHING — `Photo (1)` would be */}
              {r.count !== undefined && r.count > 0 ? ` (${r.count})` : ""}
            </li>
          ))}
        </ul>
      )}

      {missing.length === 0 && (
        <p className="mt-3 text-[13.5px] text-ink-2">
          Every section has content. ⚠ The score is capped at 100, so there is
          nothing left to add.
        </p>
      )}
    </section>
  );
}
