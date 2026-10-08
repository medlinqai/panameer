"use client";

import { useMemo } from "react";
import { useRebuild } from "@/components/motion/Rebuild";

// One shared bubble picture (Learn + Groups, 2026-10-08): you in the centre, bubbles on two loose rings, size by a number,
// drift every 15 s (reduced motion = still). Ink = done/active · dashed #C9CDDC = quiet/not started · magenta ring = you are here / waiting on you.
export type Bubble = {
  key: string;
  href: string;
  label: string;
  hover: string;
  size: number;
  /** 0..1 rising ink fill; 1 = solid; null = quiet (dashed grey). */
  fill: number | null;
  check?: boolean;
  ring?: boolean;
};

const W = 400;
const H = 340;
const CX = W / 2;
const CY = H / 2 - 6;
const MIN_R = 14;
const MAX_R = 34;
const INK = "#272334";
const OFF = "#C9CDDC";
const MAG = "#d72cd6";

// Small deterministic jitter so a cycle moves bubbles without reshuffling them.
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const clip = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function BubbleField({ bubbles, me, caption, legend }: { bubbles: Bubble[]; me: string; caption: string; legend: { label: string; swatch: "ink" | "half" | "ring" | "quiet" | "check" }[] }) {
  const { cycle, secondsLeft } = useRebuild();
  const placed = useMemo(() => {
    const max = Math.max(...bubbles.map((b) => b.size), 1);
    const min = Math.min(...bubbles.map((b) => b.size), 0);
    const span = max - min || 1;
    const inner = bubbles.slice(0, 6);
    const outer = bubbles.slice(6, 16);
    const ring = (list: Bubble[], radius: number, offset: number) =>
      list.map((b, i) => {
        const a = offset + (i / Math.max(list.length, 1)) * Math.PI * 2 + (rand(i + cycle * 7) - 0.5) * 0.35;
        const rr = radius + (rand(i * 3 + cycle * 11) - 0.5) * 18;
        const r = MIN_R + ((b.size - min) / span) * (MAX_R - MIN_R);
        return { ...b, r, x: CX + Math.cos(a) * rr * 1.15, y: CY + Math.sin(a) * rr * 0.92 };
      });
    return [...ring(inner, 92, -Math.PI / 2 + rand(cycle) * 0.4), ...ring(outer, 146, -Math.PI / 2.4 + rand(cycle + 5) * 0.4)];
  }, [bubbles, cycle]);

  return (
    <div data-bubble-field>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="mx-auto block max-w-[400px]" role="img" aria-label={caption}>
        {placed.map((b) => (
          <line key={`l-${b.key}`} x1={CX} y1={CY} x2={b.x} y2={b.y} stroke={OFF} strokeWidth={1} strokeDasharray="2 4" style={{ transition: "all 1.2s ease" }} />
        ))}
        {placed.map((b, i) => {
          const id = `bf-clip-${b.key.replace(/[^a-z0-9]/gi, "")}-${i}`;
          const solid = b.fill != null && b.fill >= 1;
          return (
            <a key={b.key} href={b.href} aria-label={b.hover}>
              <g style={{ transform: `translate(${b.x}px, ${b.y}px)`, transition: "transform 1.2s ease" }}>
                <title>{b.hover}</title>
                {b.fill == null ? (
                  <circle r={b.r} fill="#fff" stroke={OFF} strokeWidth={2} strokeDasharray="4 4" />
                ) : (
                  <>
                    <circle r={b.r} fill="#fff" stroke={INK} strokeWidth={2} />
                    {b.fill > 0 && (
                      <>
                        <clipPath id={id}><circle r={b.r} /></clipPath>
                        <rect x={-b.r} y={b.r - 2 * b.r * Math.min(1, b.fill)} width={2 * b.r} height={2 * b.r * Math.min(1, b.fill)} fill={INK} clipPath={`url(#${id})`} />
                      </>
                    )}
                  </>
                )}
                {b.ring && <circle r={b.r + 5} fill="none" stroke={MAG} strokeWidth={3} />}
                {b.check && <text y={5} textAnchor="middle" fontSize={14} fontWeight={800} fill={solid ? "#fff" : INK}>✓</text>}
                <text y={b.r + 13} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#4a4658">{clip(b.label)}</text>
              </g>
            </a>
          );
        })}
        <circle cx={CX} cy={CY} r={24} fill={INK} />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} letterSpacing={1} fill="#fff">{me}</text>
      </svg>
      <p className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink-2">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            <i aria-hidden className={"inline-block h-2.5 w-2.5 rounded-full " + (l.swatch === "ink" || l.swatch === "check" ? "bg-ink" : l.swatch === "half" ? "border-2 border-ink bg-[linear-gradient(to_top,#272334_50%,#fff_50%)]" : l.swatch === "ring" ? "border-2 border-magenta" : "border-2 border-dashed border-[#C9CDDC]")} />
            {l.label}
          </span>
        ))}
      </p>
      <p className="mt-1 text-center text-[11px] text-ink-3">
        {caption}
        {secondsLeft !== null && <span className="tabular-nums"> · rebuilds in {secondsLeft}s</span>}
      </p>
    </div>
  );
}
