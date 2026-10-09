"use client";

import { useState } from "react";
import type { ProviderServiceRow } from "@/lib/provider-services";
import { termsLine } from "@/lib/billing-terms";

const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";

/** O-E004 list; creating and editing happen in My Catalog's Create a Service (CAT-E002). */
export function ProviderServices({ initial }: { initial: ProviderServiceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retire = async (id: string) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/provider/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retire", id }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; services?: ProviderServiceRow[] };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work.");
    setRows(j.services ?? rows);
  };
  const active = rows.filter((r) => r.active);

  return (
    <section className="rounded-brand border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">Services &amp; Billing Terms</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">Price = rate × quantity, and that is the not-to-exceed. At the end of each billing cycle you submit the trigger to the customer; payment terms start on submission.</p>
        </div>
        <a href="/catalog/services/new" className={BTN}>Create a Service</a>
      </div>

      {active.length === 0 && <p className="mt-4 text-[14px] text-ink-2">No services yet. Orders use Monthly · Net 30 · Timesheet until you add one.</p>}
      <ul className="mt-4 grid gap-2">
        {active.map((s) => (
          <li key={s.id} data-provider-service className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">{s.name} {!s.published && <span className="ml-1 border border-line px-1.5 text-[11px] font-semibold text-ink-3">Draft</span>}</p>
              <p className="text-[13px] text-ink-2">
                {s.serviceType === "SERVICE_BY_QTY" ? `$${((s.rateCents ?? 0) / 100).toFixed(2)} / ${(s.uom ?? "HOUR").toLowerCase()}` : `Up to $${((s.rateCents ?? 0) / 100).toFixed(2)} · drawn down`} · {termsLine({ billing_cycle: s.billingCycle, payment_terms: s.paymentTerms, payment_trigger: s.paymentTrigger })}
              </p>
            </div>
            <span className="flex gap-3 text-[13px] font-semibold">
              <a href={`/catalog/services/new?id=${s.id}`} className="underline">Edit</a>
              <button type="button" disabled={busy} onClick={() => retire(s.id)} className="text-ink-2 underline">Remove</button>
            </span>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
