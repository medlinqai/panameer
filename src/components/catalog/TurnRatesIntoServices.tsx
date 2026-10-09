"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// CAT-E001: creates Onsite / Offsite Consulting services from the profile's rates — only when the provider clicks.
export function TurnRatesIntoServices() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/provider/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fromRates" }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work.");
    router.refresh();
  };
  return (
    <div className="mt-3">
      <button type="button" disabled={busy} onClick={run} data-turn-rates className="inline-flex min-h-10 w-full items-center justify-center border border-ink px-3 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40">{busy ? "Creating…" : "Turn My Rates Into Services"}</button>
      {error && <p role="alert" className="mt-1 text-[12.5px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
