"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BTN, BTN_K } from "@/components/catalog/WizardParts";

// CAT-E006: the customer's Accept · Ask for Changes · Decline; the provider's Send / Revise.
export function EstimateActions({ id, party, status, sent, workOrderId }: { id: string; party: "PROVIDER" | "CUSTOMER"; status: string; sent: boolean; workOrderId: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"CHANGES" | "DECLINE" | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; orderId?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work.");
    setMode(null);
    if (j.orderId) router.push(`/orders/${j.orderId}`);
    else router.refresh();
  };
  return (
    <div className="mt-5 border-t border-line pt-4" data-estimate-actions>
      {workOrderId && <Link href={`/orders/${workOrderId}`} className={BTN_K}>Open the Work Order</Link>}
      {party === "CUSTOMER" && status === "SENT" && !mode && (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => post({ action: "decide", id, decision: "ACCEPT" })} data-accept className={BTN_K}>Accept</button>
          <button type="button" onClick={() => setMode("CHANGES")} className={BTN}>Ask for Changes</button>
          <button type="button" onClick={() => setMode("DECLINE")} className={BTN}>Decline</button>
        </div>
      )}
      {party === "CUSTOMER" && mode && (
        <div className="grid gap-2">
          <label className="text-[12.5px] font-bold">{mode === "CHANGES" ? "What would you like changed?" : "Reason (optional)"}<textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="mt-1 w-full border border-line px-3 py-2 text-[14px] font-normal" /></label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy || (mode === "CHANGES" && comment.trim().length < 3)} onClick={() => post({ action: "decide", id, decision: mode, comment })} className={BTN_K}>{mode === "CHANGES" ? "Send Request" : "Decline Estimate"}</button>
            <button type="button" onClick={() => setMode(null)} className="text-[14px] font-semibold underline">Cancel</button>
          </div>
        </div>
      )}
      {party === "CUSTOMER" && status === "SENT" && <p className="mt-2 text-[12.5px] text-ink-2">Accept turns this into a work order; the provider then accepts its terms.</p>}
      {party === "PROVIDER" && (status === "DRAFT" || status === "CHANGES_REQUESTED") && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/catalog/estimates/new?id=${id}`} className={BTN}>{status === "CHANGES_REQUESTED" ? "Revise" : "Edit"}</Link>
          {status === "DRAFT" && !sent && <button type="button" disabled={busy} onClick={() => post({ action: "send", id })} className={BTN_K}>Send Estimate</button>}
        </div>
      )}
      {party === "PROVIDER" && status === "SENT" && <p className="text-[13px] text-ink-2">Waiting on the customer.</p>}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
