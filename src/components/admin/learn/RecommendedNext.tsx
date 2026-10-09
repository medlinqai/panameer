"use client";

import { useEffect, useState } from "react";

// L-E046: edit a path's "Recommended next" list — shown to members after they finish this path.
export function RecommendedNext({ pathId }: { pathId: string }) {
  const [next, setNext] = useState<string[] | null>(null);
  const [paths, setPaths] = useState<{ id: string; title: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const url = `/api/admin/learn/paths/${pathId}/next`;
  useEffect(() => {
    fetch(url).then((r) => r.json()).then((j) => { setNext(j.next ?? []); setPaths(j.paths ?? []); }).catch(() => setMsg("Could not load."));
  }, [url]);
  const save = async (list: string[]) => {
    setNext(list);
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next: list }) });
    setMsg(r.ok ? "Saved." : "Could not save.");
  };
  if (!next) return null;
  const title = (id: string) => paths.find((p) => p.id === id)?.title ?? "—";
  const move = (i: number, d: number) => { const l = [...next]; [l[i], l[i + d]] = [l[i + d], l[i]]; void save(l); };
  return (
    <section data-recommended-next className="mt-6 border border-line p-4">
      <h2 className="text-[16px] font-bold">Recommended Next</h2>
      <p className="mt-0.5 text-[13px] text-ink-2">Suggested to members after they finish this path, in this order.</p>
      <ol className="mt-2 grid gap-1">
        {next.map((id, i) => (
          <li key={id} className="flex items-center justify-between gap-2 border-b border-line py-1.5 text-[14px]">
            <span className="min-w-0 truncate">{i + 1}. {title(id)}</span>
            <span className="flex shrink-0 gap-2 text-[12.5px] font-semibold">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="disabled:opacity-30">↑</button>
              <button type="button" disabled={i === next.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="disabled:opacity-30">↓</button>
              <button type="button" onClick={() => save(next.filter((x) => x !== id))} className="underline">Remove</button>
            </span>
          </li>
        ))}
        {next.length === 0 && <li className="text-[13px] text-ink-3">None yet — members get skill and area matches instead.</li>}
      </ol>
      <select value="" onChange={(e) => e.target.value && save([...next, e.target.value])} aria-label="Add a recommended path" className="mt-2 h-10 w-full border border-line px-2 text-[13.5px]">
        <option value="">+ Add a path…</option>
        {paths.filter((p) => !next.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      {msg && <p role="status" className="mt-1 text-[12.5px] text-ink-2">{msg}</p>}
    </section>
  );
}
