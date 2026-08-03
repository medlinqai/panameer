"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Accept (or re-accept) the Company ToS — admins only (WS6).
 *
 * A separate control from the define step because acceptance recurs: the
 * version bumps, and the company is asked again. The server re-checks that the
 * caller is an admin of this company; this button is an affordance, not a gate.
 */
export function AcceptCompanyTos({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/company/tos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Could not record that.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Recording…" : "Accept on behalf of the company"}
      </button>
      <p className="mt-2 text-xs text-black/55 dark:text-white/55">
        We record your name, the date and the version.
      </p>
    </div>
  );
}
