"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NeutralAvatar } from "@/components/Avatar";

// ES-E002: Request an Estimate — what you need, Category / Product Type, quantity / size, needed by, budget, files;
// then up to 5 providers and a deadline in hours → the Estimate Event (ES-…).
type Cand = { personId: string; label: string; sells: string | null };
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const LABEL = "mt-3 block text-[13px] font-bold";

export function RequestEstimateEvent({ categories, types, initial }: { categories: string[]; types: Record<string, { id: string; name: string }[]>; initial: { category: string; type: string; product: string; provider: string; title: string; candidates: Cand[] } }) {
  const router = useRouter();
  const [cat, setCat] = useState(initial.category);
  const [type, setType] = useState(initial.type);
  const [cands, setCands] = useState<Cand[]>(initial.candidates);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial.provider ? [initial.provider] : initial.candidates.slice(0, 1).map((c) => c.personId)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!type || type === initial.type) return;
    let live = true;
    fetch(`/api/estimate-events?type=${encodeURIComponent(type)}${initial.provider ? `&provider=${initial.provider}` : ""}`).then((r) => r.json()).then((j: { candidates?: Cand[] }) => { if (live) setCands(j.candidates ?? []); }).catch(() => {});
    return () => { live = false; };
  }, [type, initial.type, initial.provider]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < 5) n.add(id); return n; });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    for (const id of picked) fd.append("provider", id);
    const r = await fetch("/api/estimate-events", { method: "POST", body: fd }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { eventId?: string; error?: string };
    setBusy(false);
    if (!r?.ok || !j.eventId) { setError(j.error ?? "That didn't work."); return; }
    router.push(`/estimate/${j.eventId}`);
  };
  const opts = cat ? types[cat] ?? [] : [];
  return (
    <form onSubmit={submit} className="mt-4 rounded-[12px] border border-line bg-white p-4 sm:p-5" data-request-estimate>
      <input type="hidden" name="product" value={initial.product} />
      <label className={LABEL}>What you need<input name="title" required minLength={3} maxLength={140} defaultValue={initial.title} placeholder="10×20 trade-show backdrop" className={FIELD} /></label>
      <label className={LABEL}>Description<textarea name="description" rows={4} maxLength={3000} className={FIELD} placeholder="Material, finish, where it's going, anything the provider should know" /></label>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <label className={LABEL}>Category<select name="category" value={cat} onChange={(e) => { setCat(e.target.value); setType(""); }} className={FIELD}><option value="">Pick one</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className={LABEL}>Product Type<select name="type" value={type} onChange={(e) => setType(e.target.value)} disabled={!opts.length} className={FIELD}><option value="">{opts.length ? "Pick one" : "—"}</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      </div>
      <label className={LABEL}>Quantity / size notes<input name="notes" maxLength={300} placeholder="1 backdrop, 10 ft × 20 ft" className={FIELD} /></label>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className={LABEL}>Needed by<input type="date" name="neededBy" className={FIELD} /></label>
        <label className={LABEL}>Budget from ($) <span className="font-normal text-ink-3">optional</span><input name="budgetMin" inputMode="decimal" className={FIELD} /></label>
        <label className={LABEL}>to ($)<input name="budgetMax" inputMode="decimal" className={FIELD} /></label>
      </div>
      <label className={LABEL}>Attachments <span className="font-normal text-ink-3">up to 3, 10 MB each</span><input type="file" name="files" multiple className="mt-1 block text-[13.5px]" /></label>

      <p className="mt-5 text-[13px] font-bold">Ask up to 5 providers <span className="font-normal text-ink-3">({picked.size} picked)</span></p>
      {cands.length ? (
        <ul className="mt-1.5 divide-y divide-line border-y border-line">
          {cands.map((c) => (
            <li key={c.personId}><label className="flex cursor-pointer items-center gap-3 py-2.5 text-[14px]"><input type="checkbox" checked={picked.has(c.personId)} onChange={() => toggle(c.personId)} className="h-4 w-4" /><NeutralAvatar size={28} /><span className="min-w-0 flex-1"><b>{c.label}</b>{c.sells && <span className="block truncate text-[12.5px] text-ink-2">Sells {c.sells}</span>}</span></label></li>
          ))}
        </ul>
      ) : <p className="mt-1 text-[13.5px] text-ink-3">Pick a Product Type to see providers who sell it.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] font-semibold">Deadline<input name="hours" defaultValue="48" inputMode="numeric" className="w-16 rounded-[8px] border border-line px-2 py-1.5 text-right" /> hours</label>
        <button type="submit" disabled={busy || !picked.size} className="inline-flex min-h-10 items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50" data-send-estimate-requests>{busy ? "Sending…" : `Request Estimates from ${picked.size}`}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
    </form>
  );
}
