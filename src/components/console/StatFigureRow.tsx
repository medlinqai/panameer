import { isCounted, type Figure } from "@/lib/statistics";

export function StatFigureRow({
  label,
  figure,
  hint,
  format,
}: {
  label: string;
  figure: Figure;
  hint?: string;
  format?: (n: number) => string;
}) {
  const counted = isCounted(figure);
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="min-w-0">
        <span className="text-[13.5px] text-ink-2">{label}</span>
        {}
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
        <span className="font-display text-[19px] font-bold leading-none tabular-nums">
          {format ? format(figure) : figure.toLocaleString("en-US")}
        </span>
      ) : (
        <span className="font-display text-[19px] font-bold leading-none text-ink-2/30">
          &mdash;
        </span>
      )}
    </div>
  );
}
