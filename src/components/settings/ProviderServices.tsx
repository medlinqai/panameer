"use client";

import { useState } from "react";
import type { ProviderServiceRow } from "@/lib/provider-services";
import { BILLING_CYCLE_LABEL, PAYMENT_TERMS_LABEL, PAYMENT_TRIGGER_LABEL, termsLine } from "@/lib/billing-terms";

const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";
const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
const INPUT = "mt-0.5 h-10 w-full border border-line bg-surface px-2.5 text-[14px] font-normal focus:border-ink focus:outline-none";
const UOMS = ["HOUR", "DAY", "WEEK", "MONTH"];

type Draft = { id: string | null; name: string; serviceType: "SERVICE_BY_QTY" | "SERVICE_BY_AMT"; uom: string; rate: string; billingCycle: string; paymentTerms: string; paymentTrigger: string };
const blank = (): Draft => ({ id: null, name: "", serviceType: "SERVICE_BY_QTY", uom: "HOUR", rate: "", billingCycle: "MONTHLY", paymentTerms: "NET30", paymentTrigger: "TIMESHEET" });

/** O-E004: each service a provider sells — type, unit, rate, billing cycle, payment terms, payment trigger. */
export function ProviderServices({ initial }: { initial: ProviderServiceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: unknown) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/provider/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; services?: ProviderServiceRow[] };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That didn't work."), false;
    setRows(j.services ?? rows);
    return true;
  };
  const save = async () => {
    if (!draft) return;
    const ok = await call({
      action: "save",
      id: draft.id,
      service: { name: draft.name, serviceType: draft.serviceType, uom: draft.serviceType === "SERVICE_BY_QTY" ? draft.uom : null, rateCents: draft.rate ? Math.round(Number(draft.rate) * 100) : null, billingCycle: draft.billingCycle, paymentTerms: draft.paymentTerms, paymentTrigger: draft.paymentTrigger },
    });
    if (ok) setDraft(null);
  };
  const active = rows.filter((r) => r.active);

  return (
    <section className="rounded-brand border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold">Services &amp; Billing Terms</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">Price = rate × quantity, and that is the not-to-exceed. At the end of each billing cycle you submit the trigger to the customer; payment terms start on submission.</p>
        </div>
        {!draft && <button type="button" onClick={() => setDraft(blank())} className={BTN}>Add a Service</button>}
      </div>

      {active.length === 0 && !draft && <p className="mt-4 text-[14px] text-ink-2">No services yet. Orders use Monthly · Net 30 · Timesheet until you add one.</p>}
      <ul className="mt-4 grid gap-2">
        {active.map((s) => (
          <li key={s.id} data-provider-service className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <div>
              <p className="text-[15px] font-bold">{s.name}</p>
              <p className="text-[13px] text-ink-2">
                {s.serviceType === "SERVICE_BY_QTY" ? `$${((s.rateCents ?? 0) / 100).toFixed(2)} / ${(s.uom ?? "HOUR").toLowerCase()}` : `Up to $${((s.rateCents ?? 0) / 100).toFixed(2)} · drawn down`} · {termsLine({ billing_cycle: s.billingCycle, payment_terms: s.paymentTerms, payment_trigger: s.paymentTrigger })}
              </p>
            </div>
            <span className="flex gap-3 text-[13px] font-semibold">
              <button type="button" onClick={() => setDraft({ id: s.id, name: s.name, serviceType: s.serviceType, uom: s.uom ?? "HOUR", rate: ((s.rateCents ?? 0) / 100).toFixed(2), billingCycle: s.billingCycle, paymentTerms: s.paymentTerms, paymentTrigger: s.paymentTrigger })} className="underline">Edit</button>
              <button type="button" disabled={busy} onClick={() => call({ action: "retire", id: s.id })} className="text-ink-2 underline">Remove</button>
            </span>
          </li>
        ))}
      </ul>

      {draft && (
        <div data-service-form className="mt-4 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2">
          <label className="text-[12.5px] font-bold sm:col-span-2">Service<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Oracle Procurement consulting" className={INPUT} /></label>
          <label className="text-[12.5px] font-bold">Type
            <select value={draft.serviceType} onChange={(e) => { const t = e.target.value as Draft["serviceType"]; setDraft({ ...draft, serviceType: t, paymentTrigger: t === "SERVICE_BY_QTY" ? "TIMESHEET" : "PAYMENT_REQUEST" }); }} className={INPUT}>
              <option value="SERVICE_BY_QTY">Rate × quantity</option>
              <option value="SERVICE_BY_AMT">Not-to-exceed amount (blanket)</option>
            </select>
          </label>
          {draft.serviceType === "SERVICE_BY_QTY" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12.5px] font-bold">Rate ($)<input inputMode="decimal" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} className={INPUT} /></label>
              <label className="text-[12.5px] font-bold">Per<select value={draft.uom} onChange={(e) => setDraft({ ...draft, uom: e.target.value })} className={INPUT}>{UOMS.map((u) => <option key={u} value={u}>{u.toLowerCase()}</option>)}</select></label>
            </div>
          ) : (
            <label className="text-[12.5px] font-bold">Not to exceed ($)<input inputMode="decimal" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} className={INPUT} /></label>
          )}
          <label className="text-[12.5px] font-bold">Billing cycle<select value={draft.billingCycle} onChange={(e) => setDraft({ ...draft, billingCycle: e.target.value })} className={INPUT}>{Object.entries(BILLING_CYCLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-[12.5px] font-bold">Payment terms<select value={draft.paymentTerms} onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })} className={INPUT}>{Object.entries(PAYMENT_TERMS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-[12.5px] font-bold">Payment trigger<select value={draft.paymentTrigger} onChange={(e) => setDraft({ ...draft, paymentTrigger: e.target.value })} className={INPUT}>{(["TIMESHEET", "PAYMENT_REQUEST", "INVOICE"] as const).map((k) => <option key={k} value={k}>{PAYMENT_TRIGGER_LABEL[k]}</option>)}</select></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="button" disabled={busy} onClick={save} className={BTN_K}>{busy ? "Saving…" : "Save Service"}</button>
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="text-[14px] font-semibold underline">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
