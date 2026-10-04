"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export const REBUILD_SECONDS = 15;

export type Rebuild = {
  /** Increments once per completed countdown. Use it as a `key` to replay a CSS animation. */
  cycle: number;
  secondsLeft: number | null;
  /** True when the reader asked for reduced motion. */
  still: boolean;
};

function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

export function RebuildBadge({ secondsLeft }: { secondsLeft: number | null }) {
  if (secondsLeft === null) return null;
  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
      <span
        aria-hidden
        className="inline-block h-[6px] w-[6px] rounded-full bg-emerald-500"
      />
      {}
      <span>Live</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums font-semibold normal-case tracking-normal">
        rebuilds in {secondsLeft}s
      </span>
    </p>
  );
}
