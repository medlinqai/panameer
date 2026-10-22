"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN } from "@/components/hire/HireUI";

// CA-E006: I Want This Job on a Find Jobs / Best Matches card — the rate-card rate and the job's dates, one click.
export function WantThisJob({ jobId, rateCents, per }: { jobId: string; rateCents: number | null; per: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const want = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/work-requests/${jobId}/propose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverNote: null, rate: { unitPriceCents: rateCents, basis: per ? "RATE" : "AMOUNT" } }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setMsg(j.error ?? "That didn't work."); return; }
    router.refresh();
  };
  const rate = rateCents != null ? `$${(rateCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}${per}` : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5" data-want-this-job-card>
      {rate ? <button type="button" disabled={busy} onClick={want} className={BTN} data-want-this-job>I Want This Job</button> : <Link href={`/find-work/${jobId}`} className={BTN}>I Want This Job</Link>}
      <span className="text-[12.5px] text-ink-2">{rate ? `At ${rate} (your rate card)` : "Set your rate for this job"}</span>
      {rate && <Link href={`/find-work/${jobId}`} className="text-[12.5px] font-semibold text-ink-2 underline underline-offset-4" data-change-my-rate>Change My Rate for This Job</Link>}
      {msg && <span role="alert" className="w-full text-[12.5px] font-semibold text-state-declined">{msg}</span>}
    </div>
  );
}
