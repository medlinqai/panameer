"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

// XA-E002: Apply on Panameer — the same three answers as an availability request: start date, rate ($/hr), a note.
export function ApplyExternal({ id, applied, start, rateCents, note: initial, stage, canWithdraw }: { id: string; applied: boolean; start: string | null; rateCents: number | null; note: string | null; stage: string | null; canWithdraw: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!applied);
  const [date, setDate] = useState(start ?? "");
  const [rate, setRate] = useState(rateCents ? String(rateCents / 100) : "");
  const [note, setNote] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setError(null);
    const r = await fetch("/api/external-jobs/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, start: date, rateCents: Math.round(Number(rate.replace(/[^0-9.]/g, "")) * 100), note }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't send that — try again."); return; }
    setOpen(false); router.refresh();
  };
  const withdraw = async () => {
    setBusy(true);
    await fetch(`/api/external-jobs/apply?id=${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false); router.refresh();
  };
  if (!open) {
    return (
      <div className="rounded-[12px] border border-line bg-surface p-4" data-external-applied>
        <p className="text-[14.5px] font-bold">You Applied{stage ? ` · ${stage}` : ""}</p>
        <p className="mt-1 text-[13.5px] text-ink-2">{[start ? `Start ${new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : "Start date not given", rateCents ? `$${(rateCents / 100).toLocaleString("en-US")}/hr` : "Add your rate"].join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={BTN_OUT} onClick={() => setOpen(true)}>{rateCents ? "Edit My Application" : "Add My Rate"}</button>
          {canWithdraw && <button type="button" className={BTN_OUT} disabled={busy} onClick={withdraw}>Withdraw</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4" data-apply-external>
      <h2 className="text-[16px] font-extrabold">Apply on Panameer</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-semibold">Available From<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full border border-state-border bg-surface px-2.5 py-2 text-[14px] font-normal" /></label>
        <label className="block text-[13px] font-semibold">Your Rate ($/hr)<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 125" className="mt-1 block w-full border border-state-border bg-surface px-2.5 py-2 text-[14px] font-normal" /></label>
      </div>
      <label className="mt-3 block text-[13px] font-semibold">Note <span className="font-normal text-ink-2">(optional)</span><textarea value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full border border-state-border bg-surface p-2.5 text-[14px] font-normal" /></label>
      <p className="text-right text-[12px] text-ink-2">{note.length} / 500</p>
      <div className="mt-2 flex gap-2">
        <button type="button" className={BTN} disabled={busy || !date || !rate} onClick={send}>{applied ? "Save" : "Apply on Panameer"}</button>
        {applied && <button type="button" className={BTN_OUT} onClick={() => setOpen(false)}>Cancel</button>}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </div>
  );
}
