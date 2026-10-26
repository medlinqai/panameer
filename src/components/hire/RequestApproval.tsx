"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

// JR-E004: a Request waiting on the ERP's PO — Day n of 60, Still Waiting (once) · It Was Declined (with a reason).
export function RequestApproval({ id, day, canReset, focus }: { id: string; day: number | null; canReset: boolean; focus?: string }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(focus === "declined");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async (body: object) => {
    setBusy(true); setError(null);
    const r = await fetch(`/api/requests/${id}/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    router.refresh();
  };
  return (
    <div className="mt-3" data-request-approval>
      {day != null && <p className="text-[13px] text-state-pending">Day {day} of 60 — no PO yet</p>}
      {declining ? (
        <div className="mt-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Why was it declined?" className="block w-full rounded-[8px] border border-state-border px-3 py-2 text-[14px]" />
          <div className="mt-2 flex gap-2">
            <button type="button" className={BTN_OUT} onClick={() => setDeclining(false)}>Cancel</button>
            <button type="button" disabled={busy || !reason.trim()} className={`${BTN} disabled:opacity-40`} onClick={() => post({ action: "decline", reason })} data-confirm-declined>Mark Declined</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {canReset && <button type="button" disabled={busy} className={BTN_OUT} onClick={() => post({ action: "still-waiting" })} data-still-waiting>Still Waiting</button>}
          <button type="button" disabled={busy} className={BTN_OUT} onClick={() => setDeclining(true)} data-it-was-declined>It Was Declined</button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </div>
  );
}
