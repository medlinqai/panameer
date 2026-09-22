"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * ── ⚠⚠⚠ ONE REBUILD BEHAVIOUR, THREE PICTURES (`P2-A2-E600` WS-D) ─────────
 *
 * ⚠ SCOTT, 2026-09-22: *"One shared 'rebuild' behaviour: every 15 seconds the
 * picture redraws (the ring's segments fill in turn; the network re-shuffles),
 * with a visible 'LIVE · rebuilds in Ns' countdown."*
 *
 * ⚠⚠ IT IS A HOOK PLUS A BADGE, NOT A WRAPPER COMPONENT, AND THAT IS
 * DELIBERATE. The three pictures draw NOTHING alike — a segmented score ring, a
 * smaller completion ring, and a force-laid network of nodes and dashes. ⚠⚠⚠
 * THE ONLY THINGS THEY GENUINELY SHARE ARE THE CLOCK AND THE CAPTION, so those
 * are what is shared. A wrapper that owned the drawing would have had to know
 * about all three, which is how one component becomes three components wearing
 * one name.
 *
 * ── ⚠⚠⚠ ONLY THE DRAWING MOVES. THE NUMBERS NEVER CHANGE. ────────────────
 *
 * ⚠ Scott's rule 3, and it is the one that constrains the design: `useRebuild`
 * returns a `cycle` COUNTER and nothing else. It fetches nothing, and it cannot
 * — there is no data in here to change.
 * ⚠⚠ THAT MATTERS MOST FOR THE COMMUNITY WEB, whose existing 60-second timer
 * **re-fetched `/api/community/web` and replaced the counts**. ⚠⚠⚠ TURNING THAT
 * INTO A 15-SECOND TIMER WOULD HAVE QUADRUPLED A REAL QUERY *AND* BROKEN RULE 3
 * — numbers changing under the reader four times a minute. The redraw and the
 * refresh are now two different clocks, which is what the rule requires.
 */

/** ⚠ The one interval. Scott: *"every 15 seconds"*. */
export const REBUILD_SECONDS = 15;

export type Rebuild = {
  /** Increments once per completed countdown. Use it as a `key` to replay a CSS animation. */
  cycle: number;
  /** ⚠ `null` when the picture is still — there is no countdown to show. */
  secondsLeft: number | null;
  /** True when the reader asked for reduced motion. */
  still: boolean;
};

/**
 * ⚠⚠ REDUCED MOTION GETS A STILL PICTURE AND NO COUNTDOWN (Scott's rule 4).
 * ⚠ READ LIVE, NOT ONCE AT MOUNT: somebody can change the OS setting with the
 * page open, and a preference honoured only at mount is not honoured. That is
 * `CommunityWeb`'s own existing discipline, kept.
 * ⚠⚠⚠ AND IT STOPS THE CLOCK, NOT JUST THE ANIMATION. A countdown ticking
 * beside a picture that never redraws is a promise the page does not keep.
 *
 * ⚠⚠ IT PAUSES WHILE THE TAB IS HIDDEN (rule 5), so an open background tab
 * costs nothing. ⚠ `visibilitychange` rather than `blur`: a window behind
 * another window is still visible and should still tick.
 */
/*
  ⚠⚠⚠ THE PREFERENCE IS READ WITH `useSyncExternalStore`, NOT AN EFFECT ──────

  ⚠ The first version called `setStill` inside a `useEffect` and lint refused
  it: *"Calling setState synchronously within an effect can trigger cascading
  renders."* ⚠⚠ THIS REPO CARRIES 11 PRE-EXISTING INSTANCES OF THAT ERROR AND
  THE RULE IS 0 NEW, so it is a hard stop rather than a style note.
  ⚠⚠⚠ `useSyncExternalStore` IS THE PATTERN `AccountMenu` ALREADY USES for the
  theme, for the same reason: the browser owns the value, React subscribes, and
  the server snapshot is what the markup was built against — so there is no
  hydration mismatch and no `ready` flag to carry.
*/
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/* ⚠ Read live — somebody can change the OS setting with the page open, and a
   preference honoured only at mount is not honoured. */
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ⚠⚠ THE SERVER ASSUMES MOTION IS OFF. A countdown rendered on the server and
   then removed on hydration is a flash of a promise we may not keep; the badge
   appearing a frame late is the quieter failure. */
const motionServerSnapshot = () => true;

export function useRebuild(seconds = REBUILD_SECONDS): Rebuild {
  const [cycle, setCycle] = useState(0);
  const [left, setLeft] = useState(seconds);
  const still = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    motionServerSnapshot
  );

  useEffect(() => {
    if (still) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () =>
      setLeft((n) => {
        if (n > 1) return n - 1;
        /* ⚠⚠ THE CYCLE ADVANCES HERE AND NOWHERE ELSE. One writer, so the
           countdown and the redraw cannot drift apart. */
        setCycle((c) => c + 1);
        return seconds;
      });
    const start = () => {
      if (id === null) id = setInterval(tick, 1000);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [seconds, still]);

  return { cycle, secondsLeft: still ? null : left, still };
}

/**
 * ⚠⚠ THE CAPTION — *"LIVE · rebuilds in Ns"*, the same words under all three
 * pictures. ⚠ It renders NOTHING when the picture is still: no countdown for a
 * reader who asked for no motion, and none before hydration settles the
 * preference.
 */
export function RebuildBadge({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft === null) return null;
  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
      <span
        aria-hidden
        className="inline-block h-[6px] w-[6px] rounded-full bg-emerald-500"
      />
      {/* ⚠ `E433` — the seconds are a FIGURE, so ink. Nothing here is a link. */}
      <span>Live</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums font-semibold normal-case tracking-normal">
        rebuilds in {secondsLeft}s
      </span>
    </p>
  );
}
