import { StatusPhaseCard } from "@/components/status/StatusPhaseCard";
import { BuildLine } from "@/components/status/BuildLine";
import { Milestones } from "@/components/orders/Milestones";
import type { MilestoneView } from "@/lib/order-milestones";
import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";
import { daysBetween } from "@/lib/plan/status-card";

// WT-E003: when each line is delivered, in the status page's look — the current line's % and days to its ready date
// (StatusPhaseCard), the lines across time (BuildLine), then one row per line with its milestones.
type Line = { id: string; lineNumber: number; description: string; serviceStart: string | null; serviceEnd: string | null; percent: number };

export function OrderSchedule({ orderId, lines, milestones, canReport, today }: { orderId: string; lines: Line[]; milestones: Map<string, MilestoneView[]>; canReport: boolean; today: string }) {
  const sorted = [...lines].sort((a, b) => (a.serviceStart ?? "9999").localeCompare(b.serviceStart ?? "9999"));
  const isCurrent = (l: Line) => !!l.serviceStart && l.serviceStart <= today && (!l.serviceEnd || l.serviceEnd >= today);
  const current = sorted.find(isCurrent) ?? sorted.find((l) => (l.serviceStart ?? "") > today) ?? sorted[sorted.length - 1] ?? null;
  const nextReady = sorted.filter((l) => l.serviceEnd && l.serviceEnd >= today).sort((a, b) => a.serviceEnd!.localeCompare(b.serviceEnd!))[0] ?? null;
  const all = [...milestones.values()].flat();
  const done = all.filter((m) => m.reportedAt).length;

  const phases: PublicPhase[] = sorted.map((l) => ({ name: `Line ${l.lineNumber}`, purpose: l.description, outcome: "", percent: l.percent, taskCount: milestones.get(l.id)?.length ?? 0, start: l.serviceStart, end: l.serviceEnd, current: isCurrent(l) }));
  const releases: PublicRelease[] = sorted.filter((l) => l.serviceEnd).map((l) => ({ code: `L${l.lineNumber}`, name: `Line ${l.lineNumber} ready`, summary: null, date: l.serviceEnd, status: l.percent >= 100 ? "Done" : "Planned", percent: l.percent, taskCount: 0, doneCount: 0, journeys: [] }));

  return (
    <div data-order-schedule>
      <div className="bg-ink p-4 text-white sm:p-6">
        <StatusPhaseCard
          card={{
            phase: current ? { number: `Line ${current.lineNumber}`, title: current.description, releaseTitle: null, percent: current.percent, start: current.serviceStart, end: current.serviceEnd, daysLeft: current.serviceEnd ? Math.max(0, daysBetween(today, current.serviceEnd)) : null } : null,
            release: nextReady ? { title: `Line ${nextReady.lineNumber} ready`, date: nextReady.serviceEnd!, days: Math.max(0, daysBetween(today, nextReady.serviceEnd!)) } : null,
          }}
          releaseLabel={nextReady ? `Line ${nextReady.lineNumber} ready` : null}
          releaseCode={nextReady ? `Line ${nextReady.lineNumber}` : null}
          releasePercent={null}
          planPercent={lines.length ? Math.round(lines.reduce((n, l) => n + l.percent, 0) / lines.length) : null}
          counts={{ done, moving: 0, total: all.length, percent: all.length ? Math.round((done / all.length) * 100) : null }}
          updated={today}
        />
      </div>
      {phases.some((p) => p.start) && <BuildLine phases={phases} releases={releases} now={Date.parse(`${today}T12:00:00Z`)} />}
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {sorted.map((l) => (
          <li key={l.id} className="py-3.5" data-schedule-line={l.lineNumber}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="min-w-0 text-[15px]"><b>Line {l.lineNumber}</b> · {l.description}</p>
              <p className="text-[13px] text-ink-2">{l.serviceStart ?? "…"} → {l.serviceEnd ?? "…"} · <b className="text-ink">{l.percent}%</b>{isCurrent(l) && <span className="ml-1.5 rounded-full bg-magenta px-1.5 text-[11px] font-bold text-white">now</span>}</p>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden><div className="h-full rounded-full bg-magenta" style={{ width: `${Math.min(100, l.percent)}%` }} /></div>
            {milestones.get(l.id) && <Milestones orderId={orderId} rows={milestones.get(l.id)!} canReport={canReport} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
