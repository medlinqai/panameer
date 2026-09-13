import type { ChecklistRow } from "@/lib/completeness";

/**
 * THE COMPLETENESS BREAKDOWN (`P1-A1.5-E489`).
 *
 * > **Scott:** *"we have 10 objects that can be completed, you have content in 7
 * > of those… your profile is estimated to be at 70%"*
 *
 * ⚠⚠ THERE IS EXACTLY ONE PERCENTAGE ON THIS COMPONENT AND IT IS THE EXISTING
 * `completeness`. The checklist is a reading of that same score, never a second
 * one: `completeness` is WEIGHTED (skills 18, overview 8), so a required-only
 * profile is 88 while "7 of 10" would say 70 — two numbers on one screen,
 * disagreeing, which is `E462` rebuilt.
 *
 * ⚠ WHAT SCOTT ACTUALLY WANTED IS NOT A SECOND NUMBER — it is to know WHAT IS
 * MISSING, and a list cannot contradict anything.
 *
 * ⚠⚠ EACH MISSING ROW NAMES ITS OWN WEIGHT. That is the thing a percentage alone
 * can never tell a provider: WHICH ACTION PAYS MOST. Missing rows sort by points
 * descending for exactly that reason.
 * ⚠ Filled rows carry their count where they have one — `Skills (6)` — which is
 * Scott's object-count reading on the provider's side of the same taxonomy.
 */
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
  /* ⚠ MOST VALUABLE FIRST — the gap worth closing, not the first one declared. */
  const missing = rows.filter((r) => !r.done).sort((a, b) => b.points - a.points);
  const visible = completeness >= threshold;

  return (
    <section className="rounded-brand border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        {/* ⚠ THE ONE NUMBER. Ink, not magenta — a count is not interactive. */}
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
              {/* ⚠ A COUNT ONLY WHERE ONE MEANS SOMETHING — `Photo (1)` would be
                  noise, so only rows that carry a real tally show one. */}
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
