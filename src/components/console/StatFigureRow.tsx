import { isCounted, type Figure } from "@/lib/statistics";

/**
 * ── ⚠⚠⚠ ONE ROW, AND IT CANNOT PRINT A DASH WITHOUT A REASON ─────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"A figure that can't be counted shows a dash and says
 * why — never a 0. A real zero and an unknown must not look the same."*
 *
 * ⚠⚠ `StatRow` TAKES A `string`, SO IT CANNOT CARRY THIS RULE: a caller would
 * format the dash itself and the reason would be optional. ⚠⚠⚠ HERE THE
 * `Figure` TYPE DECIDES — `number` renders as a figure, `{ uncounted }` renders
 * as an em-dash **plus its reason**, and there is no third case for a renderer
 * to get wrong. **The type carries the rule, not the caller's discipline.**
 *
 * ⚠ A REAL ZERO RENDERS AS `0`, IN INK, LIKE ANY OTHER COUNT — that is the
 * other half of the rule. `0 colleagues` is a measurement and must not be
 * softened into a dash, or the page starts hiding true answers.
 */
export function StatFigureRow({
  label,
  figure,
  hint,
  format,
}: {
  label: string;
  figure: Figure;
  /** ⚠ Shown under the label for a COUNTED figure — never instead of a reason. */
  hint?: string;
  format?: (n: number) => string;
}) {
  const counted = isCounted(figure);
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="min-w-0">
        <span className="text-[13.5px] text-ink-2">{label}</span>
        {/* ⚠⚠ THE REASON IS NOT OPTIONAL WHEN THE FIGURE IS UNCOUNTED — it comes
            from the figure itself, so it cannot be omitted at the call site. */}
        {!counted && (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
            {figure.uncounted}
          </span>
        )}
        {counted && hint && (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{hint}</span>
        )}
      </span>
      {counted ? (
        /* ⚠ `E433` — a figure is INK, never magenta. Magenta means interactive
           and a statistic is not a link. */
        <span className="font-display text-[19px] font-bold leading-none tabular-nums">
          {format ? format(figure) : figure.toLocaleString("en-US")}
        </span>
      ) : (
        /* ⚠ Deliberately faint: it must not read as a result. */
        <span className="font-display text-[19px] font-bold leading-none text-ink-2/30">
          &mdash;
        </span>
      )}
    </div>
  );
}
