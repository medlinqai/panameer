import { PROVIDER_ROAD } from "@/lib/user-levels";

// M-E008: the 9-stop road as a vertical stepper on phones — ink ✓ done, magenta now, #C9CDDC ahead, gate + time per stop.
export function RoadStepper({ current }: { current: number }) {
  const here = Math.min(Math.max(current, 0), PROVIDER_ROAD.length);
  return (
    <ol data-road-stepper data-current={here + 1} className="grid">
      {PROVIDER_ROAD.map((s, i) => {
        const done = i < here;
        const now = i === here;
        const last = i === PROVIDER_ROAD.length - 1;
        return (
          <li key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined} aria-current={now ? "step" : undefined} className="grid grid-cols-[28px_1fr] gap-x-3">
            <span className="flex flex-col items-center">
              <span
                className={
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold " +
                  (done ? "bg-ink text-surface" : now ? "bg-magenta text-white" : "border-2 border-[#C9CDDC] bg-surface text-ink-3")
                }
              >
                {done ? "✓" : i + 1}
              </span>
              {!last && <span aria-hidden className={"w-[2px] flex-1 " + (done ? "bg-ink" : "bg-[#C9CDDC]")} />}
            </span>
            <span className="min-w-0 pb-4 pt-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <b className={"text-[14px] " + (now ? "text-magenta-dark" : done ? "text-ink" : "text-ink-2")}>{s.step}</b>
                {s.gate && <span className="text-[10px] font-extrabold tracking-[0.08em] text-ink">{s.admin ? "GATE · ADMIN" : "GATE"}</span>}
              </span>
              <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-ink-2">
                <span className="font-bold uppercase tracking-[0.06em]">{now ? "You are here" : s.status}</span>
                {s.time && <span>⏱ {s.time}</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
