"use client";

import dynamic from "next/dynamic";

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
