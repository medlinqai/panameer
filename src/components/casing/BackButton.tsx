"use client";

import { useRouter } from "next/navigation";

/** NA-E003: an outlined "← Back" (with the destination when known) to wherever the visitor came from; `fallback` with no history. */
export function BackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      data-back-button
      className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-ink bg-white px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-bg-soft"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
