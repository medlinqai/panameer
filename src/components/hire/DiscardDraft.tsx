"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN_OUT } from "@/components/hire/HireUI";

// HB-E004: Discard a draft (it closes; nothing is deleted).
export function DiscardDraft({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={`${BTN_OUT} flex-1 disabled:opacity-50 sm:flex-none`} onClick={async () => {
      if (!window.confirm("Discard this draft?")) return;
      setBusy(true);
      await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discard", jobId }) }).catch(() => null);
      setBusy(false);
      router.refresh();
    }}>Discard</button>
  );
}
