"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";

// JS-E003 / JR-E001: the Actions menu fits the job's status; Close and Hold ask for a reason, Resume/Reopen/Extend run in place.
export type JobMenuItem = { label: string; href?: string; act?: "hold" | "resume" | "reopen" | "duplicate" | "discard" | "close" | "extend"; confirm?: string };
const REASONS = { close: ["No Longer Needed", "Filled Elsewhere", "Budget", "Other"], hold: ["Budget Review", "Waiting on Approval", "Priorities Changed", "Other"] };

export function JobActionsMenu({ jobId, items }: { jobId: string; items: JobMenuItem[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"close" | "hold" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async (body: object, url = "/api/job-actions") => {
    setBusy(true); setError(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, ...body }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; jobId?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return null; }
    return j;
  };
  const run = async (i: JobMenuItem) => {
    if (i.confirm && !window.confirm(i.confirm)) return;
    if (i.act === "close" || i.act === "hold") { setMode(i.act); setReason(REASONS[i.act][0]); setNote(""); return; }
    if (i.act === "extend") { const h = Number(window.prompt("Extend the answer deadline by how many hours?", "24")); if (!(h >= 1)) return; if (await post({ action: "extend", hours: h })) router.refresh(); return; }
    if (i.act === "discard") { if (await post({ action: "discard", jobId }, "/api/hire")) router.push("/hire/overview?tab=jobs"); return; }
    const j = await post({ action: i.act });
    if (!j) return;
    if (i.act === "duplicate" && j.jobId) router.push(`/hire?job=${j.jobId}&step=0`); else router.refresh();
  };
  // NC-E002: the Worklist's Extend / Close buttons land here with ?act= — open that action at once.
  const sp = useSearchParams();
  const asked = sp?.get("act");
  useEffect(() => {
    const it = items.find((i) => i.act === asked);
    if (it) void run(it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);
  if (!items.length) return null;
  return (
    <>
      <details className="relative [&_summary::-webkit-details-marker]:hidden" data-actions-menu>
        <summary className="inline-flex min-h-10 cursor-pointer list-none items-center bg-ink px-4 text-[14px] font-semibold text-surface hover:bg-ink-hover">Actions ▾</summary>
        <ul className="absolute left-0 z-30 mt-1 w-56 max-w-[calc(100vw-32px)] rounded-[10px] border border-line bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:left-auto sm:right-0">
          {items.map((i) => (
            <li key={i.label}>
              {i.href ? <Link href={i.href} className="block px-3.5 py-2 text-[13.5px] hover:bg-bg-soft">{i.label}</Link>
                : <button type="button" disabled={busy} onClick={() => void run(i)} className={`block w-full px-3.5 py-2 text-left text-[13.5px] hover:bg-bg-soft ${i.act === "close" || i.act === "discard" ? "text-state-declined" : ""}`} data-job-action={i.act}>{i.label}</button>}
            </li>
          ))}
        </ul>
      </details>
      {error && <p role="alert" className="text-[13px] font-semibold text-state-declined">{error}</p>}
      {mode && (
        <div role="dialog" aria-label={mode === "close" ? "Close Job" : "Put On Hold"} className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4" onClick={() => setMode(null)}>
          <div className="mt-24 w-full max-w-md rounded-[12px] bg-white p-5" onClick={(e) => e.stopPropagation()} data-close-dialog={mode}>
            <h2 className="text-[18px] font-extrabold">{mode === "close" ? "Close Job" : "Put On Hold"}</h2>
            <p className="mt-1 text-[13px] text-state-inactive">{mode === "close" ? "Ends the answer round, cancels open interviews and expires open questions. Everyone asked is told now." : "The answer deadline pauses and everyone asked is told."}</p>
            <p className={`${LABEL} mt-4`}>Reason</p>
            <div className="mt-1.5 flex flex-col gap-1.5">{REASONS[mode].map((r) => <label key={r} className="flex items-center gap-2 text-[14px]"><input type="radio" name="job-reason" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder={reason === "Other" ? "Tell us why" : "Note (optional)"} className="mt-3 block w-full rounded-[8px] border border-state-border px-3 py-2 text-[14px]" />
            {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMode(null)} className={BTN_OUT}>Cancel</button>
              <button type="button" disabled={busy || (reason === "Other" && !note.trim())} onClick={async () => { if (await post({ action: mode, reason, note })) { setMode(null); router.refresh(); } }} className={`${BTN} disabled:opacity-40`} data-confirm-close>{mode === "close" ? "Close Job" : "Put On Hold"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
