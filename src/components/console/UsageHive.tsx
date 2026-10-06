"use client";

import { useRebuild, RebuildBadge } from "@/components/motion/Rebuild";
import { isCounted, type Figure } from "@/lib/figure";
import "@/components/console/honeycomb.css";
import type { UsageLevel } from "@/lib/usage-areas";

// Usage v4 honeycomb (mockup usage_v4 2026-10-05): six outlined hex cells, tinted by level, rotating every 15s.
export type HiveCell = { key: string; label: string; figure: Figure; href: string; level: UsageLevel | null; money?: boolean };

// [fill, outline, value, label] — Health's palette (2026-10-05): None white + grey dashed · Low white + 2.5px ink ·
// Medium solid magenta · Strong solid ink. No tints.
export const HIVE_FILL: Record<UsageLevel, [string, string, string, string]> = {
  none: ["var(--color-surface)", "#9a95ab", "#77728c", "#77728c"],
  low: ["var(--color-surface)", "var(--color-ink)", "var(--color-ink)", "var(--color-ink)"],
  medium: ["#d72cd6", "#d72cd6", "#fff", "#fff"],
  strong: ["var(--color-ink)", "var(--color-ink)", "var(--color-surface)", "var(--color-surface)"],
};
const STROKE: Record<UsageLevel, number> = { none: 1.6, low: 2.5, medium: 2, strong: 2 };
const LEVELS: [UsageLevel, string][] = [["none", "None"], ["low", "Low"], ["medium", "Medium"], ["strong", "Strong"]];

const R = 44;
const HEX = (() => {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    p.push(`${(R * Math.cos(a)).toFixed(1)},${(R * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join("L")}Z`;
})();
const W = R * 1.74, H = R * 1.52, CX = 210, CY = 135;
const SLOTS = [[CX - W / 2, CY - H], [CX + W / 2, CY - H], [CX - W, CY], [CX, CY], [CX + W, CY], [CX, CY + H]];

export function UsageHive({ cells }: { cells: HiveCell[] }) {
  const { cycle, secondsLeft, still } = useRebuild();
  const off = still ? 0 : cycle;
  return (
    <div className="pm-hive-picture relative flex h-full min-h-[290px] flex-col md:min-h-[330px]">
      <svg viewBox="0 0 420 270" preserveAspectRatio="xMidYMid meet" className="pm-hive w-full flex-1" data-layout="v4" data-cycle={cycle} role="list" aria-label="Your areas">
        {cells.map((c, i) => {
          const counted = isCounted(c.figure);
          const lvl: UsageLevel = c.level ?? "none";
          const [fill, stroke, val, lab] = HIVE_FILL[lvl];
          const dashed = lvl === "none";
          const [x, y] = SLOTS[(i + off) % 6];
          const value = counted ? (c.money ? `$${(c.figure as number).toLocaleString("en-US")}` : (c.figure as number).toLocaleString("en-US")) : "—";
          return (
            <a
              key={c.key}
              href={c.href}
              role="listitem"
              className="pm-hive-cell"
              data-cell={c.key}
              data-level={lvl}
              data-counted={counted ? "yes" : "no"}
              aria-label={counted ? `${c.label}: ${value}, ${LEVELS.find((l) => l[0] === lvl)![1]}` : `${c.label}: not counted — ${(c.figure as { uncounted: string }).uncounted}`}
            >
              <g style={{ transform: `translate(${x}px, ${y}px)`, transition: still ? "none" : "transform 1s cubic-bezier(.4,.1,.2,1)" }}>
                <path d={HEX} style={{ fill, stroke }} strokeWidth={STROKE[lvl]} strokeDasharray={dashed ? "5 4" : undefined} data-stroke={stroke} />
                <text y={3} textAnchor="middle" fontSize={19} fontWeight={700} style={{ fill: val }}>{value}</text>
                <text y={18} textAnchor="middle" fontSize={8.5} fontWeight={600} style={{ fill: lab }}>{c.label}</text>
              </g>
            </a>
          );
        })}
      </svg>
      <ul className="pm-hive-key mb-1 flex justify-center gap-3.5 text-[11px] text-ink-3" aria-label="What the shading means">
        {LEVELS.map(([k, label]) => (
          <li key={k} className="flex items-center">
            <span
              aria-hidden
              data-level={k}
              className="mr-1.5 inline-block h-2.5 w-2.5"
              style={{ background: HIVE_FILL[k][0], border: `${k === "low" ? 2 : 1}px ${k === "none" ? "dashed" : "solid"} ${HIVE_FILL[k][1]}` }}
            />
            {label}
          </li>
        ))}
      </ul>
      <div className="flex justify-center pb-2">
        <RebuildBadge secondsLeft={secondsLeft} />
      </div>
    </div>
  );
}
