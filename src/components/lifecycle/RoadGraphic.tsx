import { PROVIDER_ROAD, ROAD_PHASES } from "@/lib/user-levels";

// RD-E004: the provider road — 8 stops in three colored phases (Join & Get Found · Win Work · Get Paid), "You are here".
const INK = "#272334";
const INK2 = "#5b5870";
const NUM = "#8A90A8";
const J = ROAD_PHASES.join, W = ROAD_PHASES.win, P = ROAD_PHASES.paid;
// Stops 1–4 on the top row (left → right); 5–8 on the bottom row (right → left).
const AT: [number, number][] = [[130, 110], [370, 110], [610, 110], [850, 110], [880, 330], [640, 330], [400, 330], [160, 330]];
const SEG = { join: "M60 110 H850", win: "M850 110 H900 C1040 110 1040 330 900 330 H880", paid: "M880 330 H120" };

function Road({ d, color, w = 28 }: { d: string; color: string; w?: number }) {
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

/** `current` = index of the stop you're on (0-based); `PROVIDER_ROAD.length` = every stop done. */
export function RoadGraphic({ current, hereLabel = "YOU ARE HERE" }: { current: number; hereLabel?: string }) {
  const here = Math.min(Math.max(current, 0), PROVIDER_ROAD.length);
  return (
    <svg viewBox="0 0 1080 460" role="img" aria-label={`Provider road, ${PROVIDER_ROAD.length} stops`} data-road-graphic data-current={here + 1} className="block h-auto w-full font-sans">
      <rect x={10} y={20} width={1060} height={190} rx={18} fill={J.band} />
      <rect x={760} y={220} width={310} height={230} rx={18} fill={W.band} />
      <rect x={10} y={220} width={740} height={230} rx={18} fill={P.band} />
      <text x={34} y={46} fill={J.color} fontWeight={800} fontSize={11} letterSpacing=".14em">{J.label.toUpperCase()}</text>
      <text x={1046} y={246} textAnchor="end" fill={W.color} fontWeight={800} fontSize={11} letterSpacing=".14em">{W.label.toUpperCase()}</text>
      <text x={34} y={246} fill={P.color} fontWeight={800} fontSize={11} letterSpacing=".14em">{P.label.toUpperCase()}</text>
      <Road d={SEG.join} color={J.track} />
      <Road d={SEG.win} color={W.track} />
      <Road d={SEG.paid} color={P.track} />
      {here > 0 && <Road d={here <= 3 ? `M60 110 H${AT[here][0]}` : SEG.join} color={J.color} />}
      {here >= 4 && <Road d={SEG.win} color={W.color} />}
      {here >= 5 && <Road d={`M880 330 H${here >= 8 ? 120 : AT[here][0]}`} color={P.color} />}
      <path d={`${SEG.join} ${SEG.win.replace("M850 110 ", "")} H120`} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 12" />
      {PROVIDER_ROAD.map((s, i) => {
        const [x, y] = AT[i];
        const C = ROAD_PHASES[s.phase ?? "join"].color;
        const done = i < here;
        const now = i === here;
        const last = i === PROVIDER_ROAD.length - 1;
        return (
          <g key={s.key} data-stop={i + 1} data-done={done || undefined} data-here={now || undefined}>
            {now && <circle cx={x} cy={y} r={28} fill="none" stroke="rgba(39,35,52,.15)" strokeWidth={10} />}
            <circle cx={x} cy={y} r={last ? 26 : 22} fill={done ? C : now ? INK : "#fff"} stroke={now ? INK : C} strokeWidth={3} />
            <text x={x} y={y + 6} textAnchor="middle" fill={done || now ? "#fff" : C} fontWeight={800} fontSize={16}>{done ? "✓" : i + 1}</text>
            <text x={x} y={y + 50} textAnchor="middle" fill={done || now || last ? INK : INK2} fontWeight={700} fontSize={13}>{s.step}</text>
            <text x={x} y={y + 65} textAnchor="middle" fill={done ? C : NUM} fontWeight={700} fontSize={9.5} letterSpacing=".08em">{s.status.toUpperCase()}</text>
            {s.time && <text x={x} y={y + 81} textAnchor="middle" fill={INK2} fontWeight={600} fontSize={10.5}>⏱ {s.time}</text>}
            {s.gate && <text x={x} y={y - 38} textAnchor="middle" fill={INK} fontWeight={800} fontSize={10}>{s.admin ? "GATE · BEFORE PAYMENT" : "GATE"}</text>}
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
