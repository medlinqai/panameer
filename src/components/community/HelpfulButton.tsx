"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HelpfulButton({
  postId,
  marked,
}: {
  postId: string;
  marked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/community/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: marked ? "unhelpful" : "helpful", postId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't work.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={marked}
        className={
          "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 " +
          (marked
            ? "border-emerald-600/40 bg-emerald-50 text-emerald-700 hover:border-emerald-600"
            : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
        }
      >
        {busy ? "…" : marked ? "✓ Marked helpful — undo" : "This Answered My Question"}
      </button>
      {error && <span className="mt-1 text-[12px] text-red-700">{error}</span>}
    </span>
  );
}
