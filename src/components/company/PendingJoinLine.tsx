"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Overview: a request to join another company stays visible until an admin there answers.
export function PendingJoinLine({ companyId, name }: { companyId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    setBusy(true);
    await fetch(`/api/company/join?companyId=${companyId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  return (
    <p data-pending-join className="mt-8 border-l-2 border-ink py-2 pl-3.5 text-[14px]">
      <b>Request pending · {name}</b> <span className="text-ink-2">— an admin there will review it.</span>{" "}
      <button type="button" disabled={busy} onClick={cancel} className="font-semibold text-magenta-dark underline">
        {busy ? "Cancelling…" : "Cancel Request"}
      </button>
    </p>
  );
}
