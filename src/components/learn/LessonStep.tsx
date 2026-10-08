"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ‹ Previous · Mark Complete & Next › (last lesson → Mark Complete & Take the Test).
const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-60";
const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover";

export function LessonStep({ lessonId, prevHref, nextHref, lastLabel }: { lessonId: string; prevHref: string | null; nextHref: string; lastLabel: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/learn/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, completed: true }) }).catch(() => null);
    if (!r?.ok) {
      setBusy(false);
      const b = (await r?.json().catch(() => null)) as { error?: string } | null;
      return setErr(b?.error ?? "Couldn't save that.");
    }
    router.push(nextHref);
    router.refresh();
  };
  return (
    <div data-lesson-step className="flex flex-wrap items-center gap-3">
      {prevHref ? <Link href={prevHref} className={BTN}>‹ Previous</Link> : <span className={BTN + " cursor-not-allowed opacity-40"}>‹ Previous</span>}
      <button type="button" disabled={busy} onClick={go} className={BTN_K}>{busy ? "Saving…" : lastLabel ?? "Mark Complete & Next ›"}</button>
      {err && <span className="text-[12.5px] text-red-600">{err}</span>}
    </div>
  );
}
