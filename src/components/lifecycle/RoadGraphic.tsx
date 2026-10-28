import type { ReactNode } from "react";
import { BUYER_ROAD, BUYER_PHASE_LABELS, PROVIDER_ROAD, ROAD_PHASES, roadLabelThree, type LifecycleStep, type RoadPhase } from "@/lib/user-levels";

// Provider road v6.1 (mockup provider_road_v6_1_mockup_2026-10-13): built from boxes and text, not a scaled SVG,
// so labels stay ≥12px at any width. Every label is exactly three lines (Scott 10-13). Phones use RoadStepper.
const OFF = "var(--color-state-border)";

function Lock({ color }: { color: string }) {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
      <rect x="2" y="9" width="16" height="12" rx="2" fill="var(--color-surface)" stroke={color} strokeWidth="2" />
      <path d="M6 9V6a4 4 0 0 1 8 0v3" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/** `current` = index of the stop you're on (0-based); `road.length` = every stop done. BD-E005: buyers pass BUYER_ROAD;
 *  `waiting` marks a stop counted done but not yet confirmed (a pending company join). */
export type RoadCount = { n: number; label: string; sub?: ReactNode; href?: string };
/** `counts` (admin): every stop drawn in its colour, no "you are here", with a count block under each stop. */
/** RA-E002: a red count on a stop (that app's waiting items) — clicking opens the app's Overview. */
export type RoadBadge = { n: number; href: string; label: string };
export function RoadGraphic({ current, road = PROVIDER_ROAD, label = "Provider road", waiting, counts, badges }: { current: number; hereLabel?: string; road?: LifecycleStep[]; label?: string; waiting?: { key: string; label: string } | null; counts?: RoadCount[]; badges?: Partial<Record<string, RoadBadge | RoadBadge[]>> }) {
  const here = counts ? -1 : Math.min(Math.max(current, 0), road.length);
  const n = road.length;
  const phases = (["join", "win", "paid"] as RoadPhase[]).map((ph) => ({ ph, span: road.filter((s) => s.phase === ph).length })).filter((x) => x.span > 0);
  return (
    <div role={badges ? undefined : "img"} aria-label={`${label}, ${n} stops`} data-road-graphic data-current={here + 1} className="pt-5">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {road.map((s, i) => {
          const C = ROAD_PHASES[s.phase ?? "join"].color;
          const done = i < here;
          const now = i === here;
          const next = road[i + 1];
          const wait = waiting?.key === s.key;
          const [a, b, c] = s.lines ?? roadLabelThree(s.step);
          return (
            <div key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined} data-waiting={wait || undefined} className="relative flex flex-col items-center pt-1.5 text-center">
              {i < n - 1 && <span aria-hidden className="absolute left-1/2 top-[20px] h-1 w-full" style={{ background: i < here ? C : OFF }} />}
              {next?.lockBefore && (
                <span data-road-lock className="absolute left-full top-[-14px] z-[2] flex -translate-x-1/2 flex-col items-center bg-white px-1">
                  <small className="mb-0.5 whitespace-nowrap text-[10.5px] font-bold" style={{ color: ROAD_PHASES[next.phase ?? "paid"].color }}>{next.lockBefore}</small>
                  <Lock color={ROAD_PHASES[next.phase ?? "paid"].color} />
                </span>
              )}
              <span
                className={"relative z-[1] grid place-items-center rounded-full font-extrabold " + (now ? "-mt-[3px] h-[38px] w-[38px] border-4 text-[13px]" : "h-8 w-8 border-[3px] text-[13px]")}
                style={{ borderColor: C, background: done && !wait ? C : "var(--color-surface)", color: done && !wait ? "white" : C }}
              >
                {wait ? "…" : done ? "✓" : i + 1}
                {/* HB-E008: one red count per app on its step (e.g. Hire + Shop, and Estimate beside it). */}
                {([] as RoadBadge[]).concat(badges?.[s.key] ?? []).filter((b) => b.n > 0).map((b, k) => (
                  <a key={b.label} href={b.href} data-road-badge={s.key} title={b.label} aria-label={`${b.n} waiting in ${b.label}`} className="absolute -top-2.5 grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white bg-state-declined px-1 text-[11.5px] font-extrabold text-white hover:bg-state-declined/90" style={{ right: -12 - k * 24 }}>
                    {b.n}
                  </a>
                ))}
              </span>
              <span className={"mt-2 whitespace-nowrap px-1 text-[12.5px] leading-[1.25] text-ink " + (now ? "font-extrabold" : "font-semibold")}>
                {a}<br />{b}<br />{c}
              </span>
              {wait && <span className="mt-1 text-[11.5px] font-bold text-magenta-dark">{waiting!.label}</span>}
              {counts?.[i] && (
                <a href={counts[i].href} data-box={road[i].key} className="mt-2 block w-[calc(100%-8px)] border border-line bg-surface px-1 py-1.5 hover:border-ink">
                  <b className="block text-[24px] leading-tight" data-box-count>{counts[i].n}</b>
                  <span className="block text-[12px] font-bold">{counts[i].label}</span>
                  {counts[i].sub && <span className="mt-0.5 block text-[11px] text-ink-2">{counts[i].sub}</span>}
                </a>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 grid gap-x-2.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {phases.map(({ ph, span }) => (
          <div key={ph} style={{ gridColumn: `span ${span}` }}>
            <i className="block h-[3px]" style={{ background: ROAD_PHASES[ph].color }} />
            <b className="mt-1.5 block text-center text-[10.5px] tracking-[0.14em]" style={{ color: ROAD_PHASES[ph].color }}>{(road === BUYER_ROAD ? BUYER_PHASE_LABELS[ph] : ROAD_PHASES[ph].label).toUpperCase()}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
