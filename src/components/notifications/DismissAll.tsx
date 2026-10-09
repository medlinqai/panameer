"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// M-E014: bulk Dismiss All lives on the Worklist (moved from Notifications); asks once.
export function DismissAll() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, start] = useTransition();
  const run = async () => {
    await fetch("/api/notifications/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss_all" }) });
    setConfirming(false);
    start(() => router.refresh());
  };
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="pm-triage-btn pm-triage-btn-s">Dismiss All</button>;
  return (
    <span role="alertdialog" aria-label="Dismiss all" className="flex flex-wrap items-center gap-2 text-[13px]">
      Hide every notification from your lists? Nothing is deleted.
      <button type="button" disabled={busy} onClick={run} className="pm-triage-btn pm-triage-btn-p">Dismiss All</button>
      <button type="button" onClick={() => setConfirming(false)} className="pm-triage-btn pm-triage-btn-s">Cancel</button>
    </span>
  );
}
