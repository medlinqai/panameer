"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ask a question on this lesson: a thread in the path's group, tagged to the lesson.
export function LessonAsk({ boardSlug, lessonId }: { boardSlug: string; lessonId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/community/forums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "thread", boardSlug, title, body, lessonId }) }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return setErr(b?.error ?? "That didn't post.");
    setOpen(false);
    setTitle("");
    setBody("");
    router.refresh();
  };
  if (!open) return <button type="button" data-lesson-ask onClick={() => setOpen(true)} className="mt-3 inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-semibold hover:bg-black/[0.04]">Ask a Question</button>;
  return (
    <div className="mt-3 space-y-2 border border-ink p-3">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your question, in one line" aria-label="Question" className="h-10 w-full border border-line px-2 text-[14px]" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="A bit more detail so someone can answer" aria-label="Details" className="w-full border border-line p-2 text-[14px]" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || title.trim().length < 5 || body.trim().length < 15} onClick={send} className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface disabled:opacity-50">{busy ? "Posting…" : "Post Question"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-ink-2">Cancel</button>
        {err && <span className="text-[12.5px] text-red-600">{err}</span>}
      </div>
    </div>
  );
}
