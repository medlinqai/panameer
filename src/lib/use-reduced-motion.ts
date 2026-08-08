"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Has this visitor asked for less motion?
 *
 * Written for the hero's background video and now shared with the how-it-works
 * tiles, which is the whole reason it left Hero.tsx: the home page autoplays
 * five clips, and two components deciding independently whether to honour
 * prefers-reduced-motion is two chances to get it wrong.
 *
 * `useSyncExternalStore` rather than an effect. Partly because
 * setState-in-effect is an error in this repo, but mostly because subscribing
 * is the honest shape — the setting can change while the page is open, and an
 * effect that reads it once cannot notice. The server snapshot is `false` so
 * the markup matches on both sides; a reduced-motion visitor drops the video on
 * the first client render rather than after watching a loop they did not ask
 * for.
 */
export function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}
