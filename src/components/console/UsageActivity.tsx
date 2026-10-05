import Link from "next/link";
import { isCounted } from "@/lib/figure";
import type { ActivityArea, ActivityRange } from "@/lib/usage-activity";
import { USAGE_LEVEL_LABEL, type UsageLevel } from "@/lib/usage-areas";
import { USAGE_CARD } from "@/components/console/UsageHero";

// Usage v4 "Your Activity": six area cards, four metric rows each, goal + progress bar (ink when met).
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function UsageActivity({ areas, range, levels }: { areas: ActivityArea[]; range: ActivityRange; levels: Record<string, UsageLevel | null> }) {
  return (
    <section data-testid="usage-activity" className="mt-4">
      <div className="mx-0.5 mb-2 flex flex-wrap items-baseline justify-between gap-2.5">
        <h3 className="text-[16px] font-bold">Your Activity</h3>
        <div className="inline-flex border border-ink" role="group" aria-label="Period">
          {([["month", "This Month"], ["all", "All Time"]] as const).map(([k, label]) => (
            <Link
              key={k}
              href={k === "all" ? "/usage?range=all" : "/usage"}
              scroll={false}
              aria-current={range === k ? "true" : undefined}
              className={`px-3 py-[5px] text-[12px] font-semibold ${range === k ? "bg-ink text-surface" : "bg-surface text-ink"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {areas.map((a) => {
          const lvl = levels[a.key];
          return (
            <section key={a.key} data-area={a.key} className={`${USAGE_CARD} px-5 py-[18px]`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-magenta-dark">{a.title}</span>
                  {lvl && <span className="ml-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-3">{USAGE_LEVEL_LABEL[lvl]}</span>}
                  {a.sub && <div className="text-[11.5px] text-ink-3">{a.sub}</div>}
                </div>
                <Link href={a.href} className="text-[12.5px] font-semibold text-ink hover:text-magenta-dark">
                  {a.go} →
                </Link>
              </div>
              {a.metrics.map((m, i) => {
                const counted = isCounted(m.value);
                const v = counted ? (m.value as number) : 0;
                const pct = counted ? Math.min(100, Math.round((v / m.goal) * 100)) : 0;
                return (
                  <div key={m.label} data-metric={m.label} data-counted={counted ? "yes" : "no"} className={`py-2.5 ${i ? "border-t border-line" : ""}`}>
                    <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span>
                        {m.label}
                        {!counted && (
                          <span className="ml-1.5 border border-dashed border-[#e9e6ef] px-[5px] [[data-theme=dark]_&]:border-white/25 align-[2px] text-[9.5px] font-bold tracking-[0.06em] text-ink-3">NOT COUNTED</span>
                        )}
                        <br />
                        <em className="text-[11.5px] font-medium not-italic text-ink-3">
                          {counted ? `Goal: ${m.money ? money(m.goal) : m.goal}` : (m.value as { uncounted: string }).uncounted}
                        </em>
                      </span>
                      <b className={counted ? "text-[19px] leading-none" : "text-[15px] leading-none text-ink-3"}>
                        {counted ? (m.money ? money(v) : v.toLocaleString("en-US")) : "—"}
                      </b>
                    </div>
                    <div
                      className="mt-[7px] h-1.5 overflow-hidden rounded-[6px] bg-[#f3f1f7] [[data-theme=dark]_&]:bg-white/10"
                      style={counted ? undefined : { background: "repeating-linear-gradient(90deg,var(--color-line) 0 6px,transparent 6px 10px)" }}
                    >
                      {counted && <i className={`block h-full rounded-[6px] ${pct >= 100 ? "bg-ink" : "bg-magenta"}`} style={{ width: `${pct}%` }} />}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </section>
  );
}
