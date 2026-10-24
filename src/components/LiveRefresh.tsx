"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Scott 10-22 / 10-24: buyer pages pick up new responses without a manual refresh — but gently (Vercel CPU):
 *  once a minute while the tab is visible, on coming back to the tab, and never after 20 minutes without
 *  any mouse/keyboard activity (a forgotten tab stops costing anything). */
const IDLE_MS = 20 * 60_000;
export function LiveRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const seen = () => { last = Date.now(); };
    const tick = () => { if (document.visibilityState === "visible" && Date.now() - last < IDLE_MS) router.refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") { seen(); router.refresh(); } };
    const id = window.setInterval(tick, Math.max(60, seconds) * 1000);
    for (const e of ["pointerdown", "keydown", "scroll"]) window.addEventListener(e, seen, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      for (const e of ["pointerdown", "keydown", "scroll"]) window.removeEventListener(e, seen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);
  return null;
}
