"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

/** Scott 10-23: "Open in Hire" did nothing useful — Post Job makes the job visible so any matching provider can say I Want This Job. */
export function PostJobButton({ jobId, label = "Publish Job", outline = false }: { jobId: string; label?: string; outline?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const post = async () => {
    setBusy(true); setError(null);
    const r = await fetch(`/api/work-requests/${jobId}/post`, { method: "POST" }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't publish the job — try again."); return; }
    start(() => router.refresh());
  };
  return (
    <span className="flex flex-col items-start gap-1">
      <button type="button" onClick={post} disabled={busy || refreshing} className={outline ? BTN_OUT : BTN} data-post-job>{busy || refreshing ? "Publishing…" : label}</button>
      {error && <span role="alert" className="max-w-[360px] text-[12.5px] font-semibold text-state-declined">{error}</span>}
    </span>
  );
}
