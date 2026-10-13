import { PROVIDER_ROAD, ROAD_PHASES, roadLabelLines } from "@/lib/user-levels";

// RV-E001/E003: the provider road v6 (mockup provider_road_v6) — one row of 8 stops, phase bands below, a lock before Get Paid.
const INK = "#272334";
const OFF = "#C9CDDC";
const X0 = 70, X1 = 930, Y = 60;
const xAt = (i: number) => X0 + ((X1 - X0) / (PROVIDER_ROAD.length - 1)) * i;

/** `current` = index of the stop you're on (0-based); `PROVIDER_ROAD.length` = every stop done. */
export function RoadGraphic({ current }: { current: number; hereLabel?: string }) {
  const here = Math.min(Math.max(current, 0), PROVIDER_ROAD.length);
  const phases = (["join", "win", "paid"] as const).map((ph) => {
    const idx = PROVIDER_ROAD.map((s, i) => (s.phase === ph ? i : -1)).filter((i) => i >= 0);
    return { ph, from: xAt(idx[0]) - 20, to: xAt(idx[idx.length - 1]) + 20 };
  });
  return (
    <svg viewBox="0 0 1000 170" role="img" aria-label={`Provider road, ${PROVIDER_ROAD.length} stops`} data-road-graphic data-current={here + 1} className="block h-auto w-full font-sans">
      {PROVIDER_ROAD.slice(0, -1).map((s, i) => (
        <line key={`l${i}`} x1={xAt(i)} y1={Y} x2={xAt(i + 1)} y2={Y} stroke={i < here ? ROAD_PHASES[s.phase ?? "join"].color : OFF} strokeWidth={4} />
      ))}
      {PROVIDER_ROAD.map((s, i) => {
        const C = ROAD_PHASES[s.phase ?? "join"].color;
        const done = i < here;
        const now = i === here;
        const x = xAt(i);
        const [l1, l2] = roadLabelLines(s.step);
        return (
          <g key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined}>
            <circle cx={x} cy={Y} r={now ? 18 : 15} fill={done ? C : "#fff"} stroke={C} strokeWidth={now ? 4 : 3} />
            <text x={x} y={Y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={done ? "#fff" : C}>{done ? "✓" : i + 1}</text>
            <text x={x} y={102} textAnchor="middle" fontSize={12.5} fontWeight={now ? 800 : 600} fill={INK}>{l1}</text>
            <text x={x} y={117} textAnchor="middle" fontSize={12.5} fontWeight={now ? 800 : 600} fill={INK}>{l2}</text>
          </g>
        );
      })}
      {PROVIDER_ROAD.map((s, i) => {
        if (!s.lockBefore || i === 0) return null;
        const C = ROAD_PHASES[s.phase ?? "paid"].color;
        const mid = (xAt(i - 1) + xAt(i)) / 2;
        return (
          <g key={`lock${i}`} data-road-lock>
            <g transform={`translate(${mid - 10} 38)`}>
              <rect x={2} y={9} width={16} height={12} rx={2} fill="#fff" stroke={C} strokeWidth={2} />
              <path d="M6 9V6a4 4 0 0 1 8 0v3" fill="none" stroke={C} strokeWidth={2} />
            </g>
            <text x={mid} y={30} textAnchor="middle" fontSize={10.5} fill={C} fontWeight={700}>{s.lockBefore}</text>
          </g>
        );
      })}
      {phases.map(({ ph, from, to }) => (
        <g key={ph}>
          <rect x={from} y={142} width={to - from} height={3} fill={ROAD_PHASES[ph].color} />
          <text x={(from + to) / 2} y={162} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={1.5} fill={ROAD_PHASES[ph].color}>{ROAD_PHASES[ph].label.toUpperCase()}</text>
        </g>
      ))}
    </svg>
  );
}
