import { PROVIDER_ROAD, ROAD_PHASES, roadLabelThree } from "@/lib/user-levels";

// Provider road v6.1 (mockup provider_road_v6_1_mockup_2026-10-13): built from boxes and text, not a scaled SVG,
// so labels stay ≥12px at any width. Every label is exactly three lines (Scott 10-13). Phones use RoadStepper.
const OFF = "#C9CDDC";

function Lock({ color }: { color: string }) {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
      <rect x="2" y="9" width="16" height="12" rx="2" fill="#fff" stroke={color} strokeWidth="2" />
      <path d="M6 9V6a4 4 0 0 1 8 0v3" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/** `current` = index of the stop you're on (0-based); `PROVIDER_ROAD.length` = every stop done. */
export function RoadGraphic({ current }: { current: number; hereLabel?: string }) {
  const here = Math.min(Math.max(current, 0), PROVIDER_ROAD.length);
  const n = PROVIDER_ROAD.length;
  const phases = (["join", "win", "paid"] as const).map((ph) => ({ ph, span: PROVIDER_ROAD.filter((s) => s.phase === ph).length }));
  return (
    <div role="img" aria-label={`Provider road, ${n} stops`} data-road-graphic data-current={here + 1} className="pt-5">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {PROVIDER_ROAD.map((s, i) => {
          const C = ROAD_PHASES[s.phase ?? "join"].color;
          const done = i < here;
          const now = i === here;
          const next = PROVIDER_ROAD[i + 1];
          const [a, b, c] = roadLabelThree(s.step);
          return (
            <div key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined} className="relative flex flex-col items-center pt-1.5 text-center">
              {i < n - 1 && <span aria-hidden className="absolute left-1/2 top-[20px] h-1 w-full" style={{ background: i < here ? C : OFF }} />}
              {next?.lockBefore && (
                <span data-road-lock className="absolute left-full top-[-14px] z-[2] flex -translate-x-1/2 flex-col items-center bg-white px-1">
                  <small className="mb-0.5 whitespace-nowrap text-[10.5px] font-bold" style={{ color: ROAD_PHASES[next.phase ?? "paid"].color }}>{next.lockBefore}</small>
                  <Lock color={ROAD_PHASES[next.phase ?? "paid"].color} />
                </span>
              )}
              <span
                className={"relative z-[1] grid place-items-center rounded-full font-extrabold " + (now ? "-mt-[3px] h-[38px] w-[38px] border-4 text-[13px]" : "h-8 w-8 border-[3px] text-[13px]")}
                style={{ borderColor: C, background: done ? C : "#fff", color: done ? "#fff" : C }}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={"mt-2 whitespace-nowrap px-1 text-[12.5px] leading-[1.25] text-ink " + (now ? "font-extrabold" : "font-semibold")}>
                {a}<br />{b}<br />{c}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 grid gap-x-2.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {phases.map(({ ph, span }) => (
          <div key={ph} style={{ gridColumn: `span ${span}` }}>
            <i className="block h-[3px]" style={{ background: ROAD_PHASES[ph].color }} />
            <b className="mt-1.5 block text-center text-[10.5px] tracking-[0.14em]" style={{ color: ROAD_PHASES[ph].color }}>{ROAD_PHASES[ph].label.toUpperCase()}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
