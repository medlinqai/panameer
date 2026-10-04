"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Take back a pending colleague request (R-E011). Asks once; no undo after. */
export function WithdrawRequest({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex min-h-11 items-center border border-ink bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-ink/5"
      >
        Withdraw
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-[12px] text-ink-2">Withdraw the request to {name}?</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/connections/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: id }),
          });
          setBusy(false);
          if (res.ok) router.refresh();
          else setAsking(false);
        }}
        className="inline-flex min-h-11 items-center bg-ink px-3 text-[12px] font-bold text-surface disabled:opacity-40"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="inline-flex min-h-11 items-center px-2 text-[12px] font-bold text-ink-2"
      >
        No
      </button>
    </span>
  );
}
