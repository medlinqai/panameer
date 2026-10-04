"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { streakFrom } from "@/lib/learn-progress";
import { StatTile } from "@/components/learn/app/StatTile";

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
      label="Current Streak"
      /* "best yet" only when it is genuinely their best AND there is one. */
      note={streak.current > 0 && streak.current >= streak.best ? "best yet" : undefined}
    />
  );
}
