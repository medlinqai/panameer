"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/display";

// BT-E003: Suggested from your résumé — drafts only; Keep adds a draft to the catalog, nothing is published.
type Sug = { id: string; kind: "SERVICE" | "SERVICE_PRODUCT"; typeName: string; why: string; rateCents: number | null; unit: string | null; title: string | null };

export function ResumeSuggestions({ items, pending }: { items: Sug[]; pending: boolean }) {
  const router = useRouter();
  const [reading, setReading] = useState(pending);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const post = async (body: object) => {
    const r = await fetch("/api/catalog/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "Could not save that");
    return r.ok;
  };
  useEffect(() => {
    if (!pending) return;
    post({ action: "refresh" }).finally(() => { setReading(false); router.refresh(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);
  const act = async (id: string, action: "keep" | "remove") => {
    setBusy(id);
    setMsg(null);
    if (await post({ action, id })) router.refresh();
    setBusy(null);
  };
  if (!reading && !items.length) return null;
  return (
    <section data-resume-suggestions className="mt-6 border border-line p-4">
      <p className="text-[11px] font-extrabold tracking-[0.12em] text-magenta">SUGGESTED FROM YOUR RÉSUMÉ</p>
      {reading ? (
        <p className="mt-1 text-[13.5px] text-ink-2">Reading your résumé…</p>
      ) : (
        <>
          <p className="mt-1 text-[13.5px] text-ink-2">Drafts based on your résumé. Keep the ones that fit — nothing goes live until you publish.</p>
          <ul className="mt-2">
            {items.map((s) => (
              <li key={s.id} data-suggestion={s.typeName} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-2.5">
                <span className="min-w-0">
                  <b className="text-[14px]">{s.title && s.kind === "SERVICE_PRODUCT" ? `${s.typeName} · ${s.title}` : s.typeName}</b>
                  <span className="ml-2 text-[11px] font-bold tracking-[0.06em] text-ink-3">{s.kind === "SERVICE" ? "SERVICE" : "SERVICE PRODUCT"}</span>
                  {s.rateCents != null && s.unit && <span className="ml-2 text-[13px]">{`${formatCents(s.rateCents)}/${s.unit.toLowerCase()}`}</span>}
                  <span className="block text-[12.5px] text-ink-2">{`Why: ${s.why}`}</span>
                </span>
                <span className="flex gap-2">
                  <button type="button" disabled={!!busy} onClick={() => act(s.id, "keep")} data-keep className="min-h-9 bg-ink px-3 text-[13px] font-semibold text-surface disabled:opacity-40">Keep</button>
                  <button type="button" disabled={!!busy} onClick={() => act(s.id, "remove")} data-remove className="min-h-9 border border-ink px-3 text-[13px] font-semibold disabled:opacity-40">Remove</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && <p role="status" className="mt-2 text-[13px] font-semibold">{msg}</p>}
    </section>
  );
}
