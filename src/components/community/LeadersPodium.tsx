import type { GrowthRow } from "@/lib/growth-score";

// Leaders hero picture: this month's top three as a podium (1 centre and tallest); the viewer's column is marked in magenta.
const INK = "#272334";
const OFF = "#C9CDDC";
const MAG = "#d72cd6";
// [slot centre x, column top y, column height, avatar radius, number size] for ranks 1, 2, 3.
const SLOT: Record<1 | 2 | 3, { x: number; top: number; r: number; num: number }> = {
  1: { x: 170, top: 94, r: 32, num: 40 },
  2: { x: 62, top: 136, r: 26, num: 30 },
  3: { x: 278, top: 162, r: 24, num: 28 },
};
const BASE = 240;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export function LeadersPodium({ top, viewerId, scorers, viewerRank }: { top: GrowthRow[]; viewerId: string; scorers: number; viewerRank: number | null }) {
  return (
    <div data-leaders-podium>
      <svg viewBox="0 0 340 280" width="100%" className="mx-auto block max-w-[320px]" role="img" aria-label="Top three this month">
        {([1, 2, 3] as const).map((rank) => {
          const s = SLOT[rank];
          const w = rank === 1 ? 84 : 80;
          const row = top[rank - 1];
          const cy = s.top - s.r - 10;
          if (!row)
            return (
              <g key={rank} data-empty-spot={rank}>
                <circle cx={s.x} cy={cy} r={s.r} fill="none" stroke={OFF} strokeWidth={2} strokeDasharray="5 5" />
                <rect x={s.x - w / 2} y={s.top} width={w} height={BASE - s.top} fill="none" stroke={OFF} strokeWidth={2} strokeDasharray="6 6" />
                <text x={s.x} y={s.top + (BASE - s.top) / 2 + 10} textAnchor="middle" fontSize={s.num} fontWeight={800} fill={OFF}>{rank}</text>
              </g>
            );
          const you = row.personId === viewerId;
          const clip = `podium-clip-${rank}`;
          return (
            <g key={rank} data-podium-rank={rank} data-you={you || undefined}>
              {you && <text x={s.x} y={cy - s.r - 8} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={1.5} fill={MAG}>YOU</text>}
              <circle cx={s.x} cy={cy} r={s.r} fill="#f6f5f9" />
              {row.photoUrl ? (
                <>
                  <clipPath id={clip}><circle cx={s.x} cy={cy} r={s.r} /></clipPath>
                  <image href={row.photoUrl} x={s.x - s.r} y={cy - s.r} width={s.r * 2} height={s.r * 2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
                </>
              ) : (
                <text x={s.x} y={cy + 5} textAnchor="middle" fontSize={rank === 1 ? 15 : 13} fontWeight={700} fill="#4a4658">{initials(row.name)}</text>
              )}
              <circle cx={s.x} cy={cy} r={s.r} fill="none" stroke={you ? MAG : INK} strokeWidth={you ? 4 : 2} />
              <rect x={s.x - w / 2} y={s.top} width={w} height={BASE - s.top} fill={INK} />
              {you && <rect x={s.x - w / 2} y={s.top} width={w} height={6} fill={MAG} />}
              <text x={s.x} y={s.top + (BASE - s.top) / 2 + (rank === 1 ? 4 : 2)} textAnchor="middle" fontSize={s.num} fontWeight={800} fill="#fff">{rank}</text>
              <text x={s.x} y={s.top + (BASE - s.top) / 2 + (rank === 1 ? 32 : 26)} textAnchor="middle" fontSize={12} fontWeight={600} fill={OFF}>{row.points} pts</text>
              <title>{`${row.name} · ${row.points} points`}</title>
            </g>
          );
        })}
        <line x1={10} y1={BASE} x2={330} y2={BASE} stroke={OFF} strokeWidth={2} />
      </svg>
      <p className="mt-2 text-center text-[11px] text-ink-2">
        This month · {scorers} {scorers === 1 ? "member" : "members"} with a score
        {viewerRank && viewerRank > 3 ? ` · You're #${viewerRank} this month` : ""}
      </p>
    </div>
  );
}
