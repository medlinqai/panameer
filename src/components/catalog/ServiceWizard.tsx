"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BILLING_CYCLE_LABEL, PAYMENT_TERMS_LABEL, PAYMENT_TRIGGER_LABEL } from "@/lib/billing-terms";
import { CoverBand } from "@/components/casing/CoverBand";
import { AREA, BTN, BTN_K, INPUT, LABEL, PaidStrip, PublishBar, Steps, money } from "@/components/catalog/WizardParts";

type Type = { id: string; name: string; is_baseline: boolean };
export type ServiceDraft = {
  id: string | null;
  serviceTypeId: string | null;
  name: string;
  description: string;
  rate: string;
  uom: string;
  minimum: string;
  expenses: "AT_COST" | "INCLUDED" | "NOT_APPLICABLE";
  billingCycle: string;
  paymentTerms: string;
  paymentTrigger: string;
};

const UOMS = ["HOUR", "DAY", "WEEK", "MONTH"];
const EXAMPLE_QTY: Record<string, number> = { HOUR: 40, DAY: 5, WEEK: 4, MONTH: 3 };
const EXPENSES = { AT_COST: "Billed separately, at cost, up to a cap set on the order", INCLUDED: "Included in the rate", NOT_APPLICABLE: "Not applicable (remote)" } as const;
const unit = (u: string, n = 1) => `${u.toLowerCase()}${n === 1 ? "" : "s"}`;
const code = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase() || "SVC";

