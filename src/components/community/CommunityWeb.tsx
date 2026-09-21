"use client";

import { useEffect, useRef, useState } from "react";
import type { CommunityWeb as WebData } from "@/lib/community-web";
import { layoutWeb, VIEW, NODE_R, type PlacedNode } from "@/lib/community-web-layout";

/**
 * ── ⚠⚠ THE LIVING WEB (`P2-J3-E591` WS-B) ─────────────────────────────────
 *
 * The viewer at the centre, their community around them. Three node states, and
 * ⚠⚠ THEY ARE DATA, NOT DECORATION — each is a different row in a different
 * table:
 *
 *   joined     photo inside a magenta halo   — they have a profile
 *   invited    hollow dashed ring, NO photo  — ⚠ an invite holds name + email
 *   reachable  faint dashed ghost, no fill   — a colleague's colleague
 *
 * ── ⚠⚠⚠ IT REBUILDS ON A DATA REFRESH, NOT ON A TIMER ─────────────────────
 *
 * ⚠ Scott asked for *"a flush and rebuild every minute"*, and the ruling that
 * shapes it is the next sentence: *"movement that means nothing is worse than
 * no movement — people stop looking at a page that fidgets."*
 *
 * ⚠⚠ SO THE INTERVAL DOES NOT REBUILD ANYTHING. It starts a FETCH. `cycle` —
 * the only input the layout takes besides the counts — is advanced in exactly
 * ONE place: after a response came back `ok` and parsed. ⚠⚠⚠ IF THE ENDPOINT
 * FAILS, NOTHING MOVES: no cycle, no re-layout, no animation, and the last good
 * picture stays on screen. ⚠ A web that kept drifting while the server was down
 * would be asserting a network it could no longer see.
 *
 * ⚠ `check:community-web` §8 holds this structurally — it fails if the cycle is
 * ever advanced straight from an interval callback.
 *
 * ── ⚠ REDUCED MOTION: THE REBUILD STILL HAPPENS ───────────────────────────
 *
 * ⚠⚠ IT SUPPRESSES THE TWEEN, NOT THE UPDATE. Somebody who asked for less
 * motion still wants current data — they just get it without the 2.6s glide.
 */
