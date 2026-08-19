"use client";

import dynamic from "next/dynamic";

/**
 * THE TWO PIECES OF `/learn` THAT CANNOT BE SERVER-RENDERED.
 *
 * Both depend on `Intl.DateTimeFormat().resolvedOptions().timeZone`, which only
 * exists in the browser, and the brief is explicit about WHY that matters: *"use
 * the learner's own timezone, not UTC — an evening lesson must not land on
 * tomorrow."* For a learner in Eastern Time an 8pm completion is stored as 00:00
 * the next day in UTC, so a server-side streak is not merely approximate, it can
 * report two days for one evening.
 *
 * ── ⚠ WHY `ssr: false` AND NOT `suppressHydrationWarning` ────────────────────
 *
 * The first attempt did the obvious thing: server-render a placeholder, compute
 * on mount, and suppress the warning on the value. It threw a real hydration
 * error, and it was caught in a BROWSER — no Node harness in this repo can see
 * it. `suppressHydrationWarning` forgives a changed TEXT NODE; it does not
 * forgive an ADDED CHILD, and the client render grows a `· best yet` clause on
 * the tile, flips a medal's gradient, and changes the "N of 6 unlocked" count.
 *
 * So these two render nothing on the server and a shaped skeleton until mount.
 * That is the honest encoding of "the server does not know this yet", and it
 * costs SSR on exactly two elements rather than papering over a mismatch.
 */

const TILE_SKELETON = (
  <div className="flex items-center gap-3 rounded-brand border border-line bg-white p-4 shadow-[0_18px_40px_-22px_rgba(23,30,62,0.4)]">
    <span className="h-[38px] w-[38px] shrink-0 animate-pulse rounded-[11px] bg-bg-soft" />
    <div className="min-w-0 flex-1">
      <span className="block h-[21px] w-20 animate-pulse rounded bg-bg-soft" />
      <span className="mt-1 block h-[11px] w-24 animate-pulse rounded bg-bg-soft" />
    </div>
  </div>
);

export const StreakTile = dynamic(() => import("@/components/learn/app/StreakTile"), {
  ssr: false,
  loading: () => TILE_SKELETON,
});

export const AchievementGrid = dynamic(
  () => import("@/components/learn/app/AchievementGrid"),
  {
    ssr: false,
    loading: () => (
      <>
        <div className="mt-8 mb-3.5 flex items-baseline gap-3">
          <h3 className="font-display text-[17px] font-bold">Achievements</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-brand border border-line bg-white px-3 py-4 text-center">
              <span className="mx-auto mb-2.5 block h-[46px] w-[46px] animate-pulse rounded-[14px] bg-bg-soft" />
              <span className="mx-auto block h-[11.5px] w-16 animate-pulse rounded bg-bg-soft" />
            </div>
          ))}
        </div>
      </>
    ),
  }
);
