"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * RE-READ THE BOARD WITHOUT A FULL PAGE LOAD (`P1-J1.1-E254`, 2026-08-30).
 *
 * ⚠⚠ WHAT WAS ACTUALLY STALE, because it is NOT what it looks like.
 * `admin/buyers-sellers/page.tsx` has carried `export const dynamic =
 * "force-dynamic"` all along, so the SERVER has never cached this page — every
 * request re-queries. The staleness is on the CLIENT and it has two causes:
 *
 *   1. NOTHING RE-FETCHED WHILE YOU SAT THERE. This is a live operational board
 *      — someone finishes onboarding, a lock trips — and the only way to see any
 *      of it was to reload the browser. A page that is correct at render and
 *      never again is stale in the only sense that matters to the person using it.
 *   2. `<Link>` NAVIGATIONS SERVE THE ROUTER CACHE. Arriving from the admin rail
 *      can replay a cached RSC payload rather than re-rendering, so "go away and
 *      come back" was not a reliable refresh either.
 *
 * `router.refresh()` fixes both: it re-runs the server component and discards
 * the client cache for this route, keeping React state and scroll position.
 *
 * ⚠ THE TIMESTAMP IS RENDERED BY THE SERVER AND PASSED IN, never computed here.
 * A `new Date()` in a client component hydrates to a different value than the
 * server printed and React logs a mismatch — and the number that matters is when
 * the DATA was read, not when the browser drew it.
 */
export function BoardRefresh({ readAt }: { readAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    /* 30s: fast enough to watch a walk happen, slow enough not to hammer
       Supabase from an idle open tab. Opt-in, and off by default. */
    const t = setInterval(() => startTransition(() => router.refresh()), 30_000);
    return () => clearInterval(t);
  }, [auto, router]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "Refresh"}
      </button>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#d72cd6]"
        />
        Auto-refresh every 30s
      </label>
      <span className="text-[12.5px] text-ink-2">Data read at {readAt}</span>
    </div>
  );
}
