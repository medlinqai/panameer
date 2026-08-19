"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { streakFrom } from "@/lib/learn-progress";
import { StatTile } from "@/components/learn/app/StatTile";

/**
 * ⚠ CLIENT-ONLY FOR ONE REASON: THE TIMEZONE.
 *
 * The brief: *"use the learner's own timezone, not UTC — an evening lesson must
 * not land on tomorrow."* The server has the timestamps and no way to know the
 * zone; the browser has both. So the raw ISO strings come down and the streak is
 * computed here, with `streakFrom` — the same pure function the 10-Day badge
 * uses, so the tile and the badge can never disagree.
 *
 * ⚠ IT IS NOT SERVER-RENDERED AT ALL — see `ClientOnly.tsx`, which loads it
 * through `next/dynamic` with `ssr: false`.
 *
 * The first attempt server-rendered a "—" placeholder and swapped it on
 * hydration with `suppressHydrationWarning` on the value. That threw a REAL
 * hydration error, caught in the browser and not in any Node harness: the tile
 * also grows a `· best yet` clause on the client, and `suppressHydrationWarning`
 * covers a changed text node, NOT an added child. Rendering nothing on the
 * server is the honest version of "the server cannot know this".
 */
export default function StreakTile({ completedAt }: { completedAt: string[] }) {
  const streak = useMemo(
    () => streakFrom(completedAt, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
    [completedAt]
  );

  return (
    <StatTile
      icon={<Flame className="h-[19px] w-[19px]" aria-hidden />}
      tone="flame"
      value={`${streak.current} day${streak.current === 1 ? "" : "s"}`}
      label="Current streak"
      /* "best yet" only when it is genuinely their best AND there is one. */
      note={streak.current > 0 && streak.current >= streak.best ? "best yet" : undefined}
    />
  );
}
