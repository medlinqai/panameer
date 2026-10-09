import type { ReactNode } from "react";

// M-E002: KPIs stay on one row on phones (equal columns, smaller numbers under 480px); spaced row from 640px up.
export function KpiRow({ kpis, testId, className = "" }: { kpis: { value: ReactNode; label: string }[]; testId?: string; className?: string }) {
  return (
    <div
      data-testid={testId}
      data-kpi-row
      className={"grid gap-x-3 gap-y-3 border-b border-line sm:flex sm:flex-wrap sm:gap-x-11 " + className}
      style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}
    >
      {kpis.map((k) => (
        <div key={k.label} className="min-w-0">
          <b className="block truncate text-[20px] font-medium min-[480px]:text-[26px]">{k.value}</b>
          <span className="block text-[10px] font-semibold leading-tight tracking-[0.06em] text-ink-2 min-[480px]:text-[11px] min-[480px]:tracking-[0.08em] sm:whitespace-nowrap">{k.label}</span>
        </div>
      ))}
    </div>
  );
}
