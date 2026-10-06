"use client";

import { useEffect, useRef, useState } from "react";
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import type { CommunityWeb as WebData } from "@/lib/community-web";
import { layoutWeb, VIEW, NODE_R, type PlacedNode } from "@/lib/community-web-layout";

export function CommunityWeb({ initial }: { initial: WebData }) {
  const [data, setData] = useState<WebData>(initial);
  const { cycle: drawCycle, secondsLeft } = useRebuild();
  const [cycle, setCycle] = useState(0);
  const [animate, setAnimate] = useState(false);
  const calm = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    calm.current = mq.matches;
    const onChange = () => {
      calm.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const lastInitial = useRef<string>("");
  useEffect(() => {
    const sig = JSON.stringify(initial);
    if (lastInitial.current === "") {
      lastInitial.current = sig;
      return;
    }
    if (lastInitial.current === sig) return;
    lastInitial.current = sig;
    setData(initial);
    setAnimate(!calm.current);
    setCycle((c) => c + 1);
  }, [initial]);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const res = await fetch("/api/community/web", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as WebData;
        if (!alive || !next || !Array.isArray(next.joined)) return;
        setData(next);
        setAnimate(!calm.current);
        setCycle((c) => c + 1);
      } catch {
      }
    }

    const id = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const nodes = layoutWeb({
    joined: data.joined,
    invited: data.invited,
    reachable: data.reachable,
    cycle: cycle + drawCycle,
  });

  const drawnJ = data.joined.length;
  const drawnI = data.invited.length;
  const drawnR = data.reachable.length;
  const nJ = drawnJ + data.overflow.joined;
  const nI = drawnI + data.overflow.invited;
  const nR = drawnR + data.overflow.reachable;

  const label =
    nJ + nI + nR === 0
      ? "Your community: no colleagues yet."
      : `Your community: ${plural(nJ, "colleague")} joined, ` +
        `${nI} invited, ${plural(nR, "person", "people")} reachable ` +
        `through them.`;

  return (
    <div className="pm-web">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        role="img"
        aria-label={label}
        className="pm-web-svg"
      >
        <defs>
          {/* THE HALO IS A RING BEHIND THE PHOTO, NOT A FILTER OVER IT */}
          <filter id="pm-web-halo" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className={animate ? "pm-web-move" : undefined}>
          {nodes.map((n) => (
            <line
              key={`l-${n.key}`}
              x1={n.fromX}
              y1={n.fromY}
              x2={n.x}
              y2={n.y}
              className={`pm-web-link pm-web-link-${n.kind}`}
            />
          ))}
          {nodes.map((n) => (
            <Node key={n.key} n={n} face={faceFor(n, data)} />
          ))}

          {/* The viewer, last, so nothing paints over them. */}
          <circle cx={VIEW.cx} cy={VIEW.cy} r={NODE_R.me} className="pm-web-me-bg" />
          {data.me?.photoUrl && (
            <>
              <clipPath id="pm-web-me">
                <circle cx={VIEW.cx} cy={VIEW.cy} r={NODE_R.me - 2} />
              </clipPath>
              <image
                href={data.me.photoUrl}
                x={VIEW.cx - NODE_R.me + 2}
                y={VIEW.cy - NODE_R.me + 2}
                width={(NODE_R.me - 2) * 2}
                height={(NODE_R.me - 2) * 2}
                clipPath="url(#pm-web-me)"
                preserveAspectRatio="xMidYMid slice"
              />
            </>
          )}
          {!data.me?.photoUrl && (
            <Silhouette cx={VIEW.cx} cy={VIEW.cy} r={NODE_R.me} onDark />
          )}
          <circle cx={VIEW.cx} cy={VIEW.cy} r={NODE_R.me + 2} className="pm-web-me-ring" />
        </g>
      </svg>

      {/* The legend states what each shape MEANS. Three shapes with no key is a */}
      <ul className="pm-web-key" aria-hidden>
        <li>
          <i className="pm-web-key-joined" />
          joined
        </li>
        <li>
          <i className="pm-web-key-invited" />
          invited
        </li>
        <li>
          <i className="pm-web-key-reachable" />
          reachable
        </li>
      </ul>

      {/* THE OVERFLOW IS TOLD, NOT SWALLOWED. A ring has a circumference; a */}
      {/* THE PICTURE STATES WHAT IT DREW, ALWAYS — not only when it ran out */}
      {drawnText(data) && <p className="pm-web-more">{drawnText(data)}</p>}

      {/* The same caption as both rings, from the same component — one */}
      <RebuildBadge secondsLeft={secondsLeft} />

      {nJ + nI + nR === 0 && (
        // THE EMPTY STATE STATES THE MECHANISM. "No colleagues" on its own
        <p className="pm-web-empty">
          Your community starts with one person. Invite a colleague and they
          appear here.
        </p>
      )}
    </div>
  );
}

