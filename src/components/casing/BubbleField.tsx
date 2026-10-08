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

type Box = { x: number; y: number; w: number; h: number; fixed?: boolean };
const LABEL_H = 18;
const labelW = (s: string) => Math.min(18, s.length) * 5.4;

/** Seed on two loose rings, then relax: every bubble is a box (circle + its label) and boxes push apart until none overlap. */
function layout(rs: number[], labels: string[], seed: number, centre: { r: number; label: string } | null) {
  const n = rs.length;
  const off = rand(seed) * Math.PI * 2;
  const pts: Box[] = [];
  if (centre) pts.push({ x: CX, y: CY, w: Math.max(2 * centre.r, labelW(centre.label)) + 8, h: 2 * centre.r + LABEL_H, fixed: true });
  else pts.push({ x: CX, y: CY, w: 56, h: 52, fixed: true }); // the "YOU" disc
  rs.forEach((r, i) => {
    const ang = off + i * ((2 * Math.PI) / Math.max(n, 1));
    const rad = i % 2 ? 122 : 94;
    pts.push({ x: CX + rad * 1.35 * Math.cos(ang), y: CY + rad * 0.95 * Math.sin(ang), w: Math.max(2 * r, labelW(labels[i])) + 8, h: 2 * r + LABEL_H });
  });
  for (let it = 0; it < 800; it++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const A = pts[i], B = pts[j];
        const ox = (A.w + B.w) / 2 - Math.abs(A.x - B.x);
        const oy = (A.h + B.h) / 2 - Math.abs(A.y - B.y);
        if (ox > 0 && oy > 0) {
          moved = true;
          const sx = A.x < B.x ? -1 : 1, sy = A.y < B.y ? -1 : 1;
          if (ox < oy) {
            const d = ox / 2 + 0.5;
            if (!A.fixed) A.x += sx * d * (B.fixed ? 2 : 1);
            if (!B.fixed) B.x -= sx * d * (A.fixed ? 2 : 1);
          } else {
            const d = oy / 2 + 0.5;
            if (!A.fixed) A.y += sy * d * (B.fixed ? 2 : 1);
            if (!B.fixed) B.y -= sy * d * (A.fixed ? 2 : 1);
          }
        }
      }
    for (const P of pts) {
      if (P.fixed) continue;
      P.x = Math.max(P.w / 2 + 2, Math.min(W - P.w / 2 - 2, P.x));
      P.y = Math.max(P.h / 2 + 3, Math.min(H - P.h / 2 - 2, P.y));
    }
    if (!moved) break;
  }
  let c = 0;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const A = pts[i], B = pts[j];
      if ((A.w + B.w) / 2 - Math.abs(A.x - B.x) > 0.5 && (A.h + B.h) / 2 - Math.abs(A.y - B.y) > 0.5) c++;
    }
  return { pts: pts.slice(1), c };
}

export function BubbleField({ bubbles, me, caption, legend, centre }: { bubbles: Bubble[]; me: string; caption: string; legend: { label: string; swatch: "ink" | "half" | "ring" | "quiet" | "check" }[]; centre?: Bubble & { badge?: string } }) {
  const { cycle, secondsLeft } = useRebuild();
  const list = bubbles.slice(0, 18);
  const max = Math.max(...list.map((b) => b.size), centre?.size ?? 1, 1);
  const min = Math.min(...list.map((b) => b.size), centre?.size ?? 0, 0);
  const span = max - min || 1;
  const radius = (size: number) => MIN_R + ((size - min) / span) * (MAX_R - MIN_R);
  const centreR = centre ? Math.max(radius(centre.size), 30) : 0;
  const placed = useMemo(() => {
    const rs = list.map((b) => radius(b.size));
    let best: Box[] = [];
    let bestC = Infinity;
    for (let at = 0; at < 25 && bestC > 0; at++) {
      const res = layout(rs, list.map((b) => b.label), cycle * 31 + at, centre ? { r: centreR, label: centre.label } : null);
      if (res.c < bestC) {
        best = res.pts;
        bestC = res.c;
      }
    }
    // Box centre → circle centre (the label sits under the circle).
    return list.map((b, i) => ({ ...b, r: rs[i], x: best[i].x, y: best[i].y - LABEL_H / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbles, cycle, centre?.key]);

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
        {centre ? (
          <a href={centre.href} aria-label={centre.hover}>
            <g transform={`translate(${CX}, ${CY - LABEL_H / 2})`}>
              <title>{centre.hover}</title>
              <circle r={centreR} fill={INK} />
              <circle r={centreR + 5} fill="none" stroke={MAG} strokeWidth={3} />
              {centre.badge && <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={1.2} fill="#fff">{centre.badge}</text>}
              <text y={centreR + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={INK}>{clip(centre.label, 24)}</text>
            </g>
          </a>
        ) : (
          <>
            <circle cx={CX} cy={CY} r={24} fill={INK} />
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} letterSpacing={1} fill="#fff">{me}</text>
          </>
        )}
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
