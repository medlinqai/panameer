"use client";

import { useState } from "react";
import { AskForRecommendation } from "@/components/community/ColleagueRoster";

// Recommend Me (2026-10-08): only for a connected colleague; opens the ask dialog with its starter formats.
export function RecommendMe({ toUserId, name, block = false, requested = false, fixed = false }: { toUserId: string; name: string; block?: boolean; requested?: boolean; fixed?: boolean }) {
  const [open, setOpen] = useState(false);
  const cls = block
    ? "flex min-h-[44px] w-full items-center justify-center border border-ink bg-surface text-[14px] font-semibold text-ink hover:bg-black/[0.04] disabled:border-line disabled:text-ink-3"
    : fixed
      ? "w-full whitespace-nowrap border border-ink py-1.5 text-center text-[13px] font-semibold hover:bg-black/[0.04] disabled:border-line disabled:text-ink-3"
      : "border border-ink px-3.5 py-1.5 text-[13px] font-semibold hover:bg-black/[0.04] disabled:border-line disabled:text-ink-3";
  return (
    <>
      <button type="button" data-recommend-me disabled={requested} onClick={() => setOpen(true)} className={cls}>
        {requested ? "Requested" : "Recommend Me"}
      </button>
      {open && <AskForRecommendation row={{ userId: toUserId, name }} onClose={() => setOpen(false)} />}
    </>
  );
}
