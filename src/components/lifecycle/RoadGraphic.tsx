import { PROVIDER_ROAD } from "@/lib/user-levels";

// The provider road (mockup provider_roadmap_simple 2026-10-07): 9 stops on a winding road, two rows, "You are here".
const DONE = "#5C6485";
const AHEAD_RING = "#C9CDDC";
const AHEAD_NUM = "#8A90A8";
const TRACK = "#E8EAF1";
const INK = "#272334";
const INK2 = "#5b5870";
const ROAD = "M60 110 H920 C1040 110 1040 330 920 330 H120";
// Stops 1–5 on the top row (left → right), 6–9 on the bottom row (right → left).
const AT: [number, number][] = [[100, 110], [300, 110], [500, 110], [700, 110], [900, 110], [880, 330], [640, 330], [400, 330], [170, 330]];

/** `current` = index of the stop you're on (0-based); `PROVIDER_ROAD.length` = every stop done. */
export function RoadGraphic({ current, hereLabel = "YOU ARE HERE" }: { current: number; hereLabel?: string }) {
  const here = Math.min(Math.max(current, 0), PROVIDER_ROAD.length);
  // Done stretch of road: along the top row up to the current stop, or all of it plus the bend once past stop 5.
  const doneTo = here <= 4 ? `M60 110 H${AT[here][0]}` : here >= 9 ? ROAD : `M60 110 H920 C1040 110 1040 330 920 330 H${AT[here][0]}`;
  return (
    <svg viewBox="0 0 1080 450" role="img" aria-label={`Provider road, ${PROVIDER_ROAD.length} stops`} data-road-graphic data-current={here + 1} className="block h-auto w-full font-sans">
      <path d={ROAD} fill="none" stroke={TRACK} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROAD} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 12" />
      {here > 0 && <path d={doneTo} fill="none" stroke={DONE} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" />}
      {PROVIDER_ROAD.map((s, i) => {
        const [x, y] = AT[i];
        const done = i < here;
        const now = i === here;
        const last = i === PROVIDER_ROAD.length - 1;
        return (
          <g key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined}>
            {now && <circle cx={x} cy={y} r={28} fill="none" stroke="rgba(39,35,52,.15)" strokeWidth={10} />}
            <circle cx={x} cy={y} r={last && !done && !now ? 26 : 22} fill={done ? DONE : now ? INK : "#fff"} stroke={done || now ? "none" : last ? "#3A4166" : AHEAD_RING} strokeWidth={3} />
            <text x={x} y={y + 6} textAnchor="middle" fill={done || now ? "#fff" : last ? "#3A4166" : AHEAD_NUM} fontWeight={800} fontSize={16}>{done ? "✓" : i + 1}</text>
            <text x={x} y={y + 50} textAnchor="middle" fill={done || now || last ? INK : INK2} fontWeight={700} fontSize={13}>{s.step}</text>
            <text x={x} y={y + 65} textAnchor="middle" fill={done ? DONE : AHEAD_NUM} fontWeight={700} fontSize={9.5} letterSpacing=".08em">{s.status.toUpperCase()}</text>
            {s.time && <text x={x} y={y + 81} textAnchor="middle" fill={INK2} fontWeight={600} fontSize={10.5}>⏱ {s.time}</text>}
            {s.gate && <text x={x} y={y - 40} textAnchor="middle" fill={INK} fontWeight={800} fontSize={10}>{s.admin ? "GATE · ADMIN" : "GATE"}</text>}
            {now && (
              <>
                <rect x={x - 53} y={y + 90} width={106} height={20} fill="#d72cd6" />
                <text x={x} y={y + 104} textAnchor="middle" fill="#fff" fontWeight={700} fontSize={11}>{hereLabel}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
