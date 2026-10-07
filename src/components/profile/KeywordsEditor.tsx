"use client";

import { useEffect, useState } from "react";

// Keywords: terms the catalog doesn't know, kept exactly as typed; each add or remove saves.
export function KeywordsEditor() {
  const [list, setList] = useState<string[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/profile/keywords")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => live && setList(b?.keywords ?? []))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, []);
  const save = async (next: string[]) => {
    setErr(null);
    const r = await fetch("/api/profile/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keywords: next }) }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { keywords?: string[]; error?: string } | null;
    if (!r?.ok) return setErr(b?.error ?? "That didn't save.");
    setList(b?.keywords ?? next);
  };
  if (!list) return <p className="text-[14px] text-ink-2">Loading…</p>;
  const add = () => {
    const words = text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!words.length) return;
    setText("");
    void save([...list, ...words]);
  };
  return (
    <div data-keywords-editor>
      <p className="text-[13.5px] text-ink-2">Terms buyers might search for that aren&apos;t in the Panameer catalog yet. They show on your profile and in search exactly as you type them.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {list.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 border border-line bg-white px-2 py-1 text-[13px]">
            {k}
            <button type="button" aria-label={`Remove ${k}`} onClick={() => save(list.filter((x) => x !== k))} className="text-ink-3 hover:text-magenta">✕</button>
          </span>
        ))}
        {list.length === 0 && <span className="text-[13px] text-ink-3">No keywords yet.</span>}
      </div>
      <div className="mt-3 flex max-w-md gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add keywords, separated by commas" aria-label="Add keywords" className="h-[38px] min-w-0 flex-1 border border-line px-2 text-[13.5px]" />
        <button type="button" onClick={add} className="border border-ink px-3 text-[13px] font-bold">Add</button>
      </div>
      {err && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{err}</p>}
    </div>
  );
}
