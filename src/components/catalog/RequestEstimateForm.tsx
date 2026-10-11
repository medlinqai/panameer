"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AREA, BTN_K, INPUT, LABEL } from "@/components/catalog/WizardParts";

// EST-E001: what you need (required), preferred start, budget range, up to 3 files.
export function RequestEstimateForm({ providerPersonId, serviceId, serviceProductId, prefill }: { providerPersonId: string; serviceId: string | null; serviceProductId: string | null; prefill: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      data-request-estimate
      className="mt-6 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("providerPersonId", providerPersonId);
        if (serviceId) fd.set("serviceId", serviceId);
        if (serviceProductId) fd.set("serviceProductId", serviceProductId);
        const r = await fetch("/api/estimate-requests", { method: "POST", body: fd });
        const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
        setBusy(false);
        if (!r.ok || !j.id) return setError(j.error ?? "That didn't work.");
        router.push(`/estimates/requests/${j.id}`);
      }}
    >
      <label className={LABEL}>What you need<textarea name="description" required minLength={5} rows={6} defaultValue={prefill} placeholder="Scope, systems, timing, anything the provider should know." className={AREA} /></label>
      <label className={LABEL}>Preferred start (optional)<input type="date" name="startBy" className={INPUT} /></label>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className={LABEL}>Budget range (optional)</legend>
        <label className="text-[12px] text-ink-2">From ($)<input name="budgetMin" inputMode="decimal" className={INPUT} /></label>
        <label className="text-[12px] text-ink-2">To ($)<input name="budgetMax" inputMode="decimal" className={INPUT} /></label>
      </fieldset>
      <label className={LABEL}>Attach files (optional, up to 3, 10 MB each)<input type="file" name="files" multiple className="mt-1 block text-[13.5px] font-normal" /></label>
      {error && <p role="alert" className="text-[13px] font-semibold text-magenta-dark">{error}</p>}
      <div><button type="submit" disabled={busy} className={BTN_K}>{busy ? "Sending…" : "Request an Estimate"}</button></div>
    </form>
  );
}
