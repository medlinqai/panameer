import Link from "next/link";
import type { Figure } from "@/lib/figure";
import { isCounted } from "@/lib/figure";
import { UsageHive, type HiveCell } from "@/components/console/UsageHive";

// Usage hero (P-E003: Account-page style, no box): honeycomb left, thin vertical rule, stats + summary + actions right.

export function UsageHero({
  cells,
  stats,
  summary,
  scoreComplete,
}: {
  cells: HiveCell[];
  stats: { label: string; value: Figure }[];
  summary: string;
  scoreComplete: boolean;
}) {
  return (
    <section data-testid="usage-hero" className="grid border-b border-line pb-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="pm-usage-viz border-b border-line md:border-b-0 md:border-r">
        <UsageHive cells={cells} />
      </div>
      <div className="flex flex-col py-[22px] md:pl-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-magenta-dark">Usage</p>
        <h2 className="mb-3.5 mt-1 text-[22px] font-bold">What&apos;s Happening Around You</h2>
        <div className="mb-3.5 grid grid-cols-3 gap-2.5">
          {stats.map((s) => (
            <div key={s.label}>
              <b className="block text-[26px] leading-tight">{isCounted(s.value) ? s.value.toLocaleString("en-US") : "—"}</b>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{s.label}</span>
            </div>
          ))}
        </div>
        <p data-usage-summary className="border-t border-line pt-3 text-[13px] text-ink-2">{summary}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href="/community" className="inline-flex h-[42px] items-center border border-black bg-black px-[18px] text-[13px] font-bold text-white [[data-theme=dark]_&]:border-white [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-black">
            Invite a Colleague
          </Link>
          <Link href="/profile" className="inline-flex h-[42px] items-center border border-ink bg-surface px-[18px] text-[13px] font-bold text-ink">
            {scoreComplete ? "View Your Profile" : "Complete Your Profile"}
          </Link>
        </div>
      </div>
    </section>
  );
}
