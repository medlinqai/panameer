"use client";

import { useRebuild, RebuildBadge } from "@/components/motion/Rebuild";
import { isCounted, type Figure } from "@/lib/figure";
import "@/components/console/honeycomb.css";
import type { UsageLevel } from "@/lib/usage-areas";

// Usage v4 honeycomb (mockup usage_v4 2026-10-05): six outlined hex cells, tinted by level, rotating every 15s.
export type HiveCell = { key: string; label: string; figure: Figure; href: string; level: UsageLevel | null; money?: boolean };

// [fill, outline, value, label] — Health's palette (2026-10-05): None white + grey dashed · Low white + 2.5px ink ·
// Medium solid magenta · Strong solid ink. No tints.
// 2026-10-07: active = #3A4166, none yet = #C9CDDC dashed (brand completed / not completed).
// P2-E008: solid ink hexes with white text for any count > 0; dashed outline and muted text for 0.
const R = 40;
const HEX = (() => {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    p.push(`${(R * Math.cos(a)).toFixed(1)},${(R * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join("L")}Z`;
})();
const W = R * 1.8, H = R * 1.56, CX = 210, CY = 135;
// Rows of 3; the middle row sits half a cell to the right, the whole comb centered.
const SLOTS = [-1, 0, 1].flatMap((row) => [-1, 0, 1].map((col) => [CX + col * W + (row === 0 ? W / 4 : -W / 4), CY + row * H]));

export function UsageHive({ cells }: { cells: HiveCell[] }) {
  const { cycle, secondsLeft, still } = useRebuild();
  const off = still ? 0 : cycle;
  const n = Math.min(cells.length, SLOTS.length);
  return (
    <div className="pm-hive-picture relative flex h-full min-h-[290px] flex-col md:min-h-[330px]">
      <svg viewBox="74 28 272 214" preserveAspectRatio="xMidYMid meet" className="pm-hive w-full flex-1" data-layout="v5" data-cycle={cycle} role="list" aria-label="Your areas">
        {cells.slice(0, n).map((c, i) => {
          const counted = isCounted(c.figure);
          const active = counted && (c.figure as number) > 0;
          const [x, y] = SLOTS[(i + off) % n];
          const value = counted ? (c.money ? `$${(c.figure as number).toLocaleString("en-US")}` : (c.figure as number).toLocaleString("en-US")) : "—";
          return (
            <a
              key={c.key}
              href={c.href}
              role="listitem"
              className="pm-hive-cell"
              data-cell={c.key}
              data-active={active ? "yes" : "no"}
              data-counted={counted ? "yes" : "no"}
              aria-label={counted ? `${c.label}: ${value}` : `${c.label}: not counted — ${(c.figure as { uncounted: string }).uncounted}`}
            >
              <g style={{ transform: `translate(${x}px, ${y}px)`, transition: still ? "none" : "transform 1s cubic-bezier(.4,.1,.2,1)" }}>
                <path
                  d={HEX}
                  style={{ fill: active ? "var(--color-ink)" : "var(--color-surface)", stroke: active ? "var(--color-ink)" : "#C9CDDC" }}
                  strokeWidth={active ? 2 : 1.6}
                  strokeDasharray={active ? undefined : "5 4"}
                />
                <text y={3} textAnchor="middle" fontSize={18} fontWeight={700} style={{ fill: active ? "#fff" : "var(--color-ink-3)" }}>{value}</text>
                <text y={17} textAnchor="middle" fontSize={8.5} fontWeight={600} style={{ fill: active ? "#fff" : "var(--color-ink-3)" }}>{c.label}</text>
              </g>
            </a>
          );
        })}
      </svg>
      <ul className="pm-hive-key mb-1 flex justify-center gap-3.5 text-[11px] text-ink-3" aria-label="What the shading means">
        <li className="flex items-center">
          <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 bg-ink" />
          Activity
        </li>
        <li className="flex items-center">
          <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 border border-dashed border-[#C9CDDC]" />
          None yet
        </li>
      </ul>
      <div className="flex justify-center pb-2">
        <RebuildBadge secondsLeft={secondsLeft} />
      </div>
    </div>
  );
}
