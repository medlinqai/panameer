"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Scott 10-22: buyer pages pick up provider responses without a manual refresh —
 *  re-reads the page every `seconds` while the tab is visible, and as soon as the tab comes back into view. */
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, seconds]);
  return null;
}
