"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmAnswerButton({
  postId,
  confirmed,
}: {
  postId: string;
  confirmed: boolean;
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
        body: JSON.stringify({ action: confirmed ? "unconfirm" : "confirm", postId }),
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
        aria-pressed={confirmed}
        className={
          "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 " +
          (confirmed
            ? "border-line bg-bg-soft text-ink-2 hover:border-magenta hover:text-magenta"
            : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
        }
      >
        {busy ? "…" : confirmed ? "✓ Confirmed — undo" : "Confirm This Answer"}
      </button>
      {error && <span className="mt-1 text-[12px] text-red-700">{error}</span>}
    </span>
  );
}