function plural(n: number, one: string, many = ""): string {
  return `${n} ${n === 1 ? one : many || one + "s"}`;
}

/** THE WEB SAYS IT IS A SAMPLE WS-C item 3) */
function drawnText(d: WebData): string | null {
  const o = d.overflow;
  const hidden = o.joined + o.invited + o.reachable;
  const shown = d.joined.length + d.invited.length + d.reachable.length;
  // NOTHING TO SAY ABOUT AN EMPTY PICTURE — the empty state below says it
  if (shown === 0) return null;
  // RENAMED FROM `overflowText` AND NO LONGER RETURNS null WHEN NOTHING IS
  if (hidden <= 0) return `All ${shown} drawn`;
  // server and in the browser and hydrate mismatched. `en-US` is pinned for the
  const total = (shown + hidden).toLocaleString("en-US");
  // the two states read as the same sentence answering the same question.
  return `${shown} of ${total} drawn · most recent`;
}

/** `invited` has no person and therefore never a face. That is the model. */
function faceFor(n: PlacedNode, d: WebData): string | null {
  if (n.kind === "joined") return d.joined.find((j) => j.id === n.key)?.photoUrl ?? null;
  if (n.kind === "reachable") return d.reachable.find((r) => r.id === n.key)?.photoUrl ?? null;
  return null;
}

function Node({ n, face }: { n: PlacedNode; face: string | null }) {
  if (n.kind === "invited") {
    // HOLLOW, DASHED, NO FACE — because an invite holds NAME AND EMAIL ONLY.
    return <circle cx={n.x} cy={n.y} r={n.r} className="pm-web-invited" />;
  }
  if (n.kind === "reachable") {
    return <circle cx={n.x} cy={n.y} r={n.r} className="pm-web-reachable" />;
  }
  return (
    <>
      <circle cx={n.x} cy={n.y} r={n.r} className="pm-web-halo" filter="url(#pm-web-halo)" />
      {face ? (
        <>
          <clipPath id={`pm-web-c-${n.key}`}>
            <circle cx={n.x} cy={n.y} r={n.r - 1} />
          </clipPath>
          <image
            href={face}
            x={n.x - n.r + 1}
            y={n.y - n.r + 1}
            width={(n.r - 1) * 2}
            height={(n.r - 1) * 2}
            clipPath={`url(#pm-web-c-${n.key})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <Silhouette cx={n.x} cy={n.y} r={n.r} />
      )}
      <circle cx={n.x} cy={n.y} r={n.r - 1} className="pm-web-joined-ring" />
    </>
  );
}

/** THE SAME SILHOUETTE EVERYWHERE A FACE IS MISSING, AND NEVER INITIALS. */
function Silhouette({
  cx,
  cy,
  r,
  onDark = false,
}: {
  cx: number;
  cy: number;
  r: number;
  onDark?: boolean;
}) {
  const cls = onDark ? "pm-web-sil-on-dark" : "pm-web-sil";
  return (
    <g className={cls}>
      <circle cx={cx} cy={cy} r={r - 1} className="pm-web-sil-bg" />
      <circle cx={cx} cy={cy - r * 0.2} r={r * 0.28} />
      <path
        d={`M ${cx - r * 0.46} ${cy + r * 0.62}
            a ${r * 0.46} ${r * 0.44} 0 0 1 ${r * 0.92} 0 Z`}
      />
    </g>
  );
}
