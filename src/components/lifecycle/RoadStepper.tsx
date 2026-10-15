import { PROVIDER_ROAD, ROAD_PHASES, type LifecycleStep } from "@/lib/user-levels";

// M-E008 / RV-E001: the 8-stop road as a vertical stepper on phones — phase colors, magenta now, the lock before Get Paid.
export function RoadStepper({ current, road = PROVIDER_ROAD, waiting }: { current: number; road?: LifecycleStep[]; waiting?: { key: string; label: string } | null }) {
  const ROAD = road;
  const here = Math.min(Math.max(current, 0), ROAD.length);
  return (
    <ol data-road-stepper data-current={here + 1} className="grid">
      {ROAD.map((s, i) => {
        const done = i < here;
        const now = i === here;
        const last = i === ROAD.length - 1;
        const wait = waiting?.key === s.key;
        const ph = ROAD_PHASES[s.phase ?? "join"];
        const firstOfPhase = i === 0 || ROAD[i - 1].phase !== s.phase;
        return (
          <li key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined} aria-current={now ? "step" : undefined} className="grid grid-cols-[28px_1fr] gap-x-3">
            {firstOfPhase && (
              <span className="col-span-2 pb-2 text-[10.5px] font-extrabold tracking-[0.12em]" style={{ color: ph.color }}>{ph.label.toUpperCase()}</span>
            )}
            {s.lockBefore && (
              <span data-road-lock className="col-span-2 flex items-center gap-1.5 pb-2 text-[11px] font-bold" style={{ color: ph.color }}>
                <span aria-hidden>🔒</span> Payout details · {s.lockBefore}
              </span>
            )}
            <span className="flex flex-col items-center">
              <span
                className={"grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold " + (now ? "bg-magenta text-white" : "")}
                style={now ? undefined : done ? { background: ph.color, color: "#fff" } : { border: `2px solid ${ph.color}`, color: ph.color, background: "#fff" }}
              >
                {wait ? "…" : done ? "✓" : i + 1}
              </span>
              {!last && <span aria-hidden className="w-[2px] flex-1" style={{ background: done ? ph.color : ph.track }} />}
            </span>
            <span className="min-w-0 pb-4 pt-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <b className={"text-[14px] " + (now ? "text-magenta-dark" : done ? "text-ink" : "text-ink-2")}>{s.step}</b>
                {s.gate && <span className="text-[10px] font-extrabold tracking-[0.08em] text-ink">{s.admin ? "GATE · BEFORE PAYMENT" : "GATE"}</span>}
              </span>
              <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-ink-2">
                <span className={"font-bold uppercase tracking-[0.06em]" + (wait ? " text-magenta-dark" : "")}>{now ? "You are here" : wait ? waiting!.label : s.status}</span>
                {s.time && <span>⏱ {s.time}</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