// CAT-E002: Create a Service — What · Rate · Billing · Review, with the buyer's view beside it.
export function ServiceWizard({ initial, types: initialTypes, gate, providerName }: { initial: ServiceDraft; types: Type[]; gate: { ok: boolean; href: string; reason: string | null }; providerName: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [types, setTypes] = useState(initialTypes);
  const [step, setStep] = useState(0);
  const [newType, setNewType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ServiceDraft>(k: K, v: ServiceDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const typeName = types.find((t) => t.id === d.serviceTypeId)?.name ?? "Service";
  const rateCents = Math.round(Number(d.rate || 0) * 100);
  const q = EXAMPLE_QTY[d.uom] ?? 1;

  const addType = async () => {
    setError(null);
    const r = await fetch("/api/provider/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addType", name: newType }) });
    const j = (await r.json().catch(() => ({}))) as { type?: Type; error?: string };
    if (!r.ok || !j.type) return setError(j.error ?? "Could not add that type");
    setTypes((t) => (t.some((x) => x.id === j.type!.id) ? t : [...t, j.type!]));
    set("serviceTypeId", j.type.id);
    if (!d.name) set("name", j.type.name);
    setNewType("");
  };

  const save = async (publish: boolean) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/provider/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        id: d.id,
        publish,
        service: {
          name: d.name || typeName,
          serviceType: "SERVICE_BY_QTY",
          serviceTypeId: d.serviceTypeId,
          description: d.description || null,
          uom: d.uom,
          rateCents: rateCents || null,
          minimumQuantity: d.minimum ? Number(d.minimum) : null,
          expenses: d.expenses,
          billingCycle: d.billingCycle,
          paymentTerms: d.paymentTerms,
          paymentTrigger: d.paymentTrigger,
        },
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string; id?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not save the service");
    router.push("/profile#my-services");
    router.refresh();
  };

  const paid = [
    "Order accepted",
    `Submit a ${PAYMENT_TRIGGER_LABEL[d.paymentTrigger as keyof typeof PAYMENT_TRIGGER_LABEL].toLowerCase()} each ${BILLING_CYCLE_LABEL[d.billingCycle as keyof typeof BILLING_CYCLE_LABEL].toLowerCase().replace("every ", "")} cycle`,
    "Customer approves",
    `Paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`,
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" data-service-wizard>
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold">{d.id ? "Edit Service" : "Create a Service"}</h1>
        <p className="mt-1 text-[14px] text-ink-2">Work you sell by the hour, day or month — priced as rate × quantity.</p>
        <PaidStrip steps={paid} />
        <Steps labels={["What", "Rate", "Billing", "Review"]} at={step} onPick={setStep} />

        <div className="mt-5 grid gap-4">
          {step === 0 && (
            <>
              <div>
                <p className={LABEL}>Service type</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {types.map((t) => (
                    <button key={t.id} type="button" onClick={() => { set("serviceTypeId", t.id); if (!d.name) set("name", t.name); }} aria-pressed={d.serviceTypeId === t.id} className={"border px-3 py-1.5 text-[13px] font-semibold " + (d.serviceTypeId === t.id ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
                      {t.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Add your own type" aria-label="Add your own service type" className={INPUT + " mt-0"} />
                  <button type="button" disabled={newType.trim().length < 3} onClick={addType} className={BTN}>Add</button>
                </div>
                <p className="mt-1 text-[12px] text-ink-3">From the Business Type Taxonomy. Types you add are reviewed and may be merged with an existing one.</p>
              </div>
              <label className={LABEL}>Name<input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Oracle Cloud Procurement Consulting — Onsite" className={INPUT} /></label>
              <label className={LABEL}>Description<textarea value={d.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="What you do, for whom, and where." className={AREA} /></label>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={LABEL}>Rate ($)<input inputMode="decimal" value={d.rate} onChange={(e) => set("rate", e.target.value)} placeholder="125.00" className={INPUT} /></label>
                <label className={LABEL}>Per (unit of measure)
                  <select value={d.uom} onChange={(e) => set("uom", e.target.value)} className={INPUT}>{UOMS.map((u) => <option key={u} value={u}>{u[0] + u.slice(1).toLowerCase()}</option>)}</select>
                </label>
              </div>
              <label className={LABEL}>Minimum (optional)<input inputMode="decimal" value={d.minimum} onChange={(e) => set("minimum", e.target.value)} placeholder={`e.g. 8 ${unit(d.uom, 8)}`} className={INPUT} /><span className="mt-1 block text-[12px] font-normal text-ink-3">Smallest amount a buyer can order.</span></label>
              <fieldset>
                <legend className={LABEL}>Travel &amp; expenses</legend>
                {(Object.keys(EXPENSES) as (keyof typeof EXPENSES)[]).map((k) => (
                  <label key={k} className="mt-1.5 flex items-center gap-2 text-[14px]"><input type="radio" name="expenses" checked={d.expenses === k} onChange={() => set("expenses", k)} /> {EXPENSES[k]}</label>
                ))}
              </fieldset>
              {rateCents > 0 && <p data-example className="text-[13.5px] text-ink-2">Example: {q} {unit(d.uom, q)} × {money(rateCents)} = <b className="text-ink">{money(q * rateCents)}</b> — that&apos;s also the not-to-exceed on the order.</p>}
            </>
          )}
          {step === 2 && (
            <>
              <label className={LABEL}>Billing cycle<select value={d.billingCycle} onChange={(e) => set("billingCycle", e.target.value)} className={INPUT}>{Object.entries(BILLING_CYCLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className={LABEL}>Payment terms<select value={d.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} className={INPUT}>{Object.entries(PAYMENT_TERMS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className={LABEL}>Payment trigger<select value={d.paymentTrigger} onChange={(e) => set("paymentTrigger", e.target.value)} className={INPUT}>{(["TIMESHEET", "PAYMENT_REQUEST", "INVOICE"] as const).map((k) => <option key={k} value={k}>{PAYMENT_TRIGGER_LABEL[k]}</option>)}</select></label>
              <p className="text-[13.5px] text-ink-2">You submit a {PAYMENT_TRIGGER_LABEL[d.paymentTrigger as keyof typeof PAYMENT_TRIGGER_LABEL].toLowerCase()} at the end of each cycle. Terms start the day you submit, so a slow approval doesn&apos;t delay your pay. ERP buyers approve it in their own system.</p>
            </>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[14px]">
              <dt className="font-semibold text-ink-3">Type</dt><dd>{typeName}</dd>
              <dt className="font-semibold text-ink-3">Name</dt><dd>{d.name || typeName}</dd>
              <dt className="font-semibold text-ink-3">Rate</dt><dd>{money(rateCents)} / {unit(d.uom)}{d.minimum ? ` · min ${d.minimum} ${unit(d.uom, Number(d.minimum))}` : ""}</dd>
              <dt className="font-semibold text-ink-3">Billing</dt><dd>{BILLING_CYCLE_LABEL[d.billingCycle as keyof typeof BILLING_CYCLE_LABEL]} · {PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL]} · {PAYMENT_TRIGGER_LABEL[d.paymentTrigger as keyof typeof PAYMENT_TRIGGER_LABEL]}</dd>
              <dt className="font-semibold text-ink-3">Expenses</dt><dd>{EXPENSES[d.expenses]}</dd>
            </dl>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}
        {step < 3 ? (
          <div className="mt-5 flex gap-3 border-t border-line pt-4">
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={BTN}>‹ Back</button>}
            <button type="button" onClick={() => setStep(step + 1)} className={BTN_K}>Next ›</button>
          </div>
        ) : (
          <PublishBar canPublish={gate.ok && rateCents > 0} gateHref={gate.href} gateReason={gate.reason} busy={busy} onSave={save} />
        )}
      </div>

      <aside className="min-w-0" data-buyer-preview>
        <p className="text-[11px] font-bold tracking-[0.1em] text-ink-2">WHAT BUYERS SEE</p>
        <div className="mt-2 border border-line bg-white">
          <CoverBand code={code(typeName)} tone={["#272334", "#4b3e6e"]} className="h-[96px]">Service · {typeName}</CoverBand>
          <div className="p-4">
            <b className="block text-[16px] leading-snug">{d.name || typeName}</b>
            <span className="block text-[12.5px] text-ink-3">{providerName}</span>
            {d.description && <p className="mt-2 line-clamp-3 text-[13px] text-ink-2">{d.description}</p>}
            <p className="mt-3 text-[22px] font-bold">{rateCents ? money(rateCents).replace(/\.00$/, "") : "$—"} <span className="text-[13px] font-normal text-ink-2">/ {unit(d.uom)}</span></p>
            <p className="text-[12.5px] text-ink-2">Billed {BILLING_CYCLE_LABEL[d.billingCycle as keyof typeof BILLING_CYCLE_LABEL].toLowerCase()} · {PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL]} · {PAYMENT_TRIGGER_LABEL[d.paymentTrigger as keyof typeof PAYMENT_TRIGGER_LABEL]}</p>
            {d.expenses === "AT_COST" && <p className="text-[12.5px] text-ink-2">Expenses at cost, capped per order</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
