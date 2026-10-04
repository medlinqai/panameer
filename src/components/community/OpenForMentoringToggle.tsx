"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpenForMentoringToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/provider/mentoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: next }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setOpen(!next); 
        setError(body.error ?? "That didn't save.");
        return;
      }
      router.refresh();
    } catch {
      setOpen(!next);
      setError("That didn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          <p className="text-[15px] font-bold">Open for mentoring</p>
          {}
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            Let people looking for a mentor find you. Nothing is scheduled and
            nothing is charged — people who are interested follow you, and you
            see who they are.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={open}
          className={
            "shrink-0 border px-5 py-2 text-[13.5px] font-semibold transition-colors disabled:opacity-50 " +
            (open
              ? "border-ink bg-ink text-surface hover:bg-ink-hover"
              : "border-ink bg-surface text-ink hover:bg-surface-hover")
          }
        >
          {busy ? "…" : open ? "You're open" : "Turn On"}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
