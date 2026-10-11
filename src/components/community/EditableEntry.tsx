"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// L-E061: the author edits their own question (title + body) or reply, inline; saved with an "edited" time.
export function EditableEntry({ kind, id, title, body, canEdit, editedLabel }: { kind: "thread" | "post"; id: string; title?: string; body: string; canEdit: boolean; editedLabel: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title ?? "");
  const [b, setB] = useState(body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setErr(null);
    const payload = kind === "thread" ? { action: "editThread", threadId: id, title: t, body: b } : { action: "editPost", postId: id, body: b };
    const r = await fetch("/api/community/forums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return setErr(j?.error ?? "That didn't save.");
    setEditing(false);
    router.refresh();
  };
  if (editing)
    return (
      <div data-editing className="mt-3 space-y-2">
        {kind === "thread" && <input value={t} onChange={(e) => setT(e.target.value)} aria-label="Question title" className="h-10 w-full border border-line px-2 text-[14px]" />}
        <textarea value={b} onChange={(e) => setB(e.target.value)} rows={5} aria-label={kind === "thread" ? "Question details" : "Reply"} className="w-full border border-line p-2 text-[14px]" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={save} className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-semibold text-surface disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setEditing(false); setT(title ?? ""); setB(body); }} className="text-[13px] font-semibold text-ink-2">Cancel</button>
          {err && <span className="text-[12.5px] font-semibold text-magenta-dark">{err}</span>}
        </div>
      </div>
    );
  return (
    <>
      {/* Author-written prose: newlines kept, rendered as text — never as markup. */}
      <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed">{body}</p>
      {(editedLabel || canEdit) && (
        <p className="mt-1 flex items-center gap-3 text-[12px] text-ink-3">
          {editedLabel && <span data-edited>edited {editedLabel}</span>}
          {canEdit && <button type="button" data-edit onClick={() => setEditing(true)} className="font-semibold text-ink-2 underline underline-offset-2 hover:text-ink">Edit</button>}
        </p>
      )}
    </>
  );
}
