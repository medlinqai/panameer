"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestValidationAction({ status }: { status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAsk = status === "NOT_REQUESTED" || status === "REJECTED";

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/request-validation", { method: "POST" });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not send that request.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not send that request.");
    } finally {
      setBusy(false);
    }
  };

  if (!canAsk) return null;

  return (
    <span className="mt-1.5 block">
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="text-[13.5px] font-bold text-magenta hover:underline disabled:opacity-60"
      >
        {}
        {busy ? "Sending your request…" : "Request Validation"}
      </button>
      {error && (
        <span className="mt-1 block text-[12.5px] text-red-600">{error}</span>
      )}
    </span>
  );
}
