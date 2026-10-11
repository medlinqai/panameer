"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BTN, BTN_K } from "@/components/catalog/WizardParts";

// EST-E002/E003: provider Build Estimate / Decline (reason required); buyer Withdraw.
export function RequestActions({ id, party, status, hasDraft }: { id: string; party: "PROVIDER" | "BUYER"; status: string; hasDraft: boolean }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (status !== "OPEN") return null;
  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/estimate-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work.");
    router.refresh();
  };
  return (
    <div className="mt-6 border-t border-line pt-4" data-request-actions>
      {party === "PROVIDER" ? (
        declining ? (
          <div className="grid gap-2">
            <label className="text-[12.5px] font-bold">Why are you declining?<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full border border-line px-3 py-2 text-[14px] font-normal" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => post({ action: "decline", reason })} className={BTN_K}>Decline Request</button>
              <button type="button" onClick={() => setDeclining(false)} className="text-[14px] font-semibold underline">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link href={`/catalog/estimates/new?request=${id}`} data-build-estimate className={BTN_K}>{hasDraft ? "Continue the Estimate" : "Build Estimate"}</Link>
            <button type="button" onClick={() => setDeclining(true)} className={BTN}>Decline</button>
          </div>
        )
      ) : (
        <button type="button" disabled={busy} onClick={() => post({ action: "withdraw" })} data-withdraw className={BTN}>Withdraw Request</button>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
