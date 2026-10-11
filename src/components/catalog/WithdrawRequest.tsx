"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// EST-E003: the buyer withdraws an open request from the list.
export function WithdrawRequest({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} data-withdraw onClick={async () => { setBusy(true); await fetch(`/api/estimate-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) }); setBusy(false); router.refresh(); }} className="shrink-0 text-[12.5px] font-semibold text-ink-2 underline underline-offset-4 disabled:opacity-40">
      Withdraw
    </button>
  );
}
