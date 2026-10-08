"use client";

import { useRouter } from "next/navigation";

/** "‹ Back" to wherever the visitor came from; `fallback` when there is no history (opened in a new tab). */
export function BackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex items-center gap-1 text-[14px] font-semibold text-magenta-ink transition-colors hover:text-magenta-ink-hover hover:underline"
    >
      <span aria-hidden>‹</span>
      {label}
    </button>
  );
}