export function CommunityWeb({ initial }: { initial: WebData }) {
  const [data, setData] = useState<WebData>(initial);
  const [cycle, setCycle] = useState(0);
  const [animate, setAnimate] = useState(false);
  const calm = useRef(false);

  /* ⚠ Read once, and kept live — somebody can change the OS setting with the
     page open, and a preference that only applies at mount is not honoured. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    calm.current = mq.matches;
    const onChange = () => {
      calm.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /*
    ── ⚠⚠⚠ ACCEPTING A REQUEST MOVES THE WEB (`P2-A3-E596` WS-C item 2) ─────

    ⚠ SCOTT: *"the moment a dotted ghost becomes a lit node is the most
    satisfying thing this feature does, and right now nobody sees it."*

    ⚠⚠ THE MECHANISM, MEASURED: `ConnectControls` ALREADY CALLS
    `router.refresh()` after an accept (`ConnectControls.tsx:115`), so the
    SERVER re-renders and hands this component a NEW `initial`. ⚠⚠⚠ AND
    `useState(initial)` IGNORED IT — a `useState` initialiser runs once, so the
    fresh prop was dropped on the floor and the picture waited up to 60 seconds
    for the interval. That is why two counts on one screen disagreed: the card
    list came from the refreshed server render and the web from a minute ago.

    ⚠ SO THE FIX IS TO STOP IGNORING THE PROP, not to add a second fetch. A
    bespoke event between the two components would be a second channel carrying
    what React already delivers.
    ⚠⚠ IT ADVANCES `cycle` AND ANIMATES, exactly as a successful poll does — the
    ghost-to-node transition is the same transition, so there is one animation
    path and not two.
    ⚠ GUARDED BY IDENTITY: `initial` is a fresh object on every server render,
    so this compares the DATA, not the reference. Without that guard an
    unrelated re-render would re-animate the web for no reason.
  */
  const lastInitial = useRef<string>("");
  useEffect(() => {
    const sig = JSON.stringify(initial);
    /* ⚠ The first run records the server's own picture and moves nothing — it
       is already on screen. */
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

    /*
      ⚠⚠ THE ONLY PLACE `cycle` ADVANCES, AND IT IS BEHIND `res.ok` AND A PARSE.
      ⚠ Read the guard order: a non-ok response returns BEFORE anything moves,
      and a throw is caught and dropped on the floor deliberately — the next
      tick will try again, and a console error every minute during an outage is
      noise, not information.
    */
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
        /* ⚠ Offline, aborted, or a 500. Hold the last good picture. */
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
    cycle,
  });

  const nJ = data.joined.length;
  const nI = data.invited.length;
  const nR = data.reachable.length;

  /*
    ⚠⚠ A PICTURE OF A NETWORK IS NOT A NETWORK TO A SCREEN READER (WS-B item 5).
    ⚠ The counts go in the accessible name IN WORDS, so the same fact the eye
    gets from the drawing is available without it.
  */
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
          {/* ⚠⚠ THE HALO IS A RING BEHIND THE PHOTO, NOT A FILTER OVER IT
              (WS-B item 2). A filtered `<image>` blurs the face — so the blur
              is applied to a plain circle UNDER the portrait, and the portrait
              itself is clipped, never filtered. */}
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

          {/* ⚠ The viewer, last, so nothing paints over them. */}
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

      {/* ⚠ The legend states what each shape MEANS. Three shapes with no key is
          a puzzle, and the states are facts about people, not styling. */}
      <ul className="pm-web-key" aria-hidden>
        <li>
          <i className="pm-web-key-joined" />
          {nJ} joined
        </li>
        <li>
          <i className="pm-web-key-invited" />
          {nI} invited
        </li>
        <li>
          <i className="pm-web-key-reachable" />
          {nR} reachable
        </li>
      </ul>

      {/* ⚠⚠ THE OVERFLOW IS TOLD, NOT SWALLOWED. A ring has a circumference; a
          capped web that said nothing would be under-reporting somebody's
          network, which is worse than a smaller picture. */}
      {overflowText(data) && <p className="pm-web-more">{overflowText(data)}</p>}

      {nJ + nI + nR === 0 && (
        /* ⚠ THE EMPTY STATE STATES THE MECHANISM. "No colleagues" on its own
           reads as a broken feature rather than a new account. */
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

/**
 * ── ⚠⚠⚠ THE WEB SAYS IT IS A SAMPLE (`P2-A3-E596` WS-C item 3) ────────────
 *
 * ⚠ SCOTT: *"Scott will have 25,000+ colleagues; the web must never try to draw
 * them. It already caps — what is missing is saying so."*
 * ⚠⚠ THE WEB IS AN EMOTIONAL DEVICE, NOT A DIRECTORY. Its job is to make the
 * network feel alive and show unexplored territory; the colleague list is the
 * directory. A label that says *"12 of 25,431 shown"* keeps it honest without
 * asking it to be something else.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   const n = o.joined + o.invited + o.reachable;
 * //   return n > 0 ? `+${n} more not shown` : null;
 * ⚠⚠ `+N more not shown` NAMED THE REMAINDER AND NEVER THE WHOLE, so a reader
 * could not tell whether they were looking at most of their network or a
 * fraction of it. **Shown-of-total answers the question that was actually being
 * asked.**
 *
 * ⚠ SELECTION IS **MOST RECENT**, and `community-web.ts` WAS CHANGED TO MAKE
 * THAT TRUE rather than having the label assert it. ⚠⚠ MEASURED FIRST: neither
 * the connection query nor the person query carried an `orderBy`, so the cap
 * took an ARBITRARY sixteen that could differ between two renders. **A label
 * naming a selection the code does not make is worse than no label.**
 */
function overflowText(d: WebData): string | null {
  const o = d.overflow;
  const hidden = o.joined + o.invited + o.reachable;
  if (hidden <= 0) return null;
  const shown = d.joined.length + d.invited.length + d.reachable.length;
  /* ⚠ `toLocaleString` with NO locale argument would format differently on the
     server and in the browser and hydrate mismatched. `en-US` is pinned for the
     same reason `date-range-label.ts` refuses `toLocaleDateString`. */
  const total = (shown + hidden).toLocaleString("en-US");
  return `${shown} of ${total} shown · most recent`;
}

/** ⚠ `invited` has no person and therefore never a face. That is the model. */
function faceFor(n: PlacedNode, d: WebData): string | null {
  if (n.kind === "joined") return d.joined.find((j) => j.id === n.key)?.photoUrl ?? null;
  if (n.kind === "reachable") return d.reachable.find((r) => r.id === n.key)?.photoUrl ?? null;
  return null;
}

function Node({ n, face }: { n: PlacedNode; face: string | null }) {
  if (n.kind === "invited") {
    /* ⚠⚠ HOLLOW, DASHED, NO FACE — because an invite holds NAME AND EMAIL ONLY.
       ⚠ Anything face-shaped here would imply a profile that does not exist. */
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

/**
 * ⚠⚠ THE SAME SILHOUETTE EVERYWHERE A FACE IS MISSING, AND NEVER INITIALS.
 * Scott, 2026-09-20: *"makes sure to use the icons you used on the mock up if
 * there are no pictures."*
 * ⚠ DRAWN INLINE, NOT FETCHED — *"a placeholder that 404s is worse than the gap
 * it fills."* ⚠ Deliberately grey and colourless, so it reads as *"no photo
 * yet"* rather than as a photo.
 */
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
